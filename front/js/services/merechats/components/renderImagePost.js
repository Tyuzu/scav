import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import ZoomBox from "../../../components/ui/ZoomBox.mjs";
import Imagex from "../../../components/base/Imagex.js";

async function RenderImagePost(mediaContainer, media) {
  const imageList = document.createElement("ul");
  imageList.className = "preview_image_wrap";

  const fullPaths = media.map(id =>
    resolveImagePath(EntityType.CHAT, PictureType.PHOTO, `${id}.png`)
  );

  media.forEach((id, index) => {
    const li = document.createElement("li");

    const thumb = resolveImagePath(
      EntityType.CHAT,
      PictureType.THUMB,
      `${id}.jpg`
    );

    const img = Imagex({
      src: thumb,
      loading: "lazy",
      alt: "Image",
      classes: "post-image",
      events: {
        click: () => ZoomBox(fullPaths, index)
      }
    });

    li.appendChild(img);
    imageList.appendChild(li);
  });

  mediaContainer.appendChild(imageList);
}

export { RenderImagePost };
