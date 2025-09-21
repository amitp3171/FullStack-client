// frontend/src/components/SideMenu.jsx
import React from 'react';
import '../styles/SideMenu.css'

export default function SideMenu({ open, onToggle, onOpenHistory, onLogout }) {
  const smUsername = (() => {
  try {
    const direct = localStorage.getItem("username") || localStorage.getItem("name");
    if (direct) return direct;
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    const obj = JSON.parse(raw);
    return obj?.username || obj?.name || "";
  } catch {
    return "";
  }
})();
 
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

      {/* ✅ ADD THIS block at the very end of the SideMenu markup */}
      <div className="sm-user-footer" title={smUsername || "User"}>
        <div className="sm-user-avatar">{(smUsername?.[0] || "U").toUpperCase()}</div>
        <div className="sm-user-meta">
          <div className="sm-user-name">{smUsername || "User"}</div>
        </div>
      </div>

    </aside>

    
  );
}
