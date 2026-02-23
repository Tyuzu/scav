import { createElement } from "../../../components/createElement";
export function clearElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }
  
  export function createOption(value, text) {
    return createElement("option", { value }, [text]);
  }
  
  export function showToast(msg) {
    const toast = createElement("div", {
      style: `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #4caf50;
        color: #fff;
        padding: 10px 16px;
        border-radius: 4px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        z-index: 1000;
      `
    }, [msg]);
  
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }
  