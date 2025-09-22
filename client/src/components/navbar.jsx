// frontend/src/components/Navbar.jsx
import React from "react";
import "../styles/NavBar.css";

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M11 5h2v14h-2zM5 11h14v2H5z" fill="currentColor" />
  </svg>
);

const Navbar = ({ onMenuToggle, onNewChat }) => (
  <header className="navbar">
    <span className="nav-home">Home</span>
    <img src="/dell_logo.png" alt="Dell Logo" className="logo" />
    <div className="nav-actions">
      {/* icon-only new chat */}
      <button
        className="new-chat-btn"
        onClick={onNewChat}
        aria-label="New chat"
        title="New chat"
      >
        <PlusIcon />
      </button>
    </div>
  </header>
);

export default Navbar;
