export function makeDraggable(element, storageKey = null) {
  let offsetX, offsetY, isDragging = false;

  // Load saved position if storageKey is provided
  if (storageKey) {
    // const storedPosition = localStorage.getItem(storageKey);
    // if (storedPosition) {
    //   const { x, y } = JSON.parse(storedPosition);
    //   element.style.left = `${x}px`;
    //   element.style.top = `${y}px`;
    // }
  }

  function savePosition() {
    // if (storageKey) {
    //   localStorage.setItem(storageKey, JSON.stringify({
    //     x: element.offsetLeft,
    //     y: element.offsetTop
    //   }));
    // }
  }

  function keepWithinBounds(x, y) {
    const { innerWidth, innerHeight } = window;
    const rect = element.getBoundingClientRect();
    
    // Compute boundaries
    const minX = 0;
    const minY = 0;
    const maxX = innerWidth - rect.width;
    const maxY = innerHeight - rect.height;

    // Clamp values to stay within screen
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    };
  }

  function moveElement(x, y) {
    const { x: newX, y: newY } = keepWithinBounds(x, y);
    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
  }

  element.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    element.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    moveElement(e.clientX - offsetX, e.clientY - offsetY);
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      savePosition();
      isDragging = false;
      element.style.cursor = "grab";
    }
  });

  // Touch support
  element.addEventListener("touchstart", (e) => {
    isDragging = true;
    const touch = e.touches[0];
    offsetX = touch.clientX - element.getBoundingClientRect().left;
    offsetY = touch.clientY - element.getBoundingClientRect().top;
    element.style.cursor = "grabbing";
  },{passive:false});

  document.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    e.preventDefault(); 
    const touch = e.touches[0];
    moveElement(touch.clientX - offsetX, touch.clientY - offsetY);
  });

  document.addEventListener("touchend", () => {
    if (isDragging) {
      savePosition();
      isDragging = false;
      element.style.cursor = "grab";
    }
  });
}

