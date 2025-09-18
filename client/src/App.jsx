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
  const [isLoading, setIsLoading] = useState(false);

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
      // Ignore write errors
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
          setMessages(data);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    }
    loadMessages();
  }, [threadId]);

  // Handle sending user messages or file uploads
  const handleSendMessage = async (text, file) => {
    if (!text?.trim() && !file) return;
    if (text?.trim()) appendUser(text);
    setHasUserInteracted(true);

    try {
      setIsLoading(true);
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

      if (result.threadId && result.threadId !== threadId) {
        setThreadId(result.threadId);
      }

      // Append EXACTLY ONE bot message
      if (result.download) {
        // Make sure the link is absolute (works even if server returned a relative path)
        const href = new URL(result.download.url, API_BASE).href;

        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            // ChatArea shows the inline link when `download` exists, so text is optional
            download: { url: href, filename: result.download.filename },
          },
        ]);
      } else if (result.openai) {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: result.openai },
        ]);
      }

      // Save successful uploads to history
      if (file && response.ok) {
        const newItem = {
          id: result.fileId || String(Date.now()),
          name: file.name,
          size: file.size,
          updatedAt: new Date().toISOString(),
          threadId: result.threadId ?? null,
        };
        saveHistory([newItem, ...uploadHistory].slice(0, 20));
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
    } else {
      appendBot(`Selected **${item.name}** from history.`);
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
