// src/components/SideMenu.jsx
import React, { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle.jsx";
import "../styles/SideMenu.css";

export default function SideMenu({ open, onToggle, onOpenHistory, onLogout }) {
  // Resolve username from localStorage
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

  // Close the user drop-up on outside click or Escape
  useEffect(() => {
    const onDown = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        // If user menu is open, close it first, otherwise close the drawer
        if (userMenuOpen) setUserMenuOpen(false);
        else onToggle?.();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen, onToggle]);

  // When the drawer closes, also close the user menu
  useEffect(() => {
    if (!open) setUserMenuOpen(false);
  }, [open]);

  // Optional: lock page scroll while drawer is open (nice on mobile)
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleLogout = async () => {
    try {
      await onLogout?.();
    } finally {
      window.location.assign("/login");
    }
  };

  return (
    <>
      {/* Overlay sits under the menu, above the page. Clicking it closes the drawer */}
      <div
        className={`side-overlay ${open ? "show" : ""}`}
        onClick={() => {
          setUserMenuOpen(false);
          onToggle?.();
        }}
        aria-hidden="true"
      />

      <aside
        ref={rootRef}
        className={`side-menu ${open ? "open" : ""}`}
        aria-hidden={open ? "false" : "true"}
        aria-label="Sidebar"
      >
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
        </ul>

        {/* Footer button that opens the user drop-up */}
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
          <div
            className="sm-user-menu"
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Theme row */}
            <div className="sm-menu-row" role="none">
              <span className="sm-menu-label">Dark mode</span>
              <ThemeToggle compact />
            </div>

            <div className="sm-divider" role="separator" />

            {/* Logout */}
            <button
              className="sm-menu-item danger"
              role="menuitem"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
