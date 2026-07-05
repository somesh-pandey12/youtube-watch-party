function initials(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

export default function ParticipantsList({
  participants,
  myUserId,
  myRole,
  onAssignRole,
  onRemove,
  onTransferHost,
}) {
  const isHost = myRole === "host";

  return (
    <>
      <div className="section-title">Participants ({participants.length})</div>
      <ul className="participants-list">
        {participants.map((p) => (
          <li className="participant-row" key={p.userId}>
            <div className="participant-info">
              <div className={`avatar ${p.role}`}>{initials(p.username)}</div>
              <span className="participant-name">{p.username}</span>
              <span className={`role-badge ${p.role}`}>{p.role}</span>
              {p.userId === myUserId && <span className="you-tag">you</span>}
            </div>

            {isHost && p.userId !== myUserId && (
              <div className="participant-actions">
                {p.role !== "moderator" ? (
                  <button
                    className="icon-btn"
                    onClick={() => onAssignRole(p.userId, "moderator")}
                    title="Make moderator"
                  >
                    +Mod
                  </button>
                ) : (
                  <button
                    className="icon-btn"
                    onClick={() => onAssignRole(p.userId, "participant")}
                    title="Remove moderator"
                  >
                    -Mod
                  </button>
                )}
                <button
                  className="icon-btn"
                  onClick={() => onTransferHost(p.userId)}
                  title="Make host"
                >
                  Host
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => onRemove(p.userId)}
                  title="Remove from room"
                >
                  ✕
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}