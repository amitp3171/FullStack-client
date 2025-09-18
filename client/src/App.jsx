import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import SuggestionCards from './components/SuggestionCards.jsx';
import ChatArea from './components/ChatArea.jsx';
import InputBar from './components/InputBar.jsx';
import SideMenu from './components/SideMenu.jsx';
import './styles/App.css';

const API_BASE = import.meta.env.VITE_API_BASE;

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
                // Upload file
        response = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          body: formData,
        });
 // Send text message       
      } else {
        // FIXED: Ensure we're sending the threadId for text messages too
        response = await fetch(`${API_BASE}/chat/flow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            threadId, // This is crucial - it maintains the context
            message: text 
          }),
        });
      }

      const result = await response.json();

      if (result.openai) appendBot(result.openai);
      if (result.threadId) setThreadId(result.threadId);

      // Clear the selected file after sending
      if (file) setSelectedFile(null);

      // Save successful uploads to history
      if (file && response.ok) {
        try {
          const res = await fetch(`${API_BASE}/history/uploads`);
          if (res.ok) {
            const data = await res.json();
            setUploadHistory(data);
          }
        } catch (error) {
          console.error("Failed to refresh upload history:", error);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      appendBot(`Error: Could not get response. (${error.message})`);
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