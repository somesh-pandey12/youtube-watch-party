import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const FEATURES = [
  { num: "01", title: "Create a room", desc: "Get a unique code to share with friends instantly." },
  { num: "02", title: "Stay in sync", desc: "Play, pause, and seek — everyone sees it live." },
  { num: "03", title: "Control who controls", desc: "Host assigns Moderator or Watch-only roles." },
];

export default function Home() {
  const [username, setUsername] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleCreateRoom() {
    if (!username.trim()) {
      setError("Please enter your name first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      sessionStorage.setItem("wp_username", username.trim());
      navigate(`/room/${data.roomId}`);
    } catch (err) {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function handleJoinRoom() {
    if (!username.trim()) {
      setError("Please enter your name first.");
      return;
    }
    if (!joinCode.trim()) {
      setError("Please enter a room code.");
      return;
    }
    sessionStorage.setItem("wp_username", username.trim());
    navigate(`/room/${joinCode.trim()}`);
  }

  return (
    <div className="landing">
      <div className="landing-copy">
        <span className="eyebrow">
          <span className="dot" />
          Live &amp; synced
        </span>
        <h1>
          Watch YouTube <span>together</span>, perfectly in sync.
        </h1>
        <p className="lead">
          Create a room, share the code, and everyone's player follows the
          same play, pause, and seek — in real time, powered by WebSockets.
        </p>

        <div className="feature-row">
          {FEATURES.map((f) => (
            <div className="feature-item" key={f.num}>
              <div className="num">{f.num}</div>
              <div className="body">
                <strong>{f.title}</strong>
                <span>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-logo">🎬</div>
        <h2 className="card-title">Start watching</h2>
        <p className="subtitle">Pick a name to create or join a room.</p>

        <div className="field">
          <label>Your name</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Riya"
            maxLength={24}
          />
        </div>

        <button className="btn-primary" onClick={handleCreateRoom} disabled={loading}>
          {loading ? "Creating..." : "Create a new room"}
        </button>

        <div className="divider">OR JOIN EXISTING</div>

        <div className="field">
          <label>Room code</label>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="e.g. aB3xQ9kZ"
          />
        </div>
        <button className="btn-secondary" onClick={handleJoinRoom}>
          Join room
        </button>

        {error && <div className="error-text">⚠ {error}</div>}
      </div>
    </div>
  );
}