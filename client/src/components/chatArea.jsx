// src/components/ChatArea.jsx
import React from "react";
import "../styles/chatArea.css";

const ChatArea = ({ messages }) => (
  <div className="chat-area">
    {messages.length === 0 ? (
      <p className="placeholder-text">
        Conversation with database will appear here.
      </p>
    ) : (
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default ChatArea;
