// src/components/SideMenu.jsx
import React from 'react';
import '../styles/SideMenu.css'

export default function SideMenu({ open, onToggle }) {
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

      <ul>
        <li>Settings</li>
        <li>History</li>
        <li>Logout</li>
      </ul>
    </aside>
  );
}


