import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

let ytApiPromise = null;

function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
  });
  return ytApiPromise;
}

const YouTubePlayer = forwardRef(function YouTubePlayer(
  { videoId, onUserAction, onReady },
  ref
) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const ignoreUntil = useRef(0);

  function suppressFor(ms) {
    ignoreUntil.current = Date.now() + ms;
  }

  useImperativeHandle(ref, () => ({
    playVideo: () => {
      suppressFor(1200);
      playerRef.current?.playVideo();
    },
    pauseVideo: () => {
      suppressFor(1200);
      playerRef.current?.pauseVideo();
    },
    seekTo: (seconds) => {
      suppressFor(1500);
      playerRef.current?.seekTo(seconds, true);
    },
    loadVideoById: (id, startSeconds = 0) => {
      suppressFor(2000);
      playerRef.current?.loadVideoById(id, startSeconds);
    },
    getCurrentTime: () => playerRef.current?.getCurrentTime?.() || 0,
  }));

  useEffect(() => {
    let destroyed = false;

    loadYouTubeAPI().then((YT) => {
      if (destroyed || !containerRef.current) return;

      playerRef.current = new YT.Player(containerRef.current, {
        videoId: videoId || undefined,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => onReady && onReady(),
          onStateChange: (event) => {
            if (Date.now() < ignoreUntil.current) return;

            const YTns = window.YT;
            if (event.data === YTns.PlayerState.PLAYING) {
              onUserAction?.({
                type: "play",
                currentTime: playerRef.current.getCurrentTime(),
              });
            } else if (event.data === YTns.PlayerState.PAUSED) {
              onUserAction?.({
                type: "pause",
                currentTime: playerRef.current.getCurrentTime(),
              });
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      playerRef.current?.destroy?.();
    };
  }, []);

  return <div ref={containerRef} />;
});

export default YouTubePlayer;