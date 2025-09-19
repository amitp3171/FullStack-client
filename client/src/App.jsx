import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar.jsx";
import SuggestionCards from "./components/SuggestionCards.jsx";
import ChatArea from "./components/chatArea.jsx";
import InputBar from "./components/inputBar.jsx";
import SideMenu from "./components/SideMenu.jsx";
import "./styles/App.css";

const API_BASE = import.meta.env.VITE_API_BASE;

const isQuestion = (s = "") => {
  const t = s.trim().toLowerCase();
  if (!t) return false;
  if (t.endsWith("?")) return true;
  return /^(what|how|where|when|which|who|show|list|give|return|find|count|display|get)\b/.test(
    t
  );
};

const extractSql = (s = "") => {
  if (!s) return "";
  const fenced = s.match(/```sql([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const noFence = s.replace(/```/g, "").trim();
  const i = noFence
    .toLowerCase()
    .search(/\b(select|with|insert|update|delete)\b/);
  return i >= 0 ? noFence.slice(i).trim() : "";
};

const App = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch upload history from backend
  const [uploadHistory, setUploadHistory] = useState([]);

  // Load upload history from backend on component mount
  useEffect(() => {
    async function loadUploadHistory() {
      try {
        const res = await fetch(`${API_BASE}/history/uploads`);
        if (res.ok) {
          const data = await res.json();
          setUploadHistory(data);
        }
      } catch (error) {
        console.error("Failed to load upload history:", error);
      }
    }
    loadUploadHistory();
  }, []);

  const appendBot = (text) =>
    setMessages((prev) => [...prev, { sender: "bot", text }]);

  const appendUser = (text) =>
    setMessages((prev) => [...prev, { sender: "user", text }]);

  // Load messages from backend when threadId changes
  useEffect(() => {
    if (!threadId) return;
    async function loadMessages() {
      try {
        const res = await fetch(`${API_BASE}/messages/${threadId}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    }
    loadMessages();
  }, [threadId]);

  // inside App component
  const handleSendMessage = async (text, file) => {
    if (!text?.trim() && !file) return;
    if (text?.trim()) appendUser(text);
    setHasUserInteracted(true);

    // helpers
    const stripSqlBlock = (s = "") =>
      s.replace(/```sql[\s\S]*?```/gi, "").trim();
    const looksLikeSchema =
      typeof text === "string" &&
      /Tables?:/i.test(text) &&
      /-\s*\w+/.test(text);
    const asksForDbFile =
      typeof text === "string" &&
      /\b(build|create|generate|make)\b.*\b(database|db|file)\b/i.test(text);

    try {
      setIsLoading(true);

      // ---------- FILE UPLOAD (unchanged) ----------
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        if (text?.trim()) formData.append("prompt", text);
        if (threadId) formData.append("threadId", threadId);

        const response = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (result.threadId) setThreadId(result.threadId);

        if (result.download) {
          const href = new URL(result.download.url, API_BASE).href;
          setMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              download: { url: href, filename: result.download.filename },
            },
          ]);
        } else if (result.openai) {
          setMessages((prev) => [
            ...prev,
            { sender: "bot", text: result.openai },
          ]);
        }

        // refresh upload history (optional)
        if (response.ok) {
          try {
            const res = await fetch(`${API_BASE}/history/uploads`);
            if (res.ok) setUploadHistory(await res.json());
          } catch {}
        }
        return;
      }

      // ---------- FAST-PATH: “build database file … Tables: …” ----------
      if (asksForDbFile && looksLikeSchema) {
        // let the backend generate SQL DDL + create a temp file and hand back /download/:id
        const response = await fetch(`${API_BASE}/chat/flow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, message: text }),
        });

        const result = await response.json();
        if (result.threadId) setThreadId(result.threadId);

        if (result.download) {
          const href = new URL(result.download.url, API_BASE).href;
          setMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              text: result.openai || "Your file is ready.",
              download: { url: href, filename: result.download.filename },
            },
          ]);
        } else if (result.openai || result.aiText) {
          setMessages((prev) => [
            ...prev,
            { sender: "bot", text: result.openai || result.aiText },
          ]);
        }
        return; // important: stop here so we don't run the classifier/sql flow
      }

      // ---------- INTENT CLASSIFY → QUESTION vs SQL REQUEST ----------
      // ask the classifier
      let label = "other";
      try {
        const clsRes = await fetch(`${API_BASE}/nlp/classify-intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        if (clsRes.ok) {
          const cls = await clsRes.json();
          label = cls.label; // "question" | "sql_request" | "other"
        }
      } catch {
        label = "sql_request"; // fallback
      }

      if (label === "question") {
        // Get a short explanation AND a clean SQL query
        const [expRes, genRes] = await Promise.all([
          fetch(`${API_BASE}/chat/flow`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threadId, message: text }),
          }),
          fetch(`${API_BASE}/sql/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: text }),
          }),
        ]);

        let explanation = "";
        try {
          const expJson = await expRes.json();
          if (expJson.threadId) setThreadId(expJson.threadId);
          const raw = expJson.openai || expJson.aiText || "";
          explanation =
            stripSqlBlock(raw) || "Here’s a query that answers your question.";
        } catch {}

        let sql = "";
        try {
          const genJson = await genRes.json();
          sql = (genJson.sql || "").trim();
        } catch {}

        if (explanation) {
          setMessages((prev) => [
            ...prev,
            { sender: "bot", text: explanation },
          ]);
        }
        if (sql) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              text: "```sql\n" + sql + "\n```",
              allowEdit: false,
            }, // Run-only
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { sender: "bot", text: "I couldn’t generate a query for that." },
          ]);
        }
      } else {
        // Not a question → generate SQL the user can Run + Edit
        const genRes = await fetch(`${API_BASE}/sql/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text }),
        });
        const genJson = await genRes.json();
        const sql = (genJson.sql || "").trim();

        if (sql) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              text: "```sql\n" + sql + "\n```",
              allowEdit: true,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { sender: "bot", text: "Sorry, I couldn’t generate SQL for that." },
          ]);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `Error: Could not get response. (${error.message})`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Run SQL query (normal or edited)
  // Run SQL query (normal or edited)
  const handleRunQuery = async (sql, edited = false) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/query/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql, threadId, edited }),
      });
      const result = await response.json();

      if (result.rows) {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", rows: result.rows, query: sql }, // <— keep SQL with rows
        ]);
      } else if (result.error) {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Error running query: " + result.error },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Error running query: " + err.message },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm SQL edit
  const handleConfirmEdit = (editedQuery, index) => {
    // 1. Update bot bubble
    setMessages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: editedQuery, edited: true };
      return updated;
    });

    // edit the "text" field of the bot message at "index" in the database
    const updateMessageInDB = async () => {
      try {
        await fetch(`${API_BASE}/messages/${messages[index]._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: editedQuery }),
        });
      } catch (error) {
        console.error("Failed to update message:", error);
      }
    };
    updateMessageInDB();
  };

  const handleSelectHistory = async (item) => {
    if (item.threadId) {
      setThreadId(item.threadId);
      appendBot(`Loaded context from **${item.name}**.`);

      // Optionally download and process the file if needed
      try {
        const response = await fetch(`${API_BASE}/history/download/${item.id}`);
        if (response.ok) {
          console.log("File downloaded from history:", item.name);
        }
      } catch (error) {
        console.error("Failed to download file:", error);
      }
    } else {
      appendBot(`Selected **${item.name}** from history.`);
    }
  };

  return (
    <div className="app-container">
      <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />

      {/* Always render the sidebar */}
      <SideMenu open={menuOpen} onToggle={() => setMenuOpen(!menuOpen)} />

      <div className="main-section">
        {!hasUserInteracted && (
          <div className="suggestion-overlay">
            <SuggestionCards
              onSuggestionClick={(text) => handleSendMessage(text, null)}
            />
          </div>
        )}

        <ChatArea
          messages={messages}
          onRunQuery={handleRunQuery}
          onConfirmEdit={handleConfirmEdit}
          isLoading={isLoading}
        />
      </div>

      <InputBar
        onSend={handleSendMessage}
        history={uploadHistory}
        onSelectHistory={handleSelectHistory}
        isLoading={isLoading}
      />
    </div>
  );
};

export default App;
