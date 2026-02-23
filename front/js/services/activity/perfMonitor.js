import { queueActivity } from "./activity_x.js";

let lastFrame = performance.now();
let frames = 0;
let fps = 0;

function monitorFPS() {
  const now = performance.now();
  frames++;
  if (now - lastFrame >= 1000) {
    fps = frames;
    frames = 0;
    lastFrame = now;
    queueActivity("perf_fps", { fps });
  }
  requestAnimationFrame(monitorFPS);
}

function monitorInputLatency() {
  document.addEventListener("click", e => {
    const start = performance.now();
    requestAnimationFrame(() => {
      const latency = performance.now() - start;
      queueActivity("perf_input_latency", { latency });
    });
  });
}

function monitorMemory() {
  if (performance && performance.memory) {
    setInterval(() => {
      const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
      queueActivity("perf_memory", {
        usedMB: usedJSHeapSize / 1048576,
        totalMB: totalJSHeapSize / 1048576,
      });
    }, 5000);
  }
}

function startPerfMonitoring() {
  monitorFPS();
  monitorInputLatency();
  monitorMemory();
}

export { startPerfMonitoring };
