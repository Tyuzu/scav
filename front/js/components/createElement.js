function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    for (const [key, value] of Object.entries(attributes)) {
        if (key === "events" && value && typeof value === "object") {
            for (const [eventName, handler] of Object.entries(value)) {
                if (typeof handler === "function") {
                    element.addEventListener(eventName, handler);
                }
            }
        } else if ((key === "style" || key === "styles") && value && typeof value === "object") {
            for (const [prop, val] of Object.entries(value)) {
                element.style[prop] = val;
            }
        } else if (key === "class" && typeof value === "string") {
            // Filter out empty strings after splitting
            const classes = value.trim().split(/\s+/).filter(c => c.length > 0);
            if (classes.length) {
                element.classList.add(...classes);
            }
        } else if (key === "dataset" && value && typeof value === "object") {
            for (const [dataKey, dataValue] of Object.entries(value)) {
                element.dataset[dataKey] = dataValue;
            }
        } else if (key in element) {
            // Directly assign known DOM properties like `value`, `type`, etc.
            element[key] = value;
        } else {
            // Fallback to setAttribute
            element.setAttribute(key, value);
        }
    }

    for (const child of [].concat(children)) {
        if (child === null || child === undefined || child === false) continue;

        if (typeof child === "string" || typeof child === "number") {
            element.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof Node) {
            element.appendChild(child);
        } else {
            console.error("Invalid child passed to createElement:", child);
        }
    }

    return element;
}

export { createElement };
