// MediaRenders - Consolidated component
// Re-exports from shared for backward compatibility
export { RenderImagePost } from "../../../shared/components/MediaRenders.js";

    media.forEach((img, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'PostPreviewImageView_image_item__dzD2P';

        const thumbPath = resolveImagePath(EntityType.CHAT, PictureType.THUMB, img.src);

        const image = Imagex({
            src: thumbPath,
            loading: "lazy",
            alt: "Post Image",
            classes: 'post-image PostPreviewImageView_post_image__zLzXH',
            events: { click: () => startZoombox(fullImagePaths, index) },
        });

        listItem.appendChild(image);
        imageList.appendChild(listItem);
    });

    mediaContainer.appendChild(imageList);
}

async function startZoombox(img, index) {
    // ZoomBox(img, index);
    Sightbox(img, "image");
}

export { RenderImagePost };
