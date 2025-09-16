// frontend/src/App.jsx
import React, { useState } from "react";
import Navbar from "./components/navbar.jsx";
import SuggestionCards from "./components/SuggestionCards.jsx";
import ChatArea from "./components/chatArea.jsx";
import InputBar from "./components/inputBar.jsx";
import SideMenu from "./components/SideMenu.jsx";
import "./styles/App.css";

const API_BASE = "http://localhost:3000/api";

const App = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [loading, setLoading] = useState(false);

  const appendBot = (text) =>
    setMessages((prev) => [...prev, { sender: "bot", text }]);

  const appendUser = (text) =>
    setMessages((prev) => [...prev, { sender: "user", text }]);

  // create a transient "typing" message and return its id so we can remove it
  const showTyping = () => {
    const id = `typing-${Date.now()}`;
    setMessages((prev) => [...prev, { id, sender: "bot", typing: true }]);
    return id;
  };

  const hideTyping = (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSendMessage = async (text, file) => {
    if (!text?.trim() && !file) return;

    if (text?.trim()) appendUser(text);
    setHasUserInteracted(true);

    // show typing indicator
    const typingId = showTyping();
    setLoading(true);

    try {
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

      hideTyping(typingId);
      if (result.openai) appendBot(result.openai);
      if (result.threadId && !threadId) setThreadId(result.threadId);
    } catch (error) {
      hideTyping(typingId);
      appendBot("Error: Could not get response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
      {menuOpen && <SideMenu />}
      <div className="main-section">
        {!hasUserInteracted && (
          <div className="suggestion-overlay">
            <SuggestionCards
              onSuggestionClick={(text) => handleSendMessage(text, null)}
            />
          </div>
        )}
        <ChatArea messages={messages} />
      </div>
      <InputBar onSend={handleSendMessage} loading={loading} />
    </div>
  );
};

export default App;
