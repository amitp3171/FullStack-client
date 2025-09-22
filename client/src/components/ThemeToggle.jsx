import React, { useEffect, useState } from "react";

const THEME_KEY = "ui.theme"; // "light" | "dark" | "system"

function getPreferredTheme() {
  // use saved first
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  // fall back to system
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function ThemeToggle({ compact = false }) {
  const [theme, setTheme] = useState(getPreferredTheme());

  // Apply immediately on mount & when theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Keep in sync if OS theme changes & user hasn't explicitly picked
  useEffect(() => {
    const mm = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const saved = localStorage.getItem(THEME_KEY);
      if (!saved || saved === "system") {
        setTheme(mm.matches ? "dark" : "light");
      }
    };
    mm.addEventListener?.("change", onChange);
    return () => mm.removeEventListener?.("change", onChange);
  }, []);

  const isDark = theme === "dark";
  const next = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      className="button-subtle"
      aria-pressed={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(next)}
      style={compact ? { padding: "4px 8px" } : undefined}
    >
      {/* icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        {isDark ? (
          /* sun */
          <path
            fill="currentColor"
            d="M6.76 4.84l-1.8-1.79L3.17 4.84l1.79 1.79M1 13h3v-2H1m9 10h2v-3h-2m8.07-1.36l1.79 1.79l1.79-1.79l-1.79-1.79M20 11v2h3v-2M6.76 19.16l-1.79 1.79l1.79 1.79l1.79-1.79M12 6a6 6 0 100 12 6 6 0 000-12zm0-5h2v3h-2z"
          />
        ) : (
          /* moon */
          <path
            fill="currentColor"
            d="M20.742 13.045A8 8 0 1110.955 3.258a7 7 0 109.787 9.787z"
          />
        )}
      </svg>
      {!compact && <span>{isDark ? "Dark" : "Light"}</span>}
    </button>
  );
}
