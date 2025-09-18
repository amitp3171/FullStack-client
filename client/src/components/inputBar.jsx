//frontend/src/components/inputBar.jsx
import React, { useState, useRef, useEffect } from "react";
import "../styles/InputBar.css";

const InputBar = ({
  onSend,
  history = [], // Now expects: [{ id, name, size?, updatedAt?, threadId?, preview? }]
  onSelectHistory, // (item) => void
  accept = ".db,.sqlite,.sql,.csv,.json,.xlsx,.xls",
  selectedFile, // New prop
  onFileSelect, // New prop
}) => {
  const [input, setInput] = useState("");
  // const [selectedFile, setSelectedFile] = useState(null); // Removed, now a prop
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  const handleSend = () => {
    if (input.trim() || selectedFile) {
      onSend?.(input, selectedFile);
      setInput("");
      // onFileSelect(null); // Clearing is handled by App component after send
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  const handlePickFromComputer = () => {
    setMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) onFileSelect(file); // Use prop setter
    // allow selecting same file again later
    event.target.value = "";
  };

  const handleChooseFromHistory = () => {
    setMenuOpen(false);
    setShowHistory(true);
  };

  // close the menu when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  return (
    <>
      <footer className="input-bar">
        <input
          type="text"
          placeholder="How can I help?"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* Upload dropdown inside the bar */}
        <div className="upload-wrap" ref={menuRef}>
          <button
            className="upload-btn" // ⬅️ back to .upload-btn, styled as round
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Upload options"
            title="Upload options"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 6V14"
                stroke="#000"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M6 10H14"
                stroke="#000"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {menuOpen && (
            <div className="upload-menu" role="menu">
              <button
                className="upload-menu-item"
                role="menuitem"
                onClick={handlePickFromComputer}
              >
                📁 Pick from computer
              </button>
              <button
                className="upload-menu-item"
                role="menuitem"
                onClick={handleChooseFromHistory}
                disabled={history.length === 0}
                title={
                  history.length === 0
                    ? "No history yet"
                    : "Choose from history"
                }
              >
                🕘 Choose from history
              </button>
            </div>
          )}
        </div>

        {selectedFile && (
          <span className="file-preview" title={selectedFile.name}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ verticalAlign: "middle", marginRight: 4 }}
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
          accept={accept}
        />

        <button className="send-btn" onClick={handleSend}>
          Send
        </button>
      </footer>

      {/* Simple history modal */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Recent uploads</h3>
              <button
                className="icon-btn"
                onClick={() => setShowHistory(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {history.length === 0 ? (
              <p className="muted">No items yet.</p>
            ) : (
              <ul className="history-list">
                {history.map((item) => (
                  <li key={item.id} className="history-row">
                    <div className="history-meta">
                      <div className="history-name">{item.name}</div>
                      <div className="history-sub">
                        {item.size
                          ? `${(item.size / 1024).toFixed(1)} KB • `
                          : ""}
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleString()
                          : ""}
                        {item.preview && ` • ${item.preview}`}
                      </div>
                    </div>
                    <button
                      className="btn btn-small"
                      onClick={() => {
                        onSelectHistory?.(item);
                        setShowHistory(false);
                      }}
                    >
                      Use
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default InputBar;