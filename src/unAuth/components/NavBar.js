import React from 'react';
import './NavBar.css';

const NavBar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <h2>Pick a Flick</h2>
        </div>
        <div className="navbar-chat-icon">
          <i className="fas fa-comments"></i>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
