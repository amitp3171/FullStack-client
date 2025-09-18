import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar.jsx";
import SuggestionCards from "./components/SuggestionCards.jsx";
import ChatArea from "./components/chatArea.jsx";
import InputBar from "./components/inputBar.jsx";
import SideMenu from "./components/SideMenu.jsx";
import "./styles/App.css";

const API_BASE = import.meta.env.VITE_API_BASE;

// Try to pull SQL out of a model response
const extractSql = (s = "") => {
  if (!s) return "";
  // Prefer fenced ```sql blocks
  const fenced = s.match(/```sql([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  // Fallback: first SQL-ish keyword onward
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
  const [selectedFile, setSelectedFile] = useState(null); // Moved from InputBar

  // Changed: Fetch upload history from backend instead of localStorage
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
 // Send text message       
      } else {
        response = await fetch(`${API_BASE}/chat/flow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, message: text }),
        });
      }

      const result = await response.json();
      if (result.threadId && result.threadId !== threadId)
        setThreadId(result.threadId);

      // ---- A) Download reply (keep as-is) ----
      if (result.download) {
        const href = new URL(result.download.url, API_BASE).href; // normalize to absolute
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            download: { url: href, filename: result.download.filename },
          },
        ]);
      } else {
        // ---- B) Auto-run if reply looks like SQL ----
        const openaiText = result.openai || result.aiText || "";
        const sql = extractSql(openaiText);

        if (sql) {
          // Immediately run the SQL and show table
          const runRes = await fetch(`${API_BASE}/query/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: sql }),
          });
          const runJson = await runRes.json();

          if (Array.isArray(runJson.rows)) {
            setMessages((prev) => [
              ...prev,
              { sender: "bot", rows: runJson.rows },
            ]);
          } else if (runJson.error) {
            setMessages((prev) => [
              ...prev,
              { sender: "bot", text: `Error running query: ${runJson.error}` },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              { sender: "bot", text: "No rows returned." },
            ]);
          }
        } else if (openaiText) {
          // Not SQL → show normal assistant message
          setMessages((prev) => [...prev, { sender: "bot", text: openaiText }]);
        }
      }

      // Upload history (unchanged)
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

  // ... rest of your code remains the same ...
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
    // When a history item is selected, fetch it and set it as the selected file.
    if (!item.id) {
      console.error("History item has no ID to download.", item);
      appendBot("Error: Cannot use this history item as it has no ID.");
return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/history/download/${item.id}`);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const blob = await response.blob();
      const file = new File([blob], item.name, { type: item.mimeType });

      // Set the fetched file as the currently selected file
      setSelectedFile(file);

    } catch (error) {
      console.error("Failed to use file from history:", error);
      appendBot(`Error using file from history: ${error.message}`);
    } finally {
      setIsLoading(false);
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
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
      />
    </div>
  );
};

export default App;
