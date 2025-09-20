//src/components/ InputBar.jsx
import React, { useState, useRef, useEffect } from "react";
import "../styles/InputBar.css";

const InputBar = ({
  onSend,
  onQuickResult, // New prop for quick result
  history = [], // Array of { id, name, threadId..}
  onSelectHistory,
  accept = ".db,.sqlite,.sql,.csv,.json,.xlsx,.xls",
  selectedFile,
  onFileSelect,
}) => {
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  const handleSend = () => {
    if (input.trim() || selectedFile) {
      onSend?.(input, selectedFile);
      setInput("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleQuickResult = () => {
    if (input.trim() || selectedFile) {
      onQuickResult?.(input, selectedFile);
      setInput("");
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
    if (file) onFileSelect(file);
    event.target.value = "";
  };

  const handleChooseFromHistory = () => {
    setMenuOpen(false);
    setShowHistory(true);
  };

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

        {/* Upload dropdown */}
        <div className="upload-wrap" ref={menuRef}>
          <button
            className="upload-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Upload options"
            title="Upload options"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 6V14" stroke="#000" strokeWidth="2" strokeLinecap="round" />
              <path d="M6 10H14" stroke="#000" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {menuOpen && (
            <div className="upload-menu" role="menu">
              <button className="upload-menu-item" role="menuitem" onClick={handlePickFromComputer}>
                📁 Pick from computer
              </button>
              <button
                className="upload-menu-item"
                role="menuitem"
                onClick={handleChooseFromHistory}
                disabled={history.length === 0}
                title={history.length === 0 ? "No history yet" : "Choose from history"}
              >
                🕘 Choose from history
              </button>
            </div>
          )}
        </div>

        {selectedFile && (
          <span className="file-preview" title={selectedFile.name}>
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

        {/* Normal send */}
        <button className="send-btn" onClick={handleSend}>Send</button>

        {/* NEW Quick Result button */}
        <button className="quick-result-btn" onClick={handleQuickResult}>
          Quick Result
        </button>
      </footer>

      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Recent uploads</h3>
              <button className="icon-btn" onClick={() => setShowHistory(false)}>✕</button>
            </div>

            {history.length === 0 ? (
              <p className="muted">No items yet.</p>
            ) : (
              <ul className="history-list">
                {history.map((item) => (
                  <li key={item.id} className="history-row">
                    <div className="history-meta">
                      <div className="history-name">{item.name}</div>
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
