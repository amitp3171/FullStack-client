import React, { useState, useEffect, useRef } from "react";
import "../styles/ChatArea.css";

const API_BASE = import.meta.env.VITE_API_BASE;

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

// ---------- export helpers ----------
const fileTimestamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours()
  )}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

const rowsToCSV = (rows = []) => {
  if (!rows.length) return "";
  // union of all keys so we don't drop sparse columns
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
// ------------------------------------

// Remove a trailing top-level LIMIT (and optional OFFSET) if present
const stripTrailingLimit = (sql = "") =>
  sql.replace(/\blimit\s+\d+\s*(offset\s+\d+)?\s*;?\s*$/i, "").trim();

// Find the closest earlier SQL bubble (skip explanation bubbles)
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
  const [openExportFor, setOpenExportFor] = useState(null); // which message index has its export menu open
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

  // Re-run the query with no LIMIT and export the full result set
  const exportFull = async ({ sql, kind, fallbackRows }) => {
    try {
      if (!sql) {
        // no sql? fallback to visible rows
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
        // If your backend supports it, use this to bypass any server cap:
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
      // graceful fallback to current rows if the re-run fails
      console.error("Export full failed, falling back:", e);
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
        const canEdit = msg.allowEdit !== false; // <-- Run-only when false

        // Prefer SQL stored on the results message; else scan backward to find it
        const exportSql = msg.query || findNearestSqlBefore(messages, i);

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
                {/* Inline download link, if present */}
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
                    {/* SQL view */}
                    {sqlLike && editingIndex !== i && (
                      <>
                        <pre className="sql-block">{cleanedSql}</pre>
                        {msg.edited && (
                          <div className="edited-label">(edited)</div>
                        )}
                        <div className="query-actions">
                          <button
                            className="run-query-btn"
                            onClick={() => onRunQuery?.(cleanedSql)}
                            title="Run query"
                          >
                            <svg
                              className="btn-icon"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                d="M8 5v14l11-7-11-7z"
                                fill="currentColor"
                              />
                            </svg>
                            <span>Run</span>
                          </button>

                          {canEdit && (
                            <button
                              className="edit-query-btn"
                              onClick={() => {
                                setEditingIndex(i);
                                setEditValue(cleanedSql);
                              }}
                              title="Edit SQL"
                            >
                              <svg
                                className="btn-icon"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm14.71-9.04a1 1 0 0 0 0-1.41l-2.51-2.51a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.99-1.66z"
                                  fill="currentColor"
                                />
                              </svg>
                              <span>Edit</span>
                            </button>
                          )}
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

                {/* SQL results + export */}
                {hasRows && (
                  <div className="sql-result">
                    {/* toolbar */}
                    <div className="result-toolbar">
                      <div className="spacer" />
                      <div
                        className="export-wrap"
                        ref={exportWrapRef}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="export-btn"
                          aria-haspopup="menu"
                          aria-expanded={openExportFor === i}
                          onClick={() =>
                            setOpenExportFor((idx) => (idx === i ? null : i))
                          }
                          title="Export results"
                        >
                          Export
                          <svg
                            className="caret"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M7 10l5 5 5-5"
                              stroke="#111"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>

                        {openExportFor === i && (
                          <div className="export-menu" role="menu">
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
                            >
                              Export as JSON
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* table */}
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
