function getContrastColor(bgColor) {
    // Convert hex to RGB
    let r = parseInt(bgColor.substring(1, 3), 16) / 255;
    let g = parseInt(bgColor.substring(3, 5), 16) / 255;
    let b = parseInt(bgColor.substring(5, 7), 16) / 255;

    // Calculate relative luminance
    let [R, G, B] = [r, g, b].map(channel => 
        channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );

    let luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;

    // Choose white or black text based on contrast ratio
    return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

// Function to apply background and text color
async function applyButtonColors(button, bgColor) {
    let concol = getContrastColor(bgColor);
    button.style.backgroundColor = bgColor;
    button.style.color = concol;
    button.style.borderColor = concol;
}

// // Example usage:
// document.addEventListener("DOMContentLoaded", () => {
//     const button = document.getElementById("myButton");

//     // Set a random background color
//     let randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    
//     applyButtonColors(button, randomColor);
// });

export {applyButtonColors, getContrastColor};