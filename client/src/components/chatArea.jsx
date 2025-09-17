import React from "react";
import "../styles/ChatArea.css";

const isSqlQuery = (text) => {
  const lowered = text.trim().toLowerCase();
  const cleaned = lowered.replace(/```sql|```/g, "").trim();
  return (
    cleaned.startsWith("select") ||
    cleaned.startsWith("update") ||
    cleaned.startsWith("delete") ||
    cleaned.startsWith("insert")
  );
};

const ChatArea = ({ messages, onRunQuery, isLoading }) => (
  <div className="chat-area">
    {messages.length === 0 ? (
      <p className="placeholder-text">
        Conversation with database will appear here.
      </p>
    ) : (
      <div className="messages">
        {messages.map((msg, i) => {
          const cleanedText = msg.text
            ? msg.text.replace(/```sql|```/g, "").trim()
            : "";

          const rows = Array.isArray(msg.rows) ? msg.rows : [];
          const cols = rows.length ? Object.keys(rows[0] ?? {}) : [];

          return (
            <div key={i} className={`message ${msg.sender}`}>
              {/* If there's a downloadable file, show a clean inline link */}
              {msg.download ? (
                <div className="download-inline">
                  Your file is ready,{" "}
                  <a
                    className="file-link"
                    href={msg.download.url}
                    download={msg.download.filename}
                  >
                    {msg.download.filename}
                  </a>
                  .
                </div>
              ) : (
                // Otherwise show normal text
                msg.text && <div className="message-text">{msg.text}</div>
              )}

              {/* Query results table */}
              {rows.length > 0 && (
                <table className="results-table">
                  <thead>
                    <tr>
                      {cols.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, ri) => (
                      <tr key={ri}>
                        {cols.map((c, ci) => (
                          <td key={ci}>{String(r[c])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Run button for SQL-looking bot responses */}
              {msg.sender === "bot" &&
                msg.text &&
                isSqlQuery(msg.text) &&
                onRunQuery && (
                  <button
                    className="run-query-btn"
                    onClick={() => onRunQuery(cleanedText)}
                  >
                    Run
                  </button>
                )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div className="message bot typing">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
      </div>
    )}
  </div>
);

export default ChatArea;
