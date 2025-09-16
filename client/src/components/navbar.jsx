
import React from 'react';
import '../styles/NavBar.css';
// ...existing code...

const Navbar = ({ onMenuToggle }) => (
  <header className="navbar">
    <span className="nav-home">Home</span>
    <img
      src="/dell_logo.png"
      alt="Dell Logo"
      className="logo"
    />
    <div className="nav-actions">
      <button className="export-btn">Export</button>
      <button className="menu-btn" onClick={onMenuToggle}>⋮</button>
    </div>
  </header>
);

export default Navbar;
