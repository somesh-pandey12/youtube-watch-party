import { useEffect, useRef, useState } from "react";

export default function Chat({ messages, onSend }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSend() {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }

  return (
    <div className="chat-panel">
      <div className="section-title">Chat</div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div className="chat-message" key={i}>
            <span className="chat-user">{m.username}:</span>
            <span>{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Say something..."
          maxLength={300}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}