import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import AudioPlayer from '../../../components/ui/AudioPlayer.mjs';

async function RenderAudioPost(mediaContainer, media_url = "", resolution) {
    const audioSrc = resolveImagePath(EntityType.CHAT, PictureType.AUDIO, `${media_url}.mp3`);
    const posterPath = resolveImagePath(EntityType.CHAT, PictureType.THUMB, `${media_url}.jpg`);

    const audiox = AudioPlayer({
        src: audioSrc,
        className: 'post-audio',
        muted: false,
        poster: posterPath,
        controls: true,
        resolutions: resolution,
    });

    mediaContainer.appendChild(audiox);
}

export { RenderAudioPost };
