// src/components/InputBar.jsx
import React, { useState } from "react";
import "../styles/InputBar.css";

const InputBar = ({ onSend }) => {
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleSend = async () => {
    if (input.trim() || selectedFile) {
      onSend(input, selectedFile);
      setInput("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    console.log("Selected file:", file);
    if (file) {
      setSelectedFile(file);
    }
    event.target.value = "";
  };

  return (
    <footer className="input-bar">
      <input
        type="text"
        placeholder="How can I help?"
        className="chat-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        className="upload-btn"
        onClick={handleUploadClick}
        aria-label="Upload file"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 6V14"
            stroke="#000000ff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M6 10H14"
            stroke="#000000ff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {selectedFile && (
        <span className="file-preview">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ verticalAlign: "middle", marginRight: "4px" }}
          >
            <rect
              x="2"
              y="2"
              width="12"
              height="12"
              rx="2"
              stroke="#222"
              strokeWidth="1.5"
              fill="#fff"
            />
            <path
              d="M5 8H11"
              stroke="#222"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          {selectedFile.name}
        </span>
      )}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <button className="send-btn" onClick={handleSend}>
        Send
      </button>
    </footer>
  );
};

export default InputBar;
