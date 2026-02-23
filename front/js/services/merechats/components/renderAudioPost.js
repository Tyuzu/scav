import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import AudioPlayer from "../../../components/ui/AudioPlayer.mjs";

async function RenderAudioPost(container, id = "") {
  const src = resolveImagePath(EntityType.CHAT, PictureType.AUDIO, `${id}.mp3`);
  const poster = resolveImagePath(EntityType.CHAT, PictureType.THUMB, `${id}.jpg`);

  const audio = AudioPlayer({
    src,
    poster,
    controls: true,
    muted: false
  });

  container.appendChild(audio);
}

export { RenderAudioPost };

// // renderAudioPost.js
// import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
// import AudioPlayer from '../../../components/ui/AudioPlayer.mjs';

// async function RenderAudioPost(mediaContainer, media_url = "", resolution) {
//     const audioSrc = resolveImagePath(EntityType.CHAT, PictureType.AUDIO, `${media_url}.mp3`);
//     const posterPath = resolveImagePath(EntityType.CHAT, PictureType.THUMB, `${media_url}.jpg`);

//     const audiox = AudioPlayer({
//         src: audioSrc,
//         className: 'post-audio',
//         muted: false,
//         poster: posterPath,
//         lyricsData: lyrics,
//         controls: true,
//         resolutions: resolution,
//     });

//     mediaContainer.appendChild(audiox);
// }

// export { RenderAudioPost };
