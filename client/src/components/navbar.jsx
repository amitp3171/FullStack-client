//frontend/src/components/navbar.jsx
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
 
    </div>
  </header>
);

export default Navbar;
