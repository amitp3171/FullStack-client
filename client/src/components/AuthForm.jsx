import React, { useState } from "react";
import "../styles/AuthForm.css";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function AuthForm({ onAuthSuccess }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${API_BASE}/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      localStorage.setItem("sessionId", data.sessionId);
      localStorage.setItem("username", data.username);

      onAuthSuccess(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
  <div className="auth-container">
    <div className={`auth-card ${mode}`} key={mode}>
      <h2>{mode === "login" ? "Login" : "Register"}</h2>
      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">{mode === "login" ? "Login" : "Register"}</button>
      </form>

      <p>
        {mode === "login" ? (
          <>
            Don’t have an account?{" "}
            <button onClick={() => setMode("register")}>Register</button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button onClick={() => setMode("login")}>Login</button>
          </>
        )}
      </p>

      {error && <p className="error">{error}</p>}
    </div>
  </div>
);

}
