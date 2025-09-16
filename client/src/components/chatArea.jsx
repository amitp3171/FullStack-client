// src/components/ChatArea.jsx
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
          return (
            <div key={i} className={`message ${msg.sender}`}>
              {/* ✅ Case 1: text message */}
              {msg.text && <div>{msg.text}</div>}

              {/* ✅ Case 2: query results */}
              {msg.rows && (
                <table className="results-table">
                  <thead>
                    <tr>
                      {Object.keys(msg.rows[0] || {}).map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {msg.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Object.values(row).map((val, colIndex) => (
                          <td key={colIndex}>{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* ✅ Case 3: run button for SQL queries */}
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

        {/* ✅ Case 4: typing indicator */}
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
