import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import ZoomBox from "../../components/ui/ZoomBox.mjs";
import Imagex from "../../components/base/Imagex.js";

async function RenderImagePost(mediaContainer, media) {
    const mediaClasses = [
        'PostPreviewImageView_-one__-6MMx',
        'PostPreviewImageView_-two__WP8GL',
        'PostPreviewImageView_-three__HLsVN',
        'PostPreviewImageView_-four__fYIRN',
        'PostPreviewImageView_-five__RZvWx',
        'PostPreviewImageView_-six__EG45r',
        'PostPreviewImageView_-seven__65gnj',
        'PostPreviewImageView_-eight__SoycA'
    ];
    const classIndex = Math.min(media.length - 1, mediaClasses.length - 1);
    const assignedClass = mediaClasses[classIndex];

    const imageList = document.createElement('ul');
    imageList.className = `preview_image_wrap__Q29V8 PostPreviewImageView_-artist__WkyUA PostPreviewImageView_-bottom_radius__Mmn-- ${assignedClass}`;

    const fullImagePaths = media.map(img => resolveImagePath(EntityType.FEED, PictureType.PHOTO, img));

    media.forEach((img, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'PostPreviewImageView_image_item__dzD2P';

        const thumbPath = resolveImagePath(EntityType.FEED, PictureType.THUMB, img);

        const image = Imagex({
            src : thumbPath,
            loading : "lazy",
            alt : "Post Image",
            classes : 'post-image PostPreviewImageView_post_image__zLzXH',
            events: {click : () => startZoombox(fullImagePaths, index)},    
        });
        
        listItem.appendChild(image);
        imageList.appendChild(listItem);
    });

    mediaContainer.appendChild(imageList);
}

async function startZoombox(img, index) {
    ZoomBox(img, index);
}

export { RenderImagePost };
