// frontend/src/components/Navbar.jsx
import React from 'react';
import '../styles/NavBar.css';

const Navbar = ({ onMenuToggle, onNewChat }) => (
  <header className="navbar">
    <span className="nav-home">Home</span>
    <img src="/dell_logo.png" alt="Dell Logo" className="logo" />
    <div className="nav-actions">
      <button className="new-chat-btn" onClick={onNewChat}>New Chat</button>
      <button className="export-btn">Export</button>
    </div>
  </header>
);

export default Navbar;
