import Imagex from "../base/Imagex";
import "../../../css/ui/Carousel.css";
import { playSVG } from "../svgs";

// helper: convert svg string -> DOM element
function createSVG(svgString) {
    const template = document.createElement("template");
    template.innerHTML = svgString.trim();
    return template.content.firstChild;
}

const Carousel = (imagesArray) => {
    let currentIndex = 0;
    let startX = 0;
    let endX = 0;

    const carouselContainer = document.createElement('div');
    carouselContainer.setAttribute("class", "carousel");

    const imageWrapper = document.createElement('div');
    imageWrapper.setAttribute("class", "carousel-image-wrapper");

    const img = Imagex({
        src: imagesArray[0].src,
        alt: imagesArray[0].alt || 'Carousel Image',
        class: 'carousel-image',
    });

    imageWrapper.appendChild(img);
    carouselContainer.appendChild(imageWrapper);

    function updateImage(index) {
        currentIndex = (index + imagesArray.length) % imagesArray.length;
        img.setAttribute("src", imagesArray[currentIndex].src);
        img.setAttribute("alt", imagesArray[currentIndex].alt || 'Carousel Image');
    }

    if (imagesArray.length > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.setAttribute("class", "carousel-btn prev");
        const prevIcon = createSVG(playSVG);
        // prevBtn.style.transform = "rotate(180deg)";
        prevBtn.appendChild(prevIcon);

        const nextBtn = document.createElement('button');
        nextBtn.setAttribute("class", "carousel-btn next");
        const nextIcon = createSVG(playSVG);
        // nextIcon.style.transform = "rotate(180deg)";
        nextBtn.appendChild(nextIcon);

        prevBtn.addEventListener('click', () => updateImage(currentIndex - 1));
        nextBtn.addEventListener('click', () => updateImage(currentIndex + 1));

        carouselContainer.appendChild(prevBtn);
        carouselContainer.appendChild(nextBtn);

        // swipe support
        imageWrapper.addEventListener("touchstart", (e) => {
            startX = e.touches[0].clientX;
        });

        imageWrapper.addEventListener("touchend", (e) => {
            endX = e.changedTouches[0].clientX;
            const diff = endX - startX;
            if (Math.abs(diff) > 50) { 
                if (diff > 0) {
                    updateImage(currentIndex - 1); // swipe right -> prev
                } else {
                    updateImage(currentIndex + 1); // swipe left -> next
                }
            }
        });
    }

    return carouselContainer;
};

export default Carousel;
