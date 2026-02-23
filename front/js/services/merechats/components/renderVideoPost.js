import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import VideoPlayer from "../../../components/ui/VideoPlayer.mjs";

function RenderVideoPost(container, videos, id = "", ext = "") {
  videos.forEach(v => {
    const src = resolveImagePath(
      EntityType.CHAT,
      PictureType.VIDEO,
      v + ext
    );

    const poster = resolveImagePath(
      EntityType.CHAT,
      PictureType.THUMB,
      `${v}.jpg`
    );

    const video = VideoPlayer(
      {
        src,
        poster,
        controls: true,
        muted: true
      },
      v
    );

    container.appendChild(video);
  });
}

export { RenderVideoPost };
