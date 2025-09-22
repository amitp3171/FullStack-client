// client/src/components/ChatArea.jsx
import React, { useState, useEffect, useRef } from "react";
import "../styles/chatArea.css";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/* ---------- tiny inline icons (SVG uses currentColor) ---------- */
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5l10 7-10 7V5z" fill="currentColor" />
  </svg>
);
const PencilIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
      fill="currentColor"
    />
  </svg>
);

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

/* export helpers (local-only) */
const fileTimestamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours()
  )}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

const rowsToCSV = (rows = []) => {
  if (!rows.length) return "";
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r || {}).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );

  const escape = (v) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") v = JSON.stringify(v);
    v = String(v);
    return `"${v.replace(/"/g, '""')}"`;
  };

  const lines = [];
  lines.push(headers.map(escape).join(","));
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row?.[h])).join(","));
  }
  return lines.join("\r\n");
};

const downloadBlob = (data, filename, type) => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const stripTrailingLimit = (sql = "") =>
  sql.replace(/\blimit\s+\d+\s*(offset\s+\d+)?\s*;?\s*$/i, "").trim();

const findNearestSqlBefore = (messages, idx) => {
  for (let j = idx - 1; j >= 0; j--) {
    const m = messages[j];
    if (m?.text && isSqlQuery(m.text)) {
      return m.text.replace(/```sql|```/g, "").trim();
    }
  }
  return null;
};

const ChatArea = ({ messages = [], onRunQuery, onConfirmEdit, isLoading }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [openExportFor, setOpenExportFor] = useState(null);
  const exportWrapRef = useRef(null);

  // close export menu on outside click or on Escape
  useEffect(() => {
    const onDocClick = (e) => {
      if (!exportWrapRef.current) return;
      if (!exportWrapRef.current.contains(e.target)) setOpenExportFor(null);
    };
    const onKey = (e) => e.key === "Escape" && setOpenExportFor(null);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleRunQueryWithFile = (sql, message) => {
    onRunQuery?.(sql, message._id, message.dbFileMessageId);
  };

  const exportFull = async ({ sql, kind, fallbackRows }) => {
    try {
      if (!sql) {
        const data =
          kind === "csv"
            ? rowsToCSV(fallbackRows)
            : JSON.stringify(fallbackRows ?? [], null, 2);
        const ext = kind === "csv" ? "csv" : "json";
        downloadBlob(
          data,
          `results-${fileTimestamp()}.${ext}`,
          kind === "csv"
            ? "text/csv;charset=utf-8"
            : "application/json;charset=utf-8"
        );
        return;
      }

      const sqlNoLimit = stripTrailingLimit(sql);

      const res = await fetch(`${API_BASE}/query/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sqlNoLimit, fullExport: true }),
      });
      const json = await res.json();

      const rows = Array.isArray(json.rows) ? json.rows : [];
      const data =
        kind === "csv" ? rowsToCSV(rows) : JSON.stringify(rows, null, 2);
      const ext = kind === "csv" ? "csv" : "json";
      downloadBlob(
        data,
        `results-${fileTimestamp()}.${ext}`,
        kind === "csv"
          ? "text/csv;charset=utf-8"
          : "application/json;charset=utf-8"
      );
    } catch (e) {
      const data =
        kind === "csv"
          ? rowsToCSV(fallbackRows || [])
          : JSON.stringify(fallbackRows || [], null, 2);
      const ext = kind === "csv" ? "csv" : "json";
      downloadBlob(
        data,
        `results-${fileTimestamp()}.${ext}`,
        kind === "csv"
          ? "text/csv;charset=utf-8"
          : "application/json;charset=utf-8"
      );
    } finally {
      setOpenExportFor(null);
    }
  };

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

        const exportSql = msg.query || findNearestSqlBefore(messages, i);

        return (
          <div
            key={i}
            className={`chat-bubble ${isUser ? "user-bubble" : "bot-bubble"}`}
          >
            {/* User bubble */}
            {isUser && <div>{msg.text}</div>}

            {/* Bot bubble */}
            {isBot && (
              <div>
                {/* Inline download link, if present */}
                {msg.download ? (
                  <div className="download-inline">
                    {msg.text ? (
                      <div className="message-text">
                        {msg.text.replace(/\*\*(.*?)\*\*/g, "$1")}
                      </div>
                    ) : (
                      <>
                        Your file is ready,{" "}
                        <a
                          className="file-link"
                          href={msg.download.url}
                          download={msg.download.filename}
                        >
                          {msg.download.filename}
                        </a>
                        .
                      </>
                    )}
                    {msg.text && (
                      <div style={{ marginTop: "10px" }}>
                        <a
                          className="file-link"
                          href={msg.download.url}
                          download={msg.download.filename}
                          style={{
                            display: "inline-block",
                            padding: "8px 16px",
                            backgroundColor: "#007bff",
                            color: "white",
                            textDecoration: "none",
                            borderRadius: "4px",
                            fontSize: "14px",
                          }}
                        >
                          Download {msg.download.filename}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* SQL (read-only) */}
                    {sqlLike && editingIndex !== i && (
                      <>
                        <div>{cleanedSql}</div>
                        {msg.edited && (
                          <div className="edited-label">(edited)</div>
                        )}

                        {/* tiny icon-only actions */}
                        <div className="query-actions">
                          <button
                            className="icon-btn"
                            aria-label="Run query"
                            title="Run"
                            onClick={() =>
                              handleRunQueryWithFile(cleanedSql, msg)
                            }
                          >
                            <PlayIcon />
                          </button>

                          <button
                            className="icon-btn"
                            aria-label="Edit SQL"
                            title="Edit SQL"
                            onClick={() => {
                              setEditingIndex(i);
                              setEditValue(cleanedSql);
                            }}
                          >
                            <PencilIcon />
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
                  <div className="sql-result" ref={exportWrapRef}>
                    <div
                      className="export-controls"
                      style={{ textAlign: "right", marginBottom: 8 }}
                    >
                      <button
                        className="export-toggle"
                        onClick={() =>
                          setOpenExportFor((v) => (v === i ? null : i))
                        }
                        aria-haspopup="menu"
                        aria-expanded={openExportFor === i}
                        aria-label="Export options"
                        title="Export options"
                      >
                        Export ▾
                      </button>
                      {openExportFor === i && (
                        <div
                          className="export-menu"
                          role="menu"
                          style={{ display: "inline-block", marginLeft: 8 }}
                        >
                          <button
                            className="export-item"
                            role="menuitem"
                            onClick={() =>
                              exportFull({
                                sql: exportSql,
                                kind: "csv",
                                fallbackRows: msg.rows,
                              })
                            }
                          >
                            Export as CSV
                          </button>
                          <button
                            className="export-item"
                            role="menuitem"
                            onClick={() =>
                              exportFull({
                                sql: exportSql,
                                kind: "json",
                                fallbackRows: msg.rows,
                              })
                            }
                            style={{ marginLeft: 8 }}
                          >
                            Export as JSON
                          </button>
                        </div>
                      )}
                    </div>

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

                {/* No results (explicit empty array) */}
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
