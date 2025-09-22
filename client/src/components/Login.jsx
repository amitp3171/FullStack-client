import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/Login.css";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Login({ onAuthSuccess }) {
  const [identifier, setIdentifier] = useState(""); // email OR username
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Pull success message from register flow
  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
      navigate("/login", { replace: true });
    }
  }, [location.state, navigate]);

  // Prefill identifier if remembered
  useEffect(() => {
    const saved = localStorage.getItem("login.rememberedIdentifier");
    if (saved) {
      setIdentifier(saved);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      // remember identifier if checked
      if (remember) {
        localStorage.setItem("login.rememberedIdentifier", identifier);
      } else {
        localStorage.removeItem("login.rememberedIdentifier");
      }

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
    <div className="login-layout">
      {/* LEFT: hero panel */}
      <section className="left-hero" aria-hidden="true">
        <div className="hero-inner">
          <h1 className="hero-title">AskQL</h1>

          <p className="hero-copy">
            Type it. Test it. Trust it. Human-readable prompts become executable
            SQL and audit-ready results.
          </p>
        </div>
      </section>

      {/* RIGHT: sign-in form */}
      <section className="right-form">
        <div className="signin-card">
          <h2 className="signin-title">Sign in</h2>

          <form onSubmit={handleSubmit} className="signin-form">
            <label className="field">
              <span className="field-label">Email or username</span>
              <input
                type="text"
                placeholder="you@example.com / @username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </label>

            <div className="form-row">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
            </div>

            <button className="btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? "Signing in…" : "Sign in now"}
            </button>
          </form>

          <p className="have-account">
            Don’t have an account? <Link to="/register">Register here</Link>
          </p>

          {success && <p className="banner banner-success">{success}</p>}
          {error && <p className="banner banner-error">{error}</p>}
        </div>
      </section>
    </div>
  );
}
