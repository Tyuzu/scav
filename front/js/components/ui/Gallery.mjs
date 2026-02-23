import "../../../css/ui/Gallery.css";
import SightBox from "./SightBox.mjs";

const Gallery = (imagesArray) => {
    const galleryContainer = document.createElement('div');
    galleryContainer.className = 'gallery';

    imagesArray.forEach((image, index) => {
        const img = document.createElement('img');
        img.src = image.src;
        img.alt = image.alt || 'Gallery Image';
        img.className = 'gallery-image';
        img.addEventListener('click', () => {
            SightBox(image.src, "image"); // Pass the full array and clicked index
        });

        galleryContainer.appendChild(img);
    });

    return galleryContainer;
};


export default Gallery;
