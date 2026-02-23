import { createElement } from "../components/createElement.js";

const CROP_SPECS = {
  avatar: { width: 300, height: 300 },
  banner: { width: 700, height: 300 },
  story: { width: 1080, height: 1920 },
  thumbnail: { width: 400, height: 225 },
  square: { width: 500, height: 500 }
};

let cropperAssetsLoaded = false;

function whenDOMReady() {
  return new Promise((resolve) => {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      resolve();
    } else {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    }
  });
}

async function loadCropperAssets() {
  const VERSION = "1.5.13";
  const JS_SRC = `https://unpkg.com/cropperjs@${VERSION}/dist/cropper.min.js`;
  const CSS_HREF = `https://unpkg.com/cropperjs@${VERSION}/dist/cropper.min.css`;

  await whenDOMReady();

  if (cropperAssetsLoaded && window.Cropper) return;

  const loadCSS = new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${CSS_HREF}"]`)) return resolve();
    const link = createElement("link", { rel: "stylesheet", href: CSS_HREF });
    link.addEventListener("load", resolve);
    link.addEventListener("error", () => reject(new Error("Failed to load cropper CSS")));
    document.head.appendChild(link);
  });

  const loadJS = new Promise((resolve, reject) => {
    if (window.Cropper) return resolve();
    const existing = document.querySelector(`script[src="${JS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", () => reject(new Error("Failed to load cropper JS")));
      return;
    }
    const script = createElement("script", { src: JS_SRC });
    script.async = true;
    script.addEventListener("load", resolve);
    script.addEventListener("error", () => reject(new Error("Failed to load cropper JS")));
    document.head.appendChild(script);
  });

  await Promise.all([loadCSS, loadJS]);
  cropperAssetsLoaded = true;
}

function computeStageSize(targetW, targetH) {
  const vw = Math.max(600, Math.min(window.innerWidth * 0.9, 1200));
  const vh = Math.max(400, Math.min(window.innerHeight * 0.8, 900));
  return {
    width: Math.max(vw, targetW * 1.15),
    height: Math.max(vh, targetH * 1.15)
  };
}

function createCropUI({ cropTargetW, cropTargetH, simple }) {
  const aspectRatio = cropTargetW / cropTargetH;
  const { width: stageW, height: stageH } = computeStageSize(cropTargetW, cropTargetH);

  const overlay = createElement("div", {
    style: `position:fixed; inset:0; background:rgba(0,0,0,0.55);
            display:flex; align-items:center; justify-content:center; z-index:10000;`
  });

  const stage = createElement("div", {
    style: `width:${stageW}px; height:${stageH}px; max-width:95vw; max-height:90vh;
            background:#111; border-radius:6px; overflow:hidden;
            display:flex; align-items:center; justify-content:center;`
  });

  const img = new Image();
  img.alt = "Crop image";
  img.draggable = false;
  img.style.maxWidth = "100%";
  img.style.maxHeight = "100%";
  img.style.display = "block";
  img.style.userSelect = "none";

  const toolbar = createElement("div", {
    style: `display:flex; gap:8px; margin-top:12px; align-items:center; justify-content:center;`
  });

  const confirmBtn = createElement("button", { type: "button" }, ["Crop & Upload"]);
  const cancelBtn = createElement("button", { type: "button" }, ["Cancel"]);

  // optional controls
  let rotateLeft = null, rotateRight = null, zoomOut = null, zoomIn = null;
  if (!simple) {
    rotateLeft = createElement("button", { type: "button" }, ["⟲"]);
    rotateRight = createElement("button", { type: "button" }, ["⟳"]);
    zoomOut = createElement("button", { type: "button" }, ["－"]);
    zoomIn = createElement("button", { type: "button" }, ["＋"]);

    toolbar.appendChild(rotateLeft);
    toolbar.appendChild(rotateRight);
    toolbar.appendChild(zoomOut);
    toolbar.appendChild(zoomIn);
  }

  toolbar.appendChild(confirmBtn);
  toolbar.appendChild(cancelBtn);

  const wrapper = createElement("div", {
    style: `display:flex; flex-direction:column; gap:8px; align-items:center;`
  }, [stage, toolbar]);

  overlay.appendChild(wrapper);
  return { overlay, stage, img, aspectRatio, rotateLeft, rotateRight, zoomIn, zoomOut, confirmBtn, cancelBtn };
}

export async function openCropper({
  file,
  type = "avatar",
  outputFormat = "image/jpeg",
  outputQuality = 0.92,
  customDimensions = null,
  simple = false
}) {
  await whenDOMReady();
  await loadCropperAssets();

  return new Promise((resolve) => {
    const { width: cropTargetW, height: cropTargetH } =
      customDimensions || CROP_SPECS[type] || CROP_SPECS.avatar;

    const ui = createCropUI({ cropTargetW, cropTargetH, simple });
    const { overlay, stage, img, aspectRatio, rotateLeft, rotateRight, zoomIn, zoomOut, confirmBtn, cancelBtn } = ui;

    document.body.appendChild(overlay);

    let cropper = null;
    let objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    function cleanup() {
      try { if (cropper) cropper.destroy(); } catch (e) {}
      cropper = null;
      if (objectUrl) { try { URL.revokeObjectURL(objectUrl); } catch (e) {} }
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      window.removeEventListener("resize", handleResize);
    }

    function handleResize() {
      const { width, height } = computeStageSize(cropTargetW, cropTargetH);
      stage.style.width = `${width}px`;
      stage.style.height = `${height}px`;
      if (cropper) cropper.resize();
    }

    window.addEventListener("resize", handleResize);

    try {
      cropper = new window.Cropper(img, {
        viewMode: 1,
        dragMode: "move",
        autoCrop: true,
        autoCropArea: 1,
        aspectRatio,
        background: false,
        modal: true,
        guides: false,
        center: true,
        movable: true,
        zoomable: !simple,
        rotatable: !simple,
        scalable: false,
        cropBoxResizable: false,
        cropBoxMovable: false,
        ready() {
          const containerData = this.getContainerData();
          const fitScale = Math.min(1, containerData.width / cropTargetW, containerData.height / cropTargetH);
          const boxW = cropTargetW * fitScale;
          const boxH = cropTargetH * fitScale;
          const left = (containerData.width - boxW) / 2;
          const top = (containerData.height - boxH) / 2;
          this.setCropBoxData({ left, top, width: boxW, height: boxH });
          this.crop();
        }
      });

      if (!simple) {
        rotateLeft.addEventListener("click", () => cropper.rotate(-90));
        rotateRight.addEventListener("click", () => cropper.rotate(90));
        zoomIn.addEventListener("click", () => cropper.zoom(0.1));
        zoomOut.addEventListener("click", () => cropper.zoom(-0.1));
      }

      cancelBtn.addEventListener("click", () => { cleanup(); resolve(null); });

      confirmBtn.addEventListener("click", () => {
        try {
          const dpr = Math.max(1, window.devicePixelRatio || 1);
          const canvas = cropper.getCroppedCanvas({
            width: cropTargetW * dpr,
            height: cropTargetH * dpr,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: "high"
          });
          canvas.toBlob((blob) => { cleanup(); resolve(blob); }, outputFormat, outputQuality);
        } catch (err) {
          console.error("Crop failed:", err);
          cleanup();
          resolve(null);
        }
      });
    } catch (err) {
      console.error("Failed to init cropper:", err);
      cleanup();
      resolve(null);
    }
  });
}
