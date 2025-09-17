// frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar.jsx";
import SuggestionCards from "./components/SuggestionCards.jsx";
import ChatArea from "./components/chatArea.jsx";
import InputBar from "./components/InputBar.jsx";
import SideMenu from "./components/SideMenu.jsx";
import "./styles/App.css";

const API_BASE = import.meta.env.VITE_API_BASE;

const App = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // loading state

  // simple upload history (persisted)
  const [uploadHistory, setUploadHistory] = useState(() => {
    try {
      const raw = localStorage.getItem("uploadHistory");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const saveHistory = (arr) => {
    setUploadHistory(arr);
    try {
      localStorage.setItem("uploadHistory", JSON.stringify(arr));
    } catch {
      // ignore write errors
    }
  };

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
          setMessages(data); // only overwrite if DB actually has messages
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    }
    loadMessages();
  }, [threadId]);
  // Function to handle sending messages (with optional file)
  const handleSendMessage = async (text, file) => {
    if (!text?.trim() && !file) return;
    if (text?.trim()) appendUser(text);
    setHasUserInteracted(true);

    try {
      setIsLoading(true); // ✅ start loader
      let response;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        if (text?.trim()) formData.append("prompt", text);
        if (threadId) formData.append("threadId", threadId);

        response = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch(`${API_BASE}/chat/flow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, message: text }),
        });
      }

      const result = await response.json();

      if (result.threadId) setThreadId(result.threadId);

      // If backend returned a downloadable file, push a message that includes it
      if (result.download) {
        // Build an absolute URL so it hits the API host/port, not the UI host/port
        const apiOrigin = new URL(API_BASE).origin; // e.g. "http://localhost:3000"
        const href = result.download.url.startsWith("http")
          ? result.download.url
          : `${apiOrigin}${result.download.url}`; // "/api/db/download/ID"
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: result.openai || "Your file is ready.",
            download: {
              url: href, // <-- absolute URL from server
              filename: result.download.filename,
            },
          },
        ]);
      } else if (result.openai) {
        appendBot(result.openai);
      }

      // stash successful uploads in history
      if (file && response.ok) {
        const newItem = {
          id: result.fileId || `${Date.now()}`,
          name: file.name,
          size: file.size,
          updatedAt: new Date().toISOString(),
          threadId: result.threadId || null,
        };
        saveHistory([newItem, ...uploadHistory].slice(0, 20));
      }
    } catch (error) {
      console.error("Chat error:", error);
      appendBot(`Error: Could not get response. (${error.message})`);
    } finally {
      setIsLoading(false); // stop loader
    }
  };

  // Run SQL
  const handleRunQuery = async (sql) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/query/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql }),
      });
      const result = await response.json();

      if (result.rows) {
        setMessages((prev) => [...prev, { sender: "bot", rows: result.rows }]);
      } else if (result.error) {
        appendBot("Error running query: " + result.error);
      }
    } catch (err) {
      appendBot("Error running query: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // History selection
  const handleSelectHistory = async (item) => {
    if (item.threadId) {
      setThreadId(item.threadId);
      appendBot(`Loaded context from **${item.name}**.`);
    } else {
      appendBot(`Selected **${item.name}** from history.`);
      // optionally call backend to attach file context here
    }
  };

  return (
    <div className="app-container">
      <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />

      {menuOpen && (
        <div
          className={`side-overlay ${menuOpen ? "show" : ""}`}
          onClick={() => setMenuOpen(false)}
        />
      )}

      <SideMenu open={menuOpen} onToggle={() => setMenuOpen(!menuOpen)} />

      <div className="main-section">
        {!hasUserInteracted && (
          <div className="suggestion-overlay">
            {/* Suggestions visible until first interaction */}
            <SuggestionCards
              onSuggestionClick={(text) => handleSendMessage(text, null)}
            />
          </div>
        )}

        <ChatArea
          messages={messages}
          onRunQuery={handleRunQuery}
          isLoading={isLoading} // ✅ shows typing dots
        />
      </div>

      <InputBar
        onSend={handleSendMessage}
        history={uploadHistory}
        onSelectHistory={handleSelectHistory}
        isLoading={isLoading} // ✅ disables + spinner on Send
      />
    </div>
  );
};

export default App;
