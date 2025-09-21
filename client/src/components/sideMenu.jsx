import React, { useEffect, useRef, useState } from "react";
import "../styles/SideMenu.css";

export default function SideMenu({ open, onToggle, onOpenHistory, onLogout }) {
  // derive username from localStorage (same logic you had)
  const smUsername = (() => {
    try {
      const direct =
        localStorage.getItem("username") || localStorage.getItem("name");
      if (direct) return direct;
      const raw = localStorage.getItem("user");
      if (!raw) return "";
      const obj = JSON.parse(raw);
      return obj?.username || obj?.name || "";
    } catch {
      return "";
    }
  })();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const rootRef = useRef(null);

  // close the user drop-up on outside click or Escape
  useEffect(() => {
    const onDown = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setUserMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // let the parent clear tokens/session if it wants
      await onLogout?.();
    } finally {
      // then hard-redirect to login
      window.location.assign("/login");
    }
  };

  return (
    <aside ref={rootRef} className={`side-menu ${open ? "open" : ""}`}>
      <button
        className="menu-handle"
        onClick={onToggle}
        aria-label={open ? "Close menu" : "Open menu"}
        title={open ? "Close menu" : "Open menu"}
      >
        ⋯
      </button>

      <ul className="sm-list">
        <li onClick={onOpenHistory} style={{ cursor: "pointer" }}>
          History
        </li>
        {/* Removed Logout from the list */}
      </ul>

      {/* User footer: clickable → opens a small drop-up with Logout */}
      <button
        type="button"
        className="sm-user-footer"
        onClick={() => setUserMenuOpen((v) => !v)}
        title={smUsername || "User"}
        aria-haspopup="menu"
        aria-expanded={userMenuOpen}
      >
        <div className="sm-user-avatar">
          {(smUsername?.[0] || "U").toUpperCase()}
        </div>
        <div className="sm-user-meta">
          <div className="sm-user-name">{smUsername || "User"}</div>
        </div>
        <svg
          className={`sm-caret ${userMenuOpen ? "open" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M7 10l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </button>

      {userMenuOpen && (
        <div className="sm-user-menu" role="menu">
          <button
            className="sm-menu-item"
            role="menuitem"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </aside>
  );
}
