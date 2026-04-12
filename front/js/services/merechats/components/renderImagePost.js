// MediaRenders - Consolidated component
// Re-exports from shared for backward compatibility
export { RenderImagePost } from "../../../shared/components/MediaRenders.js";
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
