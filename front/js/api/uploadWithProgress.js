
export function uploadWithProgress({
    url,
    formData,
    token,
    onProgress = () => {},
    signal
}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", url, true);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        });

        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const res = JSON.parse(xhr.responseText);
                        resolve(res);
                    } catch (err) {
                        reject(new Error("Invalid server response"));
                    }
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            }
        };

        if (signal) {
            signal.addEventListener("abort", () => {
                xhr.abort();
                reject(new DOMException("Upload aborted", "AbortError"));
            });
        }

        xhr.send(formData);
    });
}
