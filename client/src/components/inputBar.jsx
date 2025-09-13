// src/components/InputBar.jsx
import React, { useState } from 'react';
import '../styles/inputBar.css';

const InputBar = ({ onSend }) => {
  const [input, setInput] = useState("");
  const fileInputRef = React.useRef(null);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput(""); // clear after sending
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
    if (file) {
      // Handle the uploaded file here
      console.log('File uploaded:', file);
          // You can process, upload, or send the file from here
    }
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
      <button className="upload-btn" onClick={handleUploadClick} aria-label="Upload file">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 6V14" stroke="#000000ff" strokeWidth="2" strokeLinecap="round"/>
            <path d="M6 10H14" stroke="#000000ff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
      </button>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button className="send-btn" onClick={handleSend}>Send</button>
    </footer>
  );
};

export default InputBar;
