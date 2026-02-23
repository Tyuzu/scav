/* ---------- Constants & Default CSS ---------- */
export const CSS_PREFIX = "generic-map";

/**
 * Default style for generic map with CSS variables for easy customization.
 * These variables can be overridden in user CSS or inline style blocks.
 */
// export const DEFAULT_STYLE = ``;

export const DEFAULT_STYLE = `
:root {
  --${CSS_PREFIX}-bg: #000;
  --${CSS_PREFIX}-panel-bg: #fff;
  --${CSS_PREFIX}-border-color: rgba(0, 0, 0, 0.1);
  --${CSS_PREFIX}-viewport-border: rgba(0, 0, 0, 0.25);
  --${CSS_PREFIX}-viewport-fill: rgba(0, 0, 0, 0.04);
  --${CSS_PREFIX}-border-radius: 6px;
  --${CSS_PREFIX}-panel-padding: 8px;
  --${CSS_PREFIX}-btn-size: 36px;
  --${CSS_PREFIX}-btn-gap: 6px;
  --${CSS_PREFIX}-minimap-size: 140px;
  --${CSS_PREFIX}-z-info: 60;
  --${CSS_PREFIX}-z-zoom: 50;
  --${CSS_PREFIX}-z-legend: 45;
  --${CSS_PREFIX}-z-minimap: 40;
  --${CSS_PREFIX}-height: 250px; /* default container height, can be overridden */
  --${CSS_PREFIX}-max-width: 100%;
  --${CSS_PREFIX}-panel-bg-alpha: rgba(255,255,255,0.85);
}

/* Dark theme variables (apply by setting data-theme="dark" on <html> or :root) */
:root[data-theme='dark'] {
  --generic-map-bg: #0b0b0b;
  --generic-map-panel-bg: rgba(30,30,30,0.9);
  --generic-map-border-color: rgba(255,255,255,0.06);
  --generic-map-text: #eaeaea;
  --generic-map-panel-bg-alpha: rgba(20,20,20,0.85);
}

/* Container */
.${CSS_PREFIX}-container {
  position: relative;
  overflow: hidden;
  touch-action: none;              /* prevent browser gestures interfering */
  width: var(--${CSS_PREFIX}-max-width);
  height: var(--${CSS_PREFIX}-height);
  background: var(--${CSS_PREFIX}-bg);
  display: block;
  user-select: none;
  -webkit-user-select: none;
}

/* Wrapper that moves / scales the whole map image + marker layer */
.${CSS_PREFIX}-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;           /* we translate/scale from top-left */
  will-change: transform;          /* hint for GPU compositing */
  pointer-events: auto;            /* allow interaction to be handled naturally */
  touch-action: none;
}

/* Inner image: do not force to viewport width.
   Imagex will set width/height attributes — honor those. */
.${CSS_PREFIX}-inner {
  display: block;
  user-select: none;
  pointer-events: none;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
  image-rendering: auto;
  -webkit-user-drag: none;
}

/* Marker layer sits on top of the image inside the wrapper.
   It must allow pointer events so children (markers) receive them. */
.${CSS_PREFIX}-marker-layer {
  position: absolute;
  inset: 0;
  pointer-events: auto;            /* children handle their own pointer-events */
}

/* Default marker styles; individual elements control pointer behavior */
.${CSS_PREFIX}-marker,
.${CSS_PREFIX}-user-marker,
.${CSS_PREFIX}-locked-area {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

/* Zoom controls */
.${CSS_PREFIX}-zoom-controls {
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: var(--${CSS_PREFIX}-z-zoom);
  display: flex;
  flex-direction: column;
  gap: var(--${CSS_PREFIX}-btn-gap);
  align-items: center;
  backdrop-filter: blur(4px);
}

/* Buttons */
.${CSS_PREFIX}-btn {
  width: var(--${CSS_PREFIX}-btn-size);
  height: var(--${CSS_PREFIX}-btn-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--${CSS_PREFIX}-panel-bg-alpha);
  border: 1px solid var(--${CSS_PREFIX}-border-color);
  border-radius: var(--${CSS_PREFIX}-border-radius);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: transform 0.08s ease, background 0.12s ease;
  user-select: none;
}
.${CSS_PREFIX}-btn:hover { transform: translateY(-1px); }
.${CSS_PREFIX}-btn:active { transform: scale(0.96); }

/* Minimap */
.${CSS_PREFIX}-minimap {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: var(--${CSS_PREFIX}-minimap-size);
  height: var(--${CSS_PREFIX}-minimap-size);
  overflow: hidden;
  z-index: var(--${CSS_PREFIX}-z-minimap);
  border: 1px solid var(--${CSS_PREFIX}-border-color);
  border-radius: var(--${CSS_PREFIX}-border-radius);
  background: rgba(0,0,0,0.08);
  display: block;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
}
.${CSS_PREFIX}-minimap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

/* Viewport rect inside minimap */
.${CSS_PREFIX}-minimap-viewport {
  position: absolute;
  border: 1px solid var(--${CSS_PREFIX}-viewport-border);
  box-sizing: border-box;
  pointer-events: none;
  background: var(--${CSS_PREFIX}-viewport-fill);
  transition: left 0.08s linear, top 0.08s linear, width 0.08s linear, height 0.08s linear;
  will-change: left, top, width, height;
}

/* Info panel */
.${CSS_PREFIX}-info-panel {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: var(--${CSS_PREFIX}-z-info);
  background: var(--${CSS_PREFIX}-panel-bg-alpha);
  padding: var(--${CSS_PREFIX}-panel-padding);
  border-radius: var(--${CSS_PREFIX}-border-radius);
  display: none;
  min-width: 160px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

/* Legend */
.${CSS_PREFIX}-legend {
  position: absolute;
  left: 8px;
  bottom: 8px;
  padding: var(--${CSS_PREFIX}-panel-padding);
  background: var(--${CSS_PREFIX}-panel-bg-alpha);
  z-index: var(--${CSS_PREFIX}-z-legend);
  border-radius: var(--${CSS_PREFIX}-border-radius);
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}

/* Locked area visuals */
.${CSS_PREFIX}-locked-area {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: not-allowed;
  background: rgba(255, 0, 0, 0.04);
  border: 1px solid rgba(255, 0, 0, 0.14);
  padding: 4px;
}

/* User marker */
.${CSS_PREFIX}-user-marker {
  font-size: 20px;
  cursor: default;
  text-shadow: 0 0 4px rgba(0,0,0,0.6);
  pointer-events: auto;
}

/* Regular marker */
.${CSS_PREFIX}-marker {
  cursor: pointer;
  font-size: 18px;
  text-shadow: 0 0 3px rgba(0,0,0,0.6);
  pointer-events: auto;
  padding: 4px;
}

/* Shared elevated panels look */
.${CSS_PREFIX}-zoom-controls,
.${CSS_PREFIX}-info-panel,
.${CSS_PREFIX}-legend {
  box-shadow: 0 6px 20px rgba(0,0,0,0.12);
  backdrop-filter: blur(6px);
}

/* Small screens adjustments */
@media (max-width: 520px) {
  :root {
    --${CSS_PREFIX}-minimap-size: 100px;
    --${CSS_PREFIX}-btn-size: 32px;
  }
  .${CSS_PREFIX}-legend { display: none; } /* optional: hide legend on tiny screens */
}
`;
