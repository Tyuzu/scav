import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import VideoPlayer from '../../../components/ui/VideoPlayer.mjs';

async function RenderVideoPost(mediaContainer, media, media_url = "", resolution) {
    media.forEach(videoSrc => {
        const posterPath = resolveImagePath(EntityType.CHAT, PictureType.POSTER, `${media_url}.jpg`);
        console.log(media_url);
        const videox = VideoPlayer({
            src: videoSrc,
            className: 'post-video',
            muted: true,
            poster: posterPath,
            controls: false,
        }, media_url[0], resolution);

        mediaContainer.appendChild(videox);
    });
}

export { RenderVideoPost };
