// src/components/ThemeToggle.jsx
import React, { useEffect, useMemo, useState } from "react";

const THEME_KEY = "ui.theme"; // "light" | "dark" | "system"
const PALETTE_KEY = "ui.palette"; // one of PALETTES (used only in dark)
const PALETTES = [
  "theme-graphite",
  "theme-amoled",
  "theme-mocha",
  "theme-teal",
];

function systemPrefersDark() {
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}
function resolvedTheme(theme) {
  return theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
}
function applyTheme(theme, palette) {
  const html = document.documentElement;

  // set data-theme
  html.setAttribute("data-theme", resolvedTheme(theme));

  // remove all palette classes and apply current (only if dark)
  html.classList.remove(...PALETTES);
  if (resolvedTheme(theme) === "dark" && palette) {
    html.classList.add(palette);
  }
}

function readTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  // default to system if nothing saved
  return "system";
}
function readPalette() {
  const saved = localStorage.getItem(PALETTE_KEY);
  return PALETTES.includes(saved) ? saved : "theme-graphite";
}

export default function ThemeToggle({ compact = false }) {
  const [theme, setTheme] = useState(readTheme);
  const [palette, setPalette] = useState(readPalette);
  const isDarkResolved = useMemo(
    () => resolvedTheme(theme) === "dark",
    [theme]
  );

  // Apply immediately and persist
  useEffect(() => {
    applyTheme(theme, palette);
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(PALETTE_KEY, palette);
  }, [theme, palette]);

  // Keep in sync with OS when theme === "system"
  useEffect(() => {
    const mm = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system") applyTheme("system", palette);
    };
    mm.addEventListener?.("change", onChange);
    return () => mm.removeEventListener?.("change", onChange);
  }, [theme, palette]);

  /* ------------- UI ------------- */

  // Compact: tiny switch (used in your side menu)
  if (compact) {
    const pressed = isDarkResolved;
    const title =
      theme === "system"
        ? `System (${pressed ? "dark" : "light"})`
        : pressed
        ? "Dark"
        : "Light";

    // click toggles dark/light; Alt+click cycles light → system → dark
    const onClick = (e) => {
      if (e.altKey) {
        setTheme((t) =>
          t === "light" ? "system" : t === "system" ? "dark" : "light"
        );
      } else {
        setTheme((t) => (resolvedTheme(t) === "dark" ? "light" : "dark"));
      }
    };

    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={pressed}
        title={`${title} — Alt+Click to cycle modes`}
        style={{
          position: "relative",
          width: 44,
          height: 24,
          borderRadius: 999,
          background: "var(--chip-bg)",
          border: "1px solid var(--chip-border)",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 2,
            left: pressed ? 22 : 2, // knob position
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            transition: "left .15s ease",
          }}
        />
      </button>
    );
  }

  // Full control: segmented + palette select (only shown in dark)
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 10,
        alignItems: "center",
        color: "var(--text)",
      }}
    >
      <div
        role="group"
        aria-label="Theme"
        style={{
          display: "inline-flex",
          border: "1px solid var(--chip-border)",
          background: "var(--chip-bg)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {["light", "system", "dark"].map((opt) => {
          const active = theme === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setTheme(opt)}
              aria-pressed={active}
              style={{
                padding: "6px 10px",
                border: "none",
                background: active ? "var(--surface)" : "transparent",
                color: "var(--text)",
                cursor: "pointer",
                borderRight:
                  opt !== "dark" ? "1px solid var(--chip-border)" : "none",
              }}
            >
              {opt[0].toUpperCase() + opt.slice(1)}
            </button>
          );
        })}
      </div>

      {isDarkResolved && (
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Palette</span>
          <select
            value={palette}
            onChange={(e) => setPalette(e.target.value)}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "4px 8px",
            }}
          >
            <option value="theme-graphite">Graphite</option>
            <option value="theme-amoled">AMOLED</option>
            <option value="theme-mocha">Mocha</option>
            <option value="theme-teal">Teal night</option>
          </select>
        </label>
      )}
    </div>
  );
}
