import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useParams, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import SuggestionCards from "./components/SuggestionCards.jsx";
import ChatArea from "./components/ChatArea.jsx";
import InputBar from "./components/InputBar.jsx";
import SideMenu from "./components/SideMenu.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import "./styles/App.css";

const API_BASE = import.meta.env.VITE_API_BASE;

// Helper: add session header if you later add auth middleware (optional)
const authHeaders = (extra = {}) => {
  const sessionId = localStorage.getItem("sessionId");
  return sessionId ? { ...extra, "x-session-id": sessionId } : extra;
};

// Try to pull SQL out of a model response
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

/* -------------------------------
   ProtectedRoute: Wrapper for authenticated routes
--------------------------------- */
function ProtectedRoute({ children, user }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/* -------------------------------
   ChatPage: a single conversation
--------------------------------- */
function ChatPage({ initialThreadId, user }) {
  const { threadId: routeThreadId } = useParams(); // /c/:threadId
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

  // Sidebar vs modal
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);

  const userId = localStorage.getItem("userId");

  /* -------------------------------
     Restore threadId from storage
  --------------------------------- */
  useEffect(() => {
    if (!routeThreadId) {
      const saved = sessionStorage.getItem("activeThreadId");
      if (saved) setThreadId(saved);
    }
  }, [routeThreadId]);

  // Persist threadId
  useEffect(() => {
    if (threadId) {
      sessionStorage.setItem("activeThreadId", threadId);
    }
  }, [threadId]);

  /* -------------------------------
     Load upload history on mount
  --------------------------------- */
   useEffect(() => {
    async function loadUploadHistory() {
      try {
        const uid = localStorage.getItem("userId");
        const q = uid ? `?userId=${encodeURIComponent(uid)}` : "";
        const res = await fetch(`${API_BASE}/history/uploads${q}`, {
          headers: authHeaders()
        });
        if (res.ok) setUploadHistory(await res.json());
      } catch (err) {
        console.error("Failed to load upload history:", err);
      }
    }
    loadUploadHistory();
  }, []);


  /* -------------------------------
     Append helpers
  --------------------------------- */
  const appendBot = (text) =>
    setMessages((prev) => [...prev, { sender: "bot", text }]);
  const appendUser = (text) =>
    setMessages((prev) => [...prev, { sender: "user", text }]);

  /* -------------------------------
     Load messages when threadId changes
  --------------------------------- */
  useEffect(() => {
    if (!threadId) return;
    async function loadMessages() {
      try {
        const res = await fetch(`${API_BASE}/messages/${threadId}`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setMessages(data);
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    }
    loadMessages();
  }, [threadId]);

  /* -------------------------------
     Load chat list (per user)
  --------------------------------- */
  const loadChatList = async () => {
    try {
      const q = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      const res = await fetch(`${API_BASE}/chats${q}`, {
        headers: authHeaders()
      });
      if (res.ok) setChatList(await res.json());
    } catch (err) {
      console.error("Failed to load chats:", err);
    }
  };

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
        if (userId) formData.append("userId", userId); // 👈 NEW

        response = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          headers: authHeaders(), // don't set Content-Type for FormData
          body: formData,
        });
      } else {
        response = await fetch(`${API_BASE}/chat/flow`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ threadId, message: text, userId }), // 👈 NEW
        });
      }

      const result = await response.json();

      if (result.openai) appendBot(result.openai);

      if (result.threadId && result.threadId !== threadId) {
        setThreadId(result.threadId);
        navigate(`/c/${result.threadId}`);
      }

      if (file) setSelectedFile(null);

      // refresh upload history
     if (file && response.ok) {
      try {
        const uid = localStorage.getItem("userId");
        const q = uid ? `?userId=${encodeURIComponent(uid)}` : "";
        const res = await fetch(`${API_BASE}/history/uploads${q}`, {
          headers: authHeaders()
        });
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
     Run SQL query with file context
  --------------------------------- */
  const handleRunQuery = async (sql, messageId, dbFileMessageId) => {
    try {
      setIsLoading(true);
      
      const res = await fetch(`${API_BASE}/query/run`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ 
          query: sql, 
          threadId, 
          messageId,
          dbFileMessageId // let backend choose best strategy
        }),
      });
      
      const result = await res.json();

      if (result.rows) {
        setMessages((prev) => [...prev, { 
          sender: "bot", 
          rows: result.rows,
          foundVia: result.foundVia
        }]);
      } else if (result.error) {
        appendBot("Error running query: " + result.error);
        if (result.debug) {
          console.error("Query debug info:", result.debug);
        }
      }
    } catch (err) {
      appendBot("Error running query: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  //------ handle QuickResult-------
const handleQuickResult = async (text, file) => {
  if (!text?.trim() && !file) return;

  appendUser(text);
  setHasUserInteracted(true);

  setIsLoading(true);
  try {
    const form = new FormData();
    if (file) form.append("file", file);
    form.append("prompt", text);
    if (threadId) form.append("threadId", threadId);
    if (userId) form.append("userId", userId);

    const res = await fetch(`${API_BASE}/chat/quickresult`, {
      method: "POST",
      headers: authHeaders(), // ok: only adds x-session-id; FormData sets content-type
      body: form,
    });
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    if (data.threadId && data.threadId !== threadId) {
      setThreadId(data.threadId);
      navigate(`/c/${data.threadId}`);
    }

    if (data.rows) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", rows: data.rows, type: "result" },
      ]);
    }

    // 👇 NEW: refresh the per-user upload history right after a successful file upload
    if (file) {
      try {
        const uid = localStorage.getItem("userId");
        const q = uid ? `?userId=${encodeURIComponent(uid)}` : "";
        const histRes = await fetch(`${API_BASE}/history/uploads${q}`, {
          headers: authHeaders(),
        });
        if (histRes.ok) setUploadHistory(await histRes.json());
      } catch (e) {
        console.error("Failed to refresh upload history:", e);
      }
    }
  } catch (err) {
    console.error("Quick result error:", err);
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
          headers: authHeaders({ "Content-Type": "application/json" }),
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
      const uid = localStorage.getItem("userId");
      const q = uid ? `?userId=${encodeURIComponent(uid)}` : "";
      const res = await fetch(`${API_BASE}/history/download/${item.id}${q}`, {
        headers: authHeaders()
      });
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
     Open a past chat
  --------------------------------- */
  const handleOpenChat = async (chat) => {
    try {
      const res = await fetch(`${API_BASE}/messages/${chat.threadId}`, {
        headers: authHeaders()
      });
      if (res.ok) {
        const msgs = await res.json();
        setMessages(msgs);
        setThreadId(chat.threadId);
        navigate(`/c/${chat.threadId}`);
        setShowChatHistory(false);
      }
    } catch (err) {
      console.error("Failed to load chat:", err);
    }
  };

  /* -------------------------------
     New chat
  --------------------------------- */
  const handleNewChat = () => {
    sessionStorage.removeItem("activeThreadId");
    setThreadId(null);
    setMessages([]);
    setHasUserInteracted(false);
    navigate("/");
  };

  /* -------------------------------
     Logout
  --------------------------------- */
  const handleLogout = async () => {
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    }
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset state
    setThreadId(null);
    setMessages([]);
    setHasUserInteracted(false);
    setSelectedFile(null);
    
    navigate("/login");
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
        onLogout={handleLogout}
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
        onQuickResult={handleQuickResult}
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
   Top-level App: routing + auth
--------------------------------- */
const App = () => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("username");
    return saved ? { username: saved } : null;
  });

  return (
    <Routes>
      {/* Auth routes - accessible when not logged in */}
      <Route path="/login" element={<Login onAuthSuccess={(userData) => setUser(userData)} />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected routes - require authentication */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute user={user}>
            <ChatPage initialThreadId={null} user={user} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/c/:threadId" 
        element={
          <ProtectedRoute user={user}>
            <ChatPage user={user} />
          </ProtectedRoute>
        } 
      />
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
    </Routes>
  );
};

export default App;
