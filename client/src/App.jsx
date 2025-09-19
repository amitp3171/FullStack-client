// frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import SuggestionCards from "./components/SuggestionCards.jsx";
import ChatArea from "./components/ChatArea.jsx";
import InputBar from "./components/InputBar.jsx";
import SideMenu from "./components/SideMenu.jsx";
import "./styles/App.css";

const API_BASE = import.meta.env.VITE_API_BASE;

/* -------------------------------
   ChatPage: a single conversation
--------------------------------- */
function ChatPage({ initialThreadId }) {
  const { threadId: routeThreadId } = useParams(); // from /c/:threadId
  const navigate = useNavigate();

  // State
  const [threadId, setThreadId] = useState(routeThreadId || initialThreadId);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Upload + chat history
  const [uploadHistory, setUploadHistory] = useState([]);
  const [chatList, setChatList] = useState([]);

  // Sidebar vs history modal are separate now
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);

  /* -------------------------------
     Load upload history on mount
  --------------------------------- */
  useEffect(() => {
    async function loadUploadHistory() {
      try {
        const res = await fetch(`${API_BASE}/history/uploads`);
        if (res.ok) setUploadHistory(await res.json());
      } catch (err) {
        console.error("Failed to load upload history:", err);
      }
    }
    loadUploadHistory();
  }, []);

  /* -------------------------------
     Load messages when threadId changes
  --------------------------------- */
  useEffect(() => {
    if (!threadId) return;
    async function loadMessages() {
      try {
        const res = await fetch(`${API_BASE}/messages/${threadId}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setMessages(data);
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    }
    loadMessages();
  }, [threadId]);

  /* -------------------------------
     Helpers to append messages
  --------------------------------- */
  const appendBot = (text) =>
    setMessages((prev) => [...prev, { sender: "bot", text }]);
  const appendUser = (text) =>
    setMessages((prev) => [...prev, { sender: "user", text }]);

  /* -------------------------------
     Send message or upload
  --------------------------------- */
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

      if (result.openai) appendBot(result.openai);

      if (result.threadId && result.threadId !== threadId) {
        setThreadId(result.threadId);
        navigate(`/c/${result.threadId}`); // update URL!
      }

      if (file) setSelectedFile(null);

      // refresh upload history
      if (file && response.ok) {
        try {
          const res = await fetch(`${API_BASE}/history/uploads`);
          if (res.ok) setUploadHistory(await res.json());
        } catch (err) {
          console.error("Failed to refresh upload history:", err);
        }
      }
    } catch (err) {
      appendBot(`Error: Could not get response. (${err.message})`);
    } finally {
      setIsLoading(false);
    }
  };

  /* -------------------------------
     Run SQL query
  --------------------------------- */
  const handleRunQuery = async (sql, edited = false) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/query/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql, threadId, edited }),
      });
      const result = await res.json();

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

  /* -------------------------------
     Confirm SQL edit
  --------------------------------- */
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
      } catch (err) {
        console.error("Failed to update message:", err);
      }
    };
    updateMessageInDB();
  };

  /* -------------------------------
     Select file from history
  --------------------------------- */
  const handleSelectHistory = async (item) => {
    if (!item.id) {
      appendBot("Error: Cannot use this history item (missing ID).");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/history/download/${item.id}`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], item.name, { type: item.mimeType });
      setSelectedFile(file);
    } catch (err) {
      appendBot(`Error using file from history: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /* -------------------------------
     Load chat list
  --------------------------------- */
  const loadChatList = async () => {
    try {
      const res = await fetch(`${API_BASE}/chats`);
      if (res.ok) setChatList(await res.json());
    } catch (err) {
      console.error("Failed to load chats:", err);
    }
  };

  /* -------------------------------
     Open a past chat
  --------------------------------- */
  const handleOpenChat = async (chat) => {
    try {
      const res = await fetch(`${API_BASE}/messages/${chat.threadId}`);
      if (res.ok) {
        const msgs = await res.json();
        setMessages(msgs);
        setThreadId(chat.threadId);
        navigate(`/c/${chat.threadId}`); // update URL!
        setShowChatHistory(false);
      }
    } catch (err) {
      console.error("Failed to load chat:", err);
    }
  };

  /* -------------------------------
     Start new chat
  --------------------------------- */
  const handleNewChat = () => {
    setThreadId(null);
    setMessages([]);
    setHasUserInteracted(false);
    navigate("/"); // back to new chat route
  };

  /* -------------------------------
     Render
  --------------------------------- */
  return (
    <div className="app-container">
      <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} onNewChat={handleNewChat} />

      <SideMenu
        open={menuOpen}
        onToggle={() => setMenuOpen(!menuOpen)}
        onOpenHistory={() => {
          loadChatList();
          setShowChatHistory(true);
        }}
      />

      <div className="main-section">
        {!hasUserInteracted && !threadId && (
          <div className="suggestion-overlay">
            <SuggestionCards onSuggestionClick={(text) => handleSendMessage(text, null)} />
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
                      <div className="history-sub">{new Date(chat.updatedAt).toLocaleString()}</div>
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
}

/* -------------------------------
   Top-level App: just routes
--------------------------------- */
const App = () => {
  return (
    <Routes>
      <Route path="/" element={<ChatPage initialThreadId={null} />} />
      <Route path="/c/:threadId" element={<ChatPage />} />
    </Routes>
  );
};

export default App;
