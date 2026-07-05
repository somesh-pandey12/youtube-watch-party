import { useState } from "react";
import { extractYouTubeId } from "../utils/youtube";

export default function Controls({ canControl, playState, onPlay, onPause, onSeek, onChangeVideo }) {
  const [urlInput, setUrlInput] = useState("");
  const [seekInput, setSeekInput] = useState("");

  function handleLoadVideo() {
    const id = extractYouTubeId(urlInput);
    if (!id) {
      alert("Couldn't recognize that as a YouTube URL or video ID.");
      return;
    }
    onChangeVideo(id);
    setUrlInput("");
  }

  function handleSeek() {
    const seconds = Number(seekInput);
    if (Number.isNaN(seconds)) return;
    onSeek(seconds);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="controls-row">
        <button onClick={onPlay} disabled={!canControl || playState === "playing"}>
          ▶ Play
        </button>
        <button onClick={onPause} disabled={!canControl || playState === "paused"}>
          ⏸ Pause
        </button>
        <input
          type="number"
          placeholder="Seek to (sec)"
          value={seekInput}
          onChange={(e) => setSeekInput(e.target.value)}
          disabled={!canControl}
          style={{
            width: 120,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg-panel-2)",
            color: "var(--text)",
          }}
        />
        <button onClick={handleSeek} disabled={!canControl}>
          Go
        </button>
      </div>

      {canControl && (
        <div className="video-url-form">
          <input
            placeholder="Paste a YouTube URL or video ID to change video..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoadVideo()}
          />
          <button className="btn-primary" style={{ width: "auto", margin: 0 }} onClick={handleLoadVideo}>
            Load
          </button>
        </div>
      )}
    </div>
  );
}