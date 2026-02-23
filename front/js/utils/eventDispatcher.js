export const dispatchZoomBoxEvent = (eventName, detail = {}) => {
    const event = new CustomEvent(`zoombox:${eventName}`, { detail });
    document.dispatchEvent(event);
  };
  