/**
 * Upload with Progress Tracking
 * Features: validation, retries, timeout, error handling
 */

export function uploadWithProgress({
    url,
    formData,
    token,
    onProgress = () => {},
    signal,
    maxSize = 100 * 1024 * 1024, // 100MB default
    retryCount = 3,
    timeout = 30000
}) {
    // Validate file size before upload
    const validateFormData = (fd) => {
        for (const [_key, value] of fd.entries()) {
            if (value instanceof File) {
                if (value.size > maxSize) {
                    throw new Error(
                        `[VALIDATION] File "${value.name}" exceeds max size of ${(maxSize / 1024 / 1024).toFixed(0)}MB (actual: ${(value.size / 1024 / 1024).toFixed(2)}MB)`
                    );
                }
                if (value.size === 0) {
                    throw new Error(`[VALIDATION] File "${value.name}" is empty`);
                }
            }
        }
    };

    // Attempt upload with retry logic
    const attemptUpload = (retryAttempt = 0) => {
        return new Promise((resolve, reject) => {
            try {
                validateFormData(formData);
            } catch (validationError) {
                return reject(validationError);
            }

            const xhr = new XMLHttpRequest();
            let isAborted = false;

            xhr.open("POST", url, true);
            if (token) {
xhr.setRequestHeader("Authorization", `Bearer ${token}`);
}
            xhr.timeout = timeout;

            // Progress tracking
            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable && !isAborted) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            });

            // Error handling
            xhr.onerror = () => {
                isAborted = true;
                if (retryAttempt < retryCount) {
                    const delay = 1000 * Math.pow(2, retryAttempt); // Exponential backoff
                    console.warn(`[UPLOAD] Network error. Retrying in ${delay}ms... (attempt ${retryAttempt + 1}/${retryCount})`);
                    setTimeout(() => attemptUpload(retryAttempt + 1).then(resolve).catch(reject), delay);
                } else {
                    reject(new Error(`[NETWORK] Upload failed after ${retryCount} retries`));
                }
            };

            xhr.ontimeout = () => {
                isAborted = true;
                if (retryAttempt < retryCount) {
                    const delay = 1000 * Math.pow(2, retryAttempt);
                    console.warn(`[UPLOAD] Timeout. Retrying in ${delay}ms... (attempt ${retryAttempt + 1}/${retryCount})`);
                    setTimeout(() => attemptUpload(retryAttempt + 1).then(resolve).catch(reject), delay);
                } else {
                    reject(new Error(`[TIMEOUT] Upload timeout after ${retryCount} retries`));
                }
            };

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4 && !isAborted) {
                    const status = xhr.status;
                    
                    if (status >= 200 && status < 300) {
                        try {
                            const res = JSON.parse(xhr.responseText);
                            resolve(res);
                        } catch (_parseErr) {
                            reject(new Error(`[PARSE] Invalid server response: ${xhr.responseText.substring(0, 100)}`));
                        }
                    } else if (status === 0) {
                        reject(new Error("[CORS] CORS error or upload aborted"));
                    } else if (status === 413) {
                        reject(new Error("[SERVER] Payload too large - increase server limit"));
                    } else if (status === 429) {
                        // Rate limit - retry with backoff
                        if (retryAttempt < retryCount) {
                            const delay = 5000 * Math.pow(2, retryAttempt); // Longer backoff for rate limits
                            console.warn(`[UPLOAD] Rate limited. Retrying in ${delay}ms...`);
                            setTimeout(() => attemptUpload(retryAttempt + 1).then(resolve).catch(reject), delay);
                        } else {
                            reject(new Error("[RATE_LIMIT] Too many requests"));
                        }
                    } else if (status >= 500) {
                        // Server error - retry
                        if (retryAttempt < retryCount) {
                            const delay = 2000 * Math.pow(2, retryAttempt);
                            console.warn(`[UPLOAD] Server error (${status}). Retrying in ${delay}ms...`);
                            setTimeout(() => attemptUpload(retryAttempt + 1).then(resolve).catch(reject), delay);
                        } else {
                            reject(new Error(`[SERVER] Upload failed: ${status} ${xhr.statusText}`));
                        }
                    } else {
                        reject(new Error(`[HTTP] Upload failed: ${status} ${xhr.statusText} - ${xhr.responseText.substring(0, 100)}`));
                    }
                }
            };

            // Handle abort signal
            if (signal) {
                signal.addEventListener("abort", () => {
                    isAborted = true;
                    xhr.abort();
                    reject(new DOMException("Upload aborted by user", "AbortError"));
                });
            }

            // Send request
            try {
                xhr.send(formData);
            } catch (sendErr) {
                reject(new Error(`[SEND] Failed to send request: ${sendErr.message}`));
            }
        });
    };

    return attemptUpload();
}
