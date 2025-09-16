// src/components/InputBar.jsx
import React, { useState } from "react";
import "../styles/InputBar.css";

const InputBar = ({ onSend }) => {
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null); // File | {type:'history', id, name} | null
  const fileInputRef = useRef(null);

  const handleSend = async () => {
    if (input.trim() || selectedFile) {
      onSend(input, selectedFile);
      setInput("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  // --- Upload menu handlers ---
  const handleUploadClick = () => setShowUploadMenu((v) => !v);

  const pickFromComputer = () => {
    setShowUploadMenu(false);
    fileInputRef.current?.click();
  };

  const pickFromHistory = async () => {
    setShowUploadMenu(false);
    setShowHistoryModal(true);
    if (history.length === 0 && !loadingHistory) {
      try {
        setLoadingHistory(true);
        setHistoryError("");
        const res = await fetch(HISTORY_ENDPOINT);
        if (!res.ok) throw new Error(`History fetch failed: ${res.status}`);
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : data.items || []);
      } catch (err) {
        console.error(err);
        setHistory([]);
        setHistoryError("Could not load history.");
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  // Close popover on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUploadMenu(false);
      }
    };
    if (showUploadMenu) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showUploadMenu]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) setSelectedFile(file);
    event.target.value = ""; // allow re-selecting same file
  };

  const attachHistoryItem = (item) => {
    setSelectedFile({ type: "history", id: item.id, name: item.name });
    setShowHistoryModal(false);
  };

  const clearAttachment = () => setSelectedFile(null);

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

      {/* Upload button + popover */}
      <div className="upload-wrapper" ref={menuRef}>
        <button
          className="upload-btn"
          onClick={handleUploadClick}
          aria-haspopup="menu"
          aria-expanded={showUploadMenu}
          aria-label="Attach"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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

        {showUploadMenu && (
          <div className="upload-menu" role="menu">
            <button className="upload-menu-item" onClick={pickFromComputer}>
              Upload from computer
            </button>
            <button className="upload-menu-item" onClick={pickFromHistory}>
              Choose from history
            </button>
          </div>
        )}
      </div>

      {/* Selected attachment pill */}
      {selectedFile && (
        <span
          className="file-preview"
          title={
            selectedFile.name ||
            (selectedFile.type === "history" ? "History file" : "")
          }
        >
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
          {selectedFile.name ||
            (selectedFile.type === "history"
              ? "Chosen from history"
              : "Attachment")}
          <button
            className="clear-attachment"
            onClick={clearAttachment}
            aria-label="Remove attachment"
          >
            ×
          </button>
        </span>
      )}

      {/* Hidden <input type=file> */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <button className="send-btn" onClick={handleSend}>
        Send
      </button>

      {/* History modal */}
      {showHistoryModal && (
        <div
          className="history-backdrop"
          onClick={() => setShowHistoryModal(false)}
        >
          <div className="history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="history-header">
              <h3>Choose a file from history</h3>
              <button
                className="history-close"
                onClick={() => setShowHistoryModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {loadingHistory ? (
              <div className="history-loading">Loading…</div>
            ) : historyError ? (
              <div className="history-empty">{historyError}</div>
            ) : history.length === 0 ? (
              <div className="history-empty">No files found.</div>
            ) : (
              <ul className="history-list">
                {history.map((item) => (
                  <li key={item.id} className="history-item">
                    <div className="history-meta">
                      <div className="history-name">{item.name}</div>
                      {item.size != null && (
                        <div className="history-size">
                          {(item.size / 1024).toFixed(1)} KB
                        </div>
                      )}
                      {item.uploadedAt && (
                        <div className="history-date">
                          {new Date(item.uploadedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <button
                      className="pick-btn"
                      onClick={() => attachHistoryItem(item)}
                    >
                      Attach
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </footer>
  );
};

export default InputBar;
