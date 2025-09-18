// frontend/src/components/ChatArea.jsx
import React, { useState } from "react";
import "../styles/ChatArea.css";

const isSqlQuery = (text) => {
  if (!text) return false;
  const lowered = text.trim().toLowerCase();
  const cleaned = lowered.replace(/```sql|```/g, "").trim();
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

        return (
          <div
            key={i}
            className={`chat-bubble ${isUser ? "user-bubble" : "bot-bubble"}`}
          >
            {/* === User Messages === */}
            {isUser && <div>{msg.text}</div>}

            {/* === Bot Messages (SQL or normal) === */}
            {isBot && (
              <div>
                {/* SQL Queries */}
                {msg.text && isSqlQuery(msg.text) && editingIndex !== i && (
                  <>
                    <div>{msg.text.replace(/```sql|```/g, "").trim()}</div>
                    {msg.edited && (
                      <div className="edited-label">(edited)</div>
                    )}
                    <div className="query-actions">
                      <button
                        className="run-query-btn"
                        onClick={() =>
                          onRunQuery(
                            msg.text.replace(/```sql|```/g, "").trim()
                          )
                        }
                      >
                        Run
                      </button>
                      <button
                        className="edit-query-btn"
                        onClick={() => {
                          setEditingIndex(i);
                          setEditValue(
                            msg.text.replace(/```sql|```/g, "").trim()
                          );
                        }}
                      >
                        Edit SQL
                      </button>
                    </div>
                  </>
                )}

                {/* Editing Mode */}
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
                          onConfirmEdit(editValue, i);
                          setEditingIndex(null);
                        }}
                      >
                        Save Query
                      </button>
                    </div>
                  </div>
                )}

                {/* Normal Bot Text */}
                {msg.text &&
                  !isSqlQuery(msg.text) &&
                  editingIndex !== i && <div>{msg.text}</div>}

                {/* SQL Results */}
                {msg.rows && msg.rows.length > 0 && (
                  <div className="sql-result">
                    <table>
                      <thead>
                        <tr>
                          {Object.keys(msg.rows[0]).map((col) => (
                            <th key={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.rows.map((row, rIndex) => (
                          <tr key={rIndex}>
                            {Object.values(row).map((val, cIndex) => (
                              <td key={cIndex}>{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* No Results */}
                {msg.rows && msg.rows.length === 0 && (
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
