import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { socket } from "../socket";
import YouTubePlayer from "../components/YouTubePlayer.jsx";
import ParticipantsList from "../components/ParticipantsList.jsx";
import Chat from "../components/Chat.jsx";
import Controls from "../components/Controls.jsx";

const CONTROL_ROLES = new Set(["host", "moderator"]);

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const playerRef = useRef(null);

  const [username] = useState(() => sessionStorage.getItem("wp_username") || "");
  const [myUserId, setMyUserId] = useState(null);
  const [myRole, setMyRole] = useState("participant");
  const [participants, setParticipants] = useState([]);
  const [videoId, setVideoId] = useState(null);
  const [playState, setPlayState] = useState("paused");
  const [messages, setMessages] = useState([]);
  const [connError, setConnError] = useState("");

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    socket.connect();
    socket.emit("join_room", { roomId, username });

    socket.on("joined", ({ userId, role, state, participants: list }) => {
      setMyUserId(userId);
      setMyRole(role);
      setVideoId(state.videoId);
      setPlayState(state.playState);
      setParticipants(list);
    });

    socket.on("user_joined", ({ participants: list }) => setParticipants(list));
    socket.on("user_left", ({ participants: list }) => setParticipants(list));
    socket.on("participant_removed", ({ participants: list }) => setParticipants(list));

    socket.on("role_assigned", ({ userId, role, participants: list }) => {
      setParticipants(list);
      if (userId === myUserId) setMyRole(role);
    });

    socket.on("sync_state", (state) => {
      setPlayState(state.playState);
      if (state.videoId !== videoId) {
        setVideoId(state.videoId);
        playerRef.current?.loadVideoById(state.videoId, state.currentTime || 0);
        return;
      }

      const localTime = playerRef.current?.getCurrentTime?.() || 0;
      const drift = Math.abs(localTime - (state.currentTime || 0));

      if (state.playState === "playing") {
        if (drift > 2) playerRef.current?.seekTo(state.currentTime);
        playerRef.current?.playVideo();
      } else {
        playerRef.current?.pauseVideo();
      }
    });

    socket.on("chat_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("kicked", () => {
      alert("You were removed from the room by the host.");
      navigate("/");
    });

    socket.on("error_message", ({ message }) => setConnError(message));

    return () => {
      socket.emit("leave_room");
      socket.off("joined");
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("participant_removed");
      socket.off("role_assigned");
      socket.off("sync_state");
      socket.off("chat_message");
      socket.off("kicked");
      socket.off("error_message");
      socket.disconnect();
    };
  }, [roomId, username]);

  const canControl = CONTROL_ROLES.has(myRole);

  function handlePlayerReady() {
    if (videoId) playerRef.current?.loadVideoById(videoId);
  }

  function handleUserAction({ type, currentTime }) {
    if (!canControl) return;
    socket.emit(type, { currentTime });
  }

  function copyRoomLink() {
    navigator.clipboard.writeText(window.location.href);
  }

  return (
    <div className="room-shell">
      <div className="room-main">
        <div className="room-header">
          <div className="brand">
            <div className="badge-icon">🎬</div>
            Watch Party
            <span className="room-code-chip">🎟 {roomId}</span>
          </div>
          <div className="header-actions">
            <span className="live-pill">
              <span className="pulse" /> Live
            </span>
            <button className="copy-btn" onClick={copyRoomLink}>
              Copy invite link
            </button>
          </div>
        </div>

        <div className="player-wrap">
          {videoId ? (
            <YouTubePlayer
              ref={playerRef}
              videoId={videoId}
              onReady={handlePlayerReady}
              onUserAction={handleUserAction}
            />
          ) : (
            <div className="player-empty">
              <span style={{ fontSize: "1.6rem" }}>📺</span>
              <span>No video loaded yet{canControl ? " — paste a link below" : ""}</span>
            </div>
          )}

          {!canControl && (
            <div className="locked-overlay">
              <span className="locked-badge">🔒 Watch only — ask the host for controls</span>
            </div>
          )}
        </div>

        <div className="controls-panel">
          <Controls
            canControl={canControl}
            playState={playState}
            onPlay={() => socket.emit("play", { currentTime: playerRef.current?.getCurrentTime() })}
            onPause={() => socket.emit("pause", { currentTime: playerRef.current?.getCurrentTime() })}
            onSeek={(time) => socket.emit("seek", { time })}
            onChangeVideo={(id) => socket.emit("change_video", { videoId: id })}
          />
        </div>

        {connError && <div className="error-text">⚠ {connError}</div>}
      </div>

      <div className="room-sidebar">
        <ParticipantsList
          participants={participants}
          myUserId={myUserId}
          myRole={myRole}
          onAssignRole={(userId, role) => socket.emit("assign_role", { userId, role })}
          onRemove={(userId) => socket.emit("remove_participant", { userId })}
          onTransferHost={(userId) => socket.emit("transfer_host", { userId })}
        />
        <Chat messages={messages} onSend={(text) => socket.emit("chat_message", { text })} />
      </div>
    </div>
  );
}