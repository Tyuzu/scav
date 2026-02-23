import "../../../css/ui/RadarMenu.css";
import { makeDraggable } from "../makeDraggable.js"; // Import draggable utility

const RadarMenu = (menuItems = [], options = {}) => {
  const {
    buttonText = "+",
    menuSize = 360,
    radius = 112,
    baseAngle = 270,
    startAngle = 0
  } = options;

  let angleOffset = startAngle;
  let startX = 0;
  let lastX = 0;

  // Create a wrapper for everything
  const wrapperx = document.createElement("div");

  // Overlay to prevent accidental clicks on background elements
  const overlay = document.createElement("div");
  overlay.classList.add("radar-overlay");

  // Main radar wrapper
  const wrapper = document.createElement("div");
  wrapper.classList.add("radar-wrapper");

  // Radar menu container
  const radarMenu = document.createElement("div");
  radarMenu.classList.add("radar-menu");
  radarMenu.style.width = `${menuSize}px`;
  radarMenu.style.height = `${menuSize}px`;

  // Tool wrapper
  const toolWrap = document.createElement("div");
  toolWrap.classList.add("sr_tool_wrap");

  // List container
  const toolList = document.createElement("ul");
  toolList.classList.add("sr_tool_list");
  toolList.style.transform = `rotate(${baseAngle + angleOffset}deg)`;

  const center = menuSize / 2;
  const itemSize = 60;

  // Function to generate menu items dynamically
  const generateMenuItems = () => {
    toolList.innerHTML = "";
    const totalItems = menuItems.length;

    menuItems.forEach((item, index) => {
      const li = document.createElement("li");
      li.classList.add("sr_tool_item");

      const angle = (360 / totalItems) * index;
      const rad = angle * (Math.PI / 180);

      const left = center - itemSize / 2 + radius * Math.sin(rad);
      const top = center - itemSize / 2 - radius * Math.cos(rad);
      li.style.left = `${left}px`;
      li.style.top = `${top}px`;

      const svgspan = document.createElement("span");
      svgspan.textContent= item.text;

      const a = document.createElement("a");
      a.classList.add("sr_tool_a");
      a.href = "#";
      a.innerHTML = item.svg;
      a.style.transform = `rotate(-${baseAngle + angleOffset}deg)`;
      a.appendChild(svgspan);

      // Click animation
      a.addEventListener("click", (e) => {
        e.preventDefault();
        li.style.animation = "clickEffect 0.3s ease-in-out";
        setTimeout(() => {
          li.style.animation = "";
          closeMenu();
        }, 300);
        if (item.action) {
          item.action();
        }
      });

      li.appendChild(a);
      toolList.appendChild(li);
    });
  };

  generateMenuItems();

  toolWrap.appendChild(toolList);
  radarMenu.appendChild(toolWrap);
  wrapper.appendChild(radarMenu);

  // Function to update the menu rotation
  const updateRotations = () => {
    const totalRotation = baseAngle + angleOffset;
    toolList.style.transform = `rotate(${totalRotation}deg)`;
    Array.from(toolList.querySelectorAll(".sr_tool_a")).forEach((a) => {
      a.style.transform = `rotate(-${totalRotation}deg)`;
    });
  };

  // Create a draggable toggle button
  const toggleButton = document.createElement("div");
  toggleButton.classList.add("naver-button");
  toggleButton.textContent = buttonText;
  toggleButton.id = "radbtn";

  makeDraggable(toggleButton, "radarButtonPosition");

  // Function to open menu
  const openMenu = () => {
    radarMenu.classList.add("active");
    overlay.classList.add("visible");
    generateMenuItems();
    updateRotations();
  };

  // Function to close menu
  const closeMenu = () => {
    radarMenu.classList.remove("active");
    overlay.classList.remove("visible");
  };

  // Toggle menu when button is clicked
  toggleButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (radarMenu.classList.contains("active")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target) && !toggleButton.contains(e.target)) {
      closeMenu();
    }
  });

  // Close menu when clicking on overlay
  overlay.addEventListener("click", closeMenu);

  // Rotate menu using scroll wheel
  radarMenu.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      angleOffset += e.deltaY > 0 ? 15 : -15;
      updateRotations();
    },
    { passive: false }
  );

  // Rotate menu using keyboard
  document.addEventListener("keydown", (e) => {
    if (radarMenu.classList.contains("active")) {
      if (e.key === "ArrowRight") {
        angleOffset += 15;
        updateRotations();
      } else if (e.key === "ArrowLeft") {
        angleOffset -= 15;
        updateRotations();
      }
    }
  });

  // **Mobile Touch Support**
  radarMenu.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    lastX = startX;
  },{passive:false});

  radarMenu.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - lastX;
    
    angleOffset += deltaX * 1; // Adjust sensitivity
    updateRotations();
    
    lastX = currentX;
  }, { passive: false });

  radarMenu.addEventListener("touchend", () => {
    startX = 0;
    lastX = 0;
  });

  // Append elements
  wrapperx.appendChild(overlay);
  wrapperx.appendChild(wrapper);
  wrapperx.appendChild(toggleButton);

  return wrapperx;
};

export default RadarMenu;
export { RadarMenu };
