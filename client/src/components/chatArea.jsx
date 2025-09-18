import React, { useState } from "react";
import "../styles/ChatArea.css";

const isSqlQuery = (text) => {
  if (!text) return false;
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/```sql|```/g, "")
    .trim();
  return (
    cleaned.startsWith("select") ||
    cleaned.startsWith("update") ||
    cleaned.startsWith("delete") ||
    cleaned.startsWith("insert") ||
    cleaned.startsWith("with")
  );
};

const ChatArea = ({ messages, onRunQuery, onConfirmEdit, isLoading }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");

  return (
    <div className="chat-area">
      {messages.map((msg, i) => {
        const isUser = msg.sender === "user";
        const isBot = msg.sender === "bot";

        const hasRows = Array.isArray(msg.rows) && msg.rows.length > 0;
        const cols = hasRows ? Object.keys(msg.rows[0]) : [];

        const sqlLike = !!msg.text && isSqlQuery(msg.text);
        const cleanedSql = sqlLike
          ? msg.text.replace(/```sql|```/g, "").trim()
          : "";

        return (
          <div
            key={i}
            className={`chat-bubble ${isUser ? "user-bubble" : "bot-bubble"}`}
          >
            {/* === User message === */}
            {isUser && <div>{msg.text}</div>}

            {/* === Bot message === */}
            {isBot && (
              <div>
                {/* If there's a downloadable file, show inline link & skip extra text */}
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
                  <>
                    {/* SQL view (read-only) */}
                    {sqlLike && editingIndex !== i && (
                      <>
                        <div>{cleanedSql}</div>
                        {msg.edited && (
                          <div className="edited-label">(edited)</div>
                        )}
                        <div className="query-actions">
                          <button
                            className="run-query-btn"
                            onClick={() => onRunQuery?.(cleanedSql)}
                          >
                            Run
                          </button>
                          <button
                            className="edit-query-btn"
                            onClick={() => {
                              setEditingIndex(i);
                              setEditValue(cleanedSql);
                            }}
                          >
                            Edit SQL
                          </button>
                        </div>
                      </>
                    )}

                    {/* SQL editing mode */}
                    {editingIndex === i && (
                      <div>
                        <textarea
                          className="sql-editor"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={5}
                        />
                        <div className="modal-actions">
                          <button onClick={() => setEditingIndex(null)}>
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              onConfirmEdit?.(editValue, i);
                              setEditingIndex(null);
                            }}
                          >
                            Save Query
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Normal bot text */}
                    {msg.text && !sqlLike && editingIndex !== i && (
                      <div className="message-text">{msg.text}</div>
                    )}
                  </>
                )}

                {/* SQL results */}
                {hasRows && (
                  <div className="sql-result">
                    <table>
                      <thead>
                        <tr>
                          {cols.map((c) => (
                            <th key={c}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {cols.map((c, cIdx) => (
                              <td key={cIdx}>{String(row[c])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* No results */}
                {Array.isArray(msg.rows) && msg.rows.length === 0 && (
                  <div className="sql-result">No results returned.</div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Typing indicator */}
      {isLoading && (
        <div className="chat-bubble bot-bubble typing">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
      )}
    </div>
  );
};

export default ChatArea;
