import { createElement } from "../../createElement"

let hkl = `<div id="hotkey-help" style="display:none; position:fixed; bottom:10px; right:10px; background:#111; color:#fff; padding:1rem; z-index:9999; font-size:0.9rem; max-width:300px; border-radius:6px;">
  <strong>Hotkeys</strong><br><br>
  <kbd>H</kbd> Flip Video<br>
  <kbd>+</kbd> Zoom In<br>
  <kbd>-</kbd> Zoom Out<br>
  <kbd>Z/X/C</kbd> Speed ↓ / Reset / ↑<br>
  <kbd>B/N/M</kbd> Volume ↓ / ↑ / Mute<br>
  <kbd>V</kbd> Play / Pause<br>
  <kbd>, / .</kbd> Frame Back / Forward<br>
  <kbd>F</kbd> Fullscreen<br>
  <kbd>P</kbd> Picture-in-Picture<br>
  <kbd>0–9</kbd> Seek %<br>
  <kbd>J/L</kbd> Seek ±10s<br>
  <kbd>S</kbd> Toggle Subtitles<br>
  <kbd>R</kbd> Rotate<br>
  <kbd>Alt+R</kbd> Reset Rotation<br>
  <kbd>?</kbd> Toggle this help
</div>`

let hklegends = createElement("div",{},[]);
hklegends.innerhtml = hkl;

export {hklegends};


/*

document.body.appendChild(hklegends);
window.addEventListener("keydown", async (e) => {
  if (e.key === "?") {
    const help = document.getElementById("hotkey-help");
    if (help) help.style.display = help.style.display === "none" ? "block" : "none";
    e.preventDefault();
    return;
  }
});


*/