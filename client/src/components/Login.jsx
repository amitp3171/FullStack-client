import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/Login.css";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Login({ onAuthSuccess }) {
  const [identifier, setIdentifier] = useState(""); // email OR username
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // surface success message from register page
  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
      navigate("/login", { replace: true });
    }
  }, [location.state, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }), // <—
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("sessionId", data.sessionId);
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("userId", data.user.id);

      onAuthSuccess?.(data.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card login">
        <h2>Login</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Email or username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p>
          Don&apos;t have an account? <Link to="/register">Register here</Link>
        </p>

        {success && <p className="success">{success}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
