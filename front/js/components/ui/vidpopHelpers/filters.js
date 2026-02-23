const filters = {
  "Filters": "none",
  "Grayscale": "grayscale(100%)",
  "Sepia": "sepia(100%)",
  "Invert": "invert(100%)",
  "Brightness": "brightness(150%)",
  "Contrast": "contrast(200%)",
  "Warm Tone": "sepia(30%) brightness(120%) contrast(110%)",
  "Cold Tone": "hue-rotate(200deg) brightness(80%) contrast(120%)",
  "Vintage": "sepia(60%) contrast(85%)",
  "Technicolor": "saturate(150%) hue-rotate(45deg)",
  "Retro": "sepia(60%) brightness(110%)",
  "Cool Grayscale": "grayscale(70%) contrast(120%)",
  "Warm Grayscale": "grayscale(70%) sepia(20%) contrast(120%)",
  "Red Tint": "sepia(50%) hue-rotate(-45deg)",
  "Green Tint": "sepia(50%) hue-rotate(45deg)",
  "Blue Tint": "sepia(50%) hue-rotate(90deg)",
  "Soft Glow": "brightness(120%) contrast(80%) blur(3px)",
  "Pixelate": "contrast(200%) blur(1px)",
  "High Saturation": "saturate(400%)",
  "Extreme Contrast": "contrast(300%)",
  "Subtle Blur": "blur(2px)",
  "Monochrome Red": "grayscale(100%) sepia(100%) hue-rotate(-60deg)",
  "Monochrome Green": "grayscale(100%) sepia(100%) hue-rotate(120deg)",
  "Monochrome Blue": "grayscale(100%) sepia(100%) hue-rotate(240deg)",
  "Posterize": "contrast(200%) saturate(2)",
  "Glow Edge": "invert(100%) blur(2px)",
  "Rainbow": "hue-rotate(360deg)",
  "Midnight": "brightness(60%) contrast(180%)",
  "Neon": "brightness(150%) saturate(300%)",
  "Comic": "brightness(120%) contrast(200%) saturate(200%) hue-rotate(60deg)",
  "Dreamy": "blur(4px) brightness(130%) contrast(70%)",
  "Ghostly": "invert(100%) grayscale(80%) opacity(70%)",
  "Cinema": "contrast(150%) saturate(110%) sepia(20%)",
  "Vibrant": "saturate(350%) hue-rotate(15deg)",
  "Night Vision": "brightness(120%) contrast(140%) hue-rotate(90deg)",
};
  
  function createFilterSelector(video) {
    const filterSelect = document.createElement("select");
    filterSelect.className = "filter-selector";
  
    Object.entries(filters).forEach(([name, value]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = name;
      filterSelect.appendChild(option);
    });
  
    filterSelect.addEventListener("change", (e) => {
      video.style.filter = e.target.value;
    });
  
    return filterSelect;
  }
  
  export { createFilterSelector };
  