import { createElement } from "../components/createElement.js";

export function openCropperWithCropperJSBoundedFixedBox({ file, type = "avatar" }) {
  console.log(file, type);
  return new Promise((resolve) => {
    const CROP_PERF_VERSION = "1.5.13";
    const JS_SRC = `https://unpkg.com/cropperjs@${CROP_PERF_VERSION}/dist/cropper.min.js`;
    const CSS_HREF = `https://unpkg.com/cropperjs@${CROP_PERF_VERSION}/dist/cropper.min.css`;

    let addedScript = null;
    let addedLink = null;
    let createdCropper = null;
    let objectUrl = null;

    function loadScript(src) {
      return new Promise((res, rej) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          if (window.Cropper) return res(existing);
          existing.addEventListener("load", () => res(existing));
          existing.addEventListener("error", () => rej(new Error("Failed to load script")));
          return;
        }
        const s = createElement("script", { src });
        s.async = true;
        s.addEventListener("load", () => res(s));
        s.addEventListener("error", () => rej(new Error(`Failed to load script ${src}`)));
        addedScript = s;
        document.head.appendChild(s);
      });
    }

    function loadCss(href) {
      return new Promise((res, rej) => {
        const existing = document.querySelector(`link[href="${href}"]`);
        if (existing) return res(existing);
        const l = createElement("link", { rel: "stylesheet", href });
        l.dataset.cropperCss = "1";
        l.addEventListener("load", () => res(l));
        l.addEventListener("error", () => rej(new Error(`Failed to load css ${href}`)));
        addedLink = l;
        document.head.appendChild(l);
      });
    }

    async function ensureCropper() {
      if (!window.Cropper) {
        await Promise.all([loadCss(CSS_HREF), loadScript(JS_SRC)]);
      } else {
        await loadCss(CSS_HREF);
      }
    }

    // ---------- UI (bounded stage) ----------
    const overlay = createElement("div", {
      class: "crop-overlay",
      style: `position: fixed; inset: 0; display:flex; align-items:center; justify-content:center;
              background: rgba(0,0,0,0.55); z-index: 10000;`
    });

    // target crop in pixels
    const cropTargetW = type === "banner" ? 700 : 300;
    const cropTargetH = type === "banner" ? 300 : 300;
    const aspectRatio = cropTargetW / cropTargetH;

    // compute a bounded stage size (fits viewport but stays comfortable)
    const viewportW = Math.max(600, Math.min(window.innerWidth * 0.9, 1200));
    const viewportH = Math.max(400, Math.min(window.innerHeight * 0.8, 900));
    const stageW = Math.max(viewportW, cropTargetW * 1.15);
    const stageH = Math.max(viewportH, cropTargetH * 1.15);

    const stage = createElement("div", {
      class: "crop-stage",
      style: `width: ${stageW}px; height: ${stageH}px; max-width:95vw; max-height:90vh;
              background:#111; position:relative; overflow:hidden; display:flex;
              align-items:center; justify-content:center; border-radius:6px;`
    });

    const img = new Image();
    objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.alt = "Crop image";
    img.draggable = false;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.display = "block";
    img.style.userSelect = "none";

    stage.appendChild(img);

    // simple toolbar
    const toolbar = createElement("div", {
      class: "crop-toolbar",
      style: `display:flex; gap:8px; margin-top:12px; align-items:center; justify-content:center;`
    });

    const rotateLeft = createElement("button", { type: "button", class: "btn-rotate-left" }, ["⟲"]);
    const rotateRight = createElement("button", { type: "button", class: "btn-rotate-right" }, ["⟳"]);
    const zoomOut = createElement("button", { type: "button", class: "btn-zoom-out" }, ["－"]);
    const zoomIn = createElement("button", { type: "button", class: "btn-zoom-in" }, ["＋"]);
    const confirmBtn = createElement("button", { type: "button", class: "btn-confirm" }, ["Crop & Upload"]);
    const cancelBtn = createElement("button", { type: "button", class: "btn-cancel" }, ["Cancel"]);

    toolbar.appendChild(rotateLeft);
    toolbar.appendChild(rotateRight);
    toolbar.appendChild(zoomOut);
    toolbar.appendChild(zoomIn);
    toolbar.appendChild(confirmBtn);
    toolbar.appendChild(cancelBtn);

    const wrapper = createElement("div", {
      class: "crop-wrapper",
      style: `display:flex; flex-direction:column; gap:8px; align-items:center;`
    });

    wrapper.appendChild(stage);
    wrapper.appendChild(toolbar);
    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);

    // ---------- initialize Cropper inside bounded stage ----------
    ensureCropper().then(() => {
      try {
        // create cropper with fixed crop box (we will size & center it in ready)
        createdCropper = new window.Cropper(img, {
          viewMode: 1,
          dragMode: "move",           // dragging moves the image (not the crop box)
          autoCrop: true,
          autoCropArea: 1,
          responsive: true,
          restore: true,
          modal: true,
          guides: false,
          center: true,
          background: false,
          movable: true,              // image movable
          zoomable: true,
          rotatable: true,
          scalable: false,
          aspectRatio: aspectRatio,   // lock crop box to target ratio
          cropBoxResizable: false,    // fixed size crop box
          cropBoxMovable: false,      // fixed position of the crop box (we'll center it)
          ready() {
            // set a centered crop box sized to target (but scaled down if stage is smaller)
            try {
              const containerData = this.getContainerData(); // container width/height relative to image box
              // compute scale to fit desired crop box into container without overflow
              const fitScale = Math.min(1, containerData.width / cropTargetW, containerData.height / cropTargetH);
              const boxW = cropTargetW * fitScale;
              const boxH = cropTargetH * fitScale;

              // set crop box centered in container coordinates (left/top are relative to container)
              const left = (containerData.width - boxW) / 2;
              const top = (containerData.height - boxH) / 2;

              // apply crop box in container pixels
              this.setCropBoxData({ left, top, width: boxW, height: boxH });

              // ensure crop box applied and image centered nicely
              this.crop();
            } catch (err) {
              // if setCropBoxData fails (e.g. image smaller), fallback to default crop
              try { this.crop(); } catch (e) { /* ignore */ }
            }
          }
        });

        // control wiring
        rotateLeft.addEventListener("click", () => createdCropper.rotate(-90));
        rotateRight.addEventListener("click", () => createdCropper.rotate(90));
        zoomIn.addEventListener("click", () => createdCropper.zoom(0.1));
        zoomOut.addEventListener("click", () => createdCropper.zoom(-0.1));

        cancelBtn.addEventListener("click", () => {
          cleanup();
          resolve(null);
        });

        confirmBtn.addEventListener("click", () => {
          try {
            // compute final crop from cropper's data (cropBox mapped to image pixels)
            // setData ensures exact area then we export canvas at requested pixel size (accounting DPR)
            const imageData = createdCropper.getImageData();
            const cropBoxData = createdCropper.getCropBoxData(); // in container px
            // Convert cropBox container px -> image natural px
            const sx = (cropBoxData.left - imageData.left) / imageData.scaleX;
            const sy = (cropBoxData.top - imageData.top) / imageData.scaleY;
            const sW = cropBoxData.width / imageData.scaleX;
            const sH = cropBoxData.height / imageData.scaleY;

            // clamp just in case
            const sxClamped = Math.max(0, Math.min(imageData.naturalWidth - sW, sx));
            const syClamped = Math.max(0, Math.min(imageData.naturalHeight - sH, sy));

            // set data in natural px so export uses exact region
            createdCropper.setData({
              x: sxClamped,
              y: syClamped,
              width: sW,
              height: sH
            });

            const dpr = Math.max(1, window.devicePixelRatio || 1);
            const outW = Math.round(cropTargetW * dpr);
            const outH = Math.round(cropTargetH * dpr);

            const finalCanvas = createdCropper.getCroppedCanvas({
              width: outW,
              height: outH,
              imageSmoothingEnabled: true,
              imageSmoothingQuality: "high"
            });

            finalCanvas.toBlob((blob) => {
              cleanup();
              resolve(blob);
            }, "image/jpeg", 0.92);
          } catch (err) {
            console.error("Crop export failed:", err);
            cleanup();
            resolve(null);
          }
        });
      } catch (err) {
        console.error("Failed to init Cropper:", err);
        cleanup();
        resolve(null);
      }
    }).catch((err) => {
      console.error("Failed to load Cropper assets:", err);
      cleanup();
      resolve(null);
    });

    function cleanup() {
      try {
        if (createdCropper) {
          try { createdCropper.destroy(); } catch (e) { /* ignore */ }
          createdCropper = null;
        }
      } catch (e) { /* ignore */ }

      if (objectUrl) {
        try { URL.revokeObjectURL(objectUrl); } catch (e) { /* ignore */ }
        objectUrl = null;
      }

      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }

      try {
        if (addedScript && addedScript.parentNode) {
          addedScript.parentNode.removeChild(addedScript);
          addedScript = null;
        }
        if (addedLink && addedLink.parentNode) {
          addedLink.parentNode.removeChild(addedLink);
          addedLink = null;
        }
      } catch (e) { /* ignore */ }
    }

    // responsive stage: if viewport changes, resize stage and notify cropper
    function onWindowResize() {
      const newViewportW = Math.max(600, Math.min(window.innerWidth * 0.9, 1200));
      const newViewportH = Math.max(400, Math.min(window.innerHeight * 0.8, 900));
      const newStageW = Math.max(newViewportW, cropTargetW * 1.15);
      const newStageH = Math.max(newViewportH, cropTargetH * 1.15);
      stage.style.width = `${newStageW}px`;
      stage.style.height = `${newStageH}px`;
      if (createdCropper) createdCropper.resize();
    }
    window.addEventListener("resize", onWindowResize);

    // ensure resize listener removed at cleanup
    const origCleanup = cleanup;
    cleanup = function () {
      window.removeEventListener("resize", onWindowResize);
      origCleanup();
    };
  });
}

export {openCropperWithCropperJSBoundedFixedBox as openCropper};
