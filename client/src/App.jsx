// src/App.jsx
import React, { useState } from 'react';
import Navbar from './components/navbar.jsx';
import SuggestionCards from './components/SuggestionCards.jsx';
import ChatArea from './components/ChatArea.jsx';
import InputBar from './components/InputBar.jsx';
import SideMenu from './components/SideMenu.jsx';
import './styles/App.css';

const App = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [messages, setMessages] = useState([]); // 👈 holds chat messages

  const handleSendMessage = (text) => {
    if (!text.trim()) return;
    setMessages([...messages, { sender: "user", text }]);
    setHasUserInteracted(true);
  };

  return (
    <div className="app-container">
      <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
      {menuOpen && <SideMenu />}
      <div className="main-section">
        {!hasUserInteracted && (
          <div className="suggestion-overlay">
            <SuggestionCards onSuggestionClick={(text) => {
              setMessages([...messages, { sender: "user", text }]);
              setHasUserInteracted(true);
            }} />
          </div>
        )}
        <ChatArea messages={messages} />
      </div>
      <InputBar onSend={handleSendMessage} />
    </div>
  );
};

export default App;
