// frontend/src/App.jsx
import React, { useState } from 'react';
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

  const appendBot = (text) =>
    setMessages((prev) => [...prev, { sender: "bot", text }]);

  const appendUser = (text) =>
    setMessages((prev) => [...prev, { sender: "user", text }]);


// Function to handle sending messages (with optional file)
  const handleSendMessage = async (text, file) => {
    if (!text.trim() && !file) return;

    if (text.trim()) appendUser(text);
    setHasUserInteracted(true);

    try {
      let response;
      if (file) {
        // Upload schema + optional text into the same thread
        const formData = new FormData();
        formData.append('file', file);
        if (text?.trim()) formData.append('prompt', text);
        if (threadId) formData.append('threadId', threadId);

        response = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData,
        });
      } else {
        // Flowing chat message (no file)
        response = await fetch(`${API_BASE}/chat/flow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threadId, message: text }),
        });
      }

      const result = await response.json();

      if (result.openai) appendBot(result.openai);
        if (result.threadId) setThreadId(result.threadId);
    } catch (error) {
        console.error("Chat error:", error);
         appendBot(`Error: Could not get response. (${error.message})`);
    }
  };

 

  // Function to run SQL queries
const handleRunQuery = async (sql) => {
  try {
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
              onSuggestionClick={(text) => {
                // Send suggestion as a chat message
                handleSendMessage(text, null);
              }}
            />
          </div>
        )}
        <ChatArea messages={messages} onRunQuery={handleRunQuery} />
      </div>
      <InputBar onSend={handleSendMessage} />
    </div>
  );
};

export default App;
