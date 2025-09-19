// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import SuggestionCards from './components/SuggestionCards.jsx';
import ChatArea from './components/ChatArea.jsx';
import InputBar from './components/InputBar.jsx';
import SideMenu from './components/SideMenu.jsx';
import AuthForm from './components/AuthForm.jsx'; // ✅ new auth form
import './styles/App.css';

const API_BASE = import.meta.env.VITE_API_BASE;

const App = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Upload + chat history
  const [uploadHistory, setUploadHistory] = useState([]);
  const [chatList, setChatList] = useState([]);
  const [showChatHistory, setShowChatHistory] = useState(false);

  // --- Auth state ---
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("username");
    return saved ? { username: saved } : null;
  });

  // === Restore threadId from sessionStorage on load ===
  useEffect(() => {
    const savedThread = sessionStorage.getItem("activeThreadId");
    if (savedThread) {
      setThreadId(savedThread);
    }
  }, []);

  // === Persist threadId to sessionStorage ===
  useEffect(() => {
    if (threadId) {
      sessionStorage.setItem("activeThreadId", threadId);
    }
  }, [threadId]);

  // === Load upload history ===
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

  // === Append helpers ===
  const appendBot = (text) =>
    setMessages((prev) => [...prev, { sender: "bot", text }]);
  const appendUser = (text) =>
    setMessages((prev) => [...prev, { sender: "user", text }]);

  // === Load messages when threadId changes ===
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

  // === Load chat list ===
  const loadChatList = async () => {
    try {
      const res = await fetch(`${API_BASE}/chats`);
      if (res.ok) {
        const data = await res.json();
        setChatList(data);
      }
    } catch (err) {
      console.error("Failed to load chats:", err);
    }
  };

  // === Handle send ===
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
          body: JSON.stringify({
            threadId,
            message: text,
          }),
        });
      }

      const result = await response.json();

      if (result.openai) appendBot(result.openai);
      if (result.threadId) setThreadId(result.threadId);

      if (file) setSelectedFile(null);

      // refresh upload history
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

  // === Run query ===
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

  // === Confirm SQL edit ===
  const handleConfirmEdit = (editedQuery, index) => {
    setMessages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: editedQuery, edited: true };
      return updated;
    });

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

  // === Select file from history ===
  const handleSelectHistory = async (item) => {
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
      setSelectedFile(file);
    } catch (error) {
      console.error("Failed to use file from history:", error);
      appendBot(`Error using file from history: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // === Open chat from history ===
  const handleOpenChat = async (chat) => {
    try {
      const res = await fetch(`${API_BASE}/messages/${chat.threadId}`);
      if (res.ok) {
        const msgs = await res.json();
        setMessages(msgs);
        setThreadId(chat.threadId);
        setShowChatHistory(false);
      }
    } catch (err) {
      console.error("Failed to load chat:", err);
    }
  };

  // === New chat ===
  const handleNewChat = () => {
    sessionStorage.removeItem("activeThreadId");
    setThreadId(null);
    setMessages([]);
    setHasUserInteracted(false);
  };

  // === Logout ===
  const handleLogout = async () => {
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    }
    localStorage.clear();
    setUser(null);
  };

  // === If not logged in, show AuthForm ===
  if (!user) {
    return <AuthForm onAuthSuccess={(data) => setUser(data)} />;
  }

  return (
    <div className="app-container">
      <Navbar 
        onMenuToggle={() => setMenuOpen(!menuOpen)} 
        onNewChat={handleNewChat}
      />

      <SideMenu
        open={menuOpen}
        onToggle={() => setMenuOpen(!menuOpen)}
        onOpenHistory={() => {
          loadChatList();
          setShowChatHistory(true);
        }}
        onLogout={() => handleLogout()}
      />

      <div className="main-section">
        {!hasUserInteracted && !threadId && (
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

      {/* Chat history modal */}
      {showChatHistory && (
        <div className="modal-overlay" onClick={() => setShowChatHistory(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Past Chats</h3>
              <button className="icon-btn" onClick={() => setShowChatHistory(false)}>✕</button>
            </div>
            {chatList.length === 0 ? (
              <p className="muted">No chats yet.</p>
            ) : (
              <ul className="history-list">
                {chatList.map((chat) => (
                  <li key={chat._id} className="history-row">
                    <div className="history-meta">
                      <div className="history-name">{chat.title || "Untitled Chat"}</div>
                      <div className="history-sub">
                        {new Date(chat.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <button className="btn btn-small" onClick={() => handleOpenChat(chat)}>
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

    
    </div>
  );
};

export default App;
