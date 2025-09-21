// frontend/src/components/SideMenu.jsx
import React from 'react';
import '../styles/SideMenu.css'

export default function SideMenu({ open, onToggle, onOpenHistory, onLogout }) {
 
  return (
    <aside className={`side-menu ${open ? 'open' : ''}`}>
      <button
        className="menu-handle"
        onClick={onToggle}
        aria-label={open ? "Close menu" : "Open menu"}
        title={open ? "Close menu" : "Open menu"}
      >
        ⋯
      </button>
{/*i want the user when he press the logout to be redirected to the login page */}

      <ul>
        <li onClick={onOpenHistory} style={{ cursor: "pointer" }}>History</li>
        <li onClick={onLogout} style={{ cursor: "pointer" }}>Logout</li>
      </ul>
    </aside>
  );
}
