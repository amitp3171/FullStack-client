// frontend/src/components/chatArea.jsx
import React, { useEffect, useRef } from "react";
import "../styles/chatArea.css";

const ChatArea = ({ messages }) => {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-area">
      {messages.map((msg, i) => {
        if (msg.typing) {
          return (
            <div key={msg.id || i} className="bubble bot typing-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          );
        }
        return (
          <div key={i} className={`bubble ${msg.sender}`}>
            {msg.text}
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
};

export default ChatArea;
