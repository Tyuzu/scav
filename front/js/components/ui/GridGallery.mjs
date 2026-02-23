import "../../../css/ui/GridGallery.css";
import SightBox from "./SightBox.mjs";

const GridGallery = (imagesArray) => {
    const galleryContainer = document.createElement('div');
    galleryContainer.className = 'gallery-grid';

    imagesArray.forEach((image) => {
        const figure = document.createElement('figure');
        figure.className = 'gallery-item';

        const img = document.createElement('img');
        img.src = image.src;
        img.alt = image.alt || 'Gallery Image';
        img.className = 'gallery-image';

        img.addEventListener('click', () => {
            SightBox(image.src);
        });

        figure.appendChild(img);
        galleryContainer.appendChild(figure);
    });

    return galleryContainer;
};

export default GridGallery;
