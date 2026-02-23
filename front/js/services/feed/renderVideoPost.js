import VideoPlayer from '../../components/ui/VideoPlayer.mjs';

async function RenderVideoPost(mediaContainer, media, media_url = "", resolutions, subtits, posterPath) {
    const players = [];

    media.forEach(videoSrc => {
        const player = VideoPlayer({
            src: videoSrc,
            className: 'post-video',
            poster: posterPath,
            loop: true,
            controls: false,
            subtitles: subtits,
            availableResolutions: resolutions
        }, media_url);

        // Error handling / fallback
        const videoEl = player.querySelector("video");
        if (videoEl) {
            videoEl.onerror = () => {
                const fallback = document.createElement("div");
                fallback.classList.add("video-error");
                fallback.textContent = "Video failed to load.";
                player.replaceWith(fallback);
            };
        }

        mediaContainer.appendChild(player);
        players.push(player);
    });

    return players;
}

export { RenderVideoPost };
