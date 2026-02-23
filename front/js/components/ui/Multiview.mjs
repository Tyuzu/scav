import "../../../css/ui/MultiView.css";
import { SRC_URL } from "../../api/api.js";
const MultiView = (images) => {
  
    // Create overlay container and content container
    const multiview = document.createElement('div');
    multiview.className = 'multiview-overlay';
    multiview.style.opacity = '0';
    multiview.style.transition = 'opacity 0.3s ease';
  
    // Dark mode auto-detection
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      multiview.classList.add('dark-mode');
    }
  
    const content = document.createElement('div');
    content.className = 'multiview-content';
  
    // --- Create image(s) ---
    let bottomImg, topImg, slider; // used in multi-view mode
  

      // Multi-view mode (Before/After)
      const multiContainer = document.createElement('div');
      multiContainer.className = 'multiview-container';
      multiContainer.style.position = 'relative';
      multiContainer.style.overflow = 'hidden';
  
      // Bottom (base) image
      bottomImg = document.createElement('img');
      bottomImg.src = `${SRC_URL}/${images[0]}`;
      bottomImg.alt = 'Multiview Base Image';
      bottomImg.style.width = '100%';
      bottomImg.style.height = 'auto';
      bottomImg.style.transition = 'transform 0.2s ease-out';
      bottomImg.style.willChange = 'transform';
      multiContainer.appendChild(bottomImg);
  
      // Top (compare) image
      topImg = document.createElement('img');
      topImg.src = `${SRC_URL}/${images[1]}`;
      topImg.alt = 'Multiview Compare Image';
      topImg.style.position = 'absolute';
      topImg.style.top = '0';
      topImg.style.left = '0';
      topImg.style.width = '100%';
      topImg.style.height = 'auto';
      topImg.style.transition = 'transform 0.2s ease-out';
      topImg.style.willChange = 'transform';
      // Initially clip top image to 50%
      topImg.style.clipPath = 'inset(0 50% 0 0)';
      multiContainer.appendChild(topImg);
  
      // Slider to control the comparison
      slider = document.createElement('div');
      slider.className = 'multiview-slider';
      slider.style.position = 'absolute';
      slider.style.top = '0';
      slider.style.left = '50%';
      slider.style.width = '4px';
      slider.style.height = '100%';
      slider.style.background = '#fff';
      slider.style.cursor = 'ew-resize';
      multiContainer.appendChild(slider);
  
      content.appendChild(multiContainer);
    

  
  
    // --- Multi-View Slider (Before/After) ---
    if (slider) {
      let isSliderDragging = false;
      const onSliderMouseDown = () => {
        isSliderDragging = true;
      };
      const onSliderMouseMove = (event) => {
        if (!isSliderDragging) return;
        const containerRect = slider.parentElement.getBoundingClientRect();
        let percentage =
          ((event.clientX - containerRect.left) / containerRect.width) * 100;
        percentage = Math.max(0, Math.min(100, percentage));
        slider.style.left = `${percentage}%`;
        topImg.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
      };
      const onSliderMouseUp = () => {
        isSliderDragging = false;
      };
      slider.addEventListener('mousedown', onSliderMouseDown);
      document.addEventListener('mousemove', onSliderMouseMove);
      document.addEventListener('mouseup', onSliderMouseUp);
  
      // Touch events for slider
      slider.addEventListener(
        'touchstart',
        (event) => {
          isSliderDragging = true;
          event.preventDefault();
        },
        { passive: false }
      );
      slider.addEventListener(
        'touchmove',
        (event) => {
          if (!isSliderDragging) return;
          const touch = event.touches[0];
          const containerRect = slider.parentElement.getBoundingClientRect();
          let percentage =
            ((touch.clientX - containerRect.left) / containerRect.width) * 100;
          percentage = Math.max(0, Math.min(100, percentage));
          slider.style.left = `${percentage}%`;
          topImg.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
          event.preventDefault();
        },
        { passive: false }
      );
      slider.addEventListener('touchend', () => {
        isSliderDragging = false;
      });
    }
  
    // --- Close Button ---
    const closeButton = document.createElement('button');
    closeButton.className = 'multiview-close-btn';
    closeButton.textContent = '✖';
    const closeMultiview = () => {
      multiview.style.opacity = '0';
      setTimeout(() => {
        multiview.remove();
        // (Optional) Remove any global event listeners if needed
      }, 300);
    };
    closeButton.addEventListener('click', closeMultiview);
    content.appendChild(closeButton);
  
    multiview.appendChild(content);
    document.getElementById('app').appendChild(multiview);
  
    // Fade in overlay
    requestAnimationFrame(() => {
      multiview.style.opacity = '1';
    });
  };
  
  export default MultiView;