export function makeDraggableScroll(container) {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let dragged = false;

  container.addEventListener("mousedown", e => {
    isDown = true;
    dragged = false;
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
    container.style.userSelect = "none"; // prevent text selection
  });

  container.addEventListener("mouseleave", () => {
    isDown = false;
    container.style.userSelect = "";
  });

  container.addEventListener("mouseup", () => {
    isDown = false;
    setTimeout(() => (dragged = false), 50);
    container.style.userSelect = "";
  });

  container.addEventListener("mousemove", e => {
    if (!isDown) return;
    e.preventDefault();
    dragged = true;
    const x = e.pageX - container.offsetLeft;
    const walk = x - startX;
    container.scrollLeft = scrollLeft - walk;
  });

  // Only prevent clicks on the container itself, not its children
  container.addEventListener("click", e => {
    if (dragged && e.target === container) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
}
