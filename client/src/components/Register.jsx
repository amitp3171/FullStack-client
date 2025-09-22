import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Register.css"; // this file just imports Login.css

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      // Success → send them to Login with a flash message
      navigate("/login", {
        state: { message: "Registration successful! Please log in." },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-layout">
      {/* Left hero (same look/feel as Login) */}
      <section className="left-hero" aria-hidden="true">
        <div className="hero-inner">
          <h1 className="hero-title">Join AskQL</h1>
          <p className="hero-copy">
            Spin questions into queries. Build, test, and trust your data
            workflow—start by creating your account.
          </p>
        </div>
      </section>

      {/* Right: registration form (transparent over the photo) */}
      <section className="right-form">
        <div className="signin-card">
          <h2 className="signin-title">Create your account</h2>

          <form onSubmit={handleSubmit} className="signin-form">
            <label className="field">
              <span className="field-label">Username</span>
              <input
                type="text"
                placeholder="@yourname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </label>

            <label className="field">
              <span className="field-label">Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
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
                autoComplete="new-password"
              />
            </label>

            <button className="btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="have-account">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>

          {error && <p className="banner banner-error">{error}</p>}
        </div>
      </section>
    </div>
  );
}
