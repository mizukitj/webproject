import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>MovieApp</h3>
            <p>Your ultimate destination for the best movies and entertainment.</p>
            <div className="social-links">
              <a href="#" className="social-link">
                <i className="fab fa-facebook"></i>
              </a>
              <a href="#" className="social-link">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="social-link">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="social-link">
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul className="footer-links">
              <li><a href="#home">Home</a></li>
              <li><a href="#movies">Movies</a></li>
              <li><a href="#tv-shows">TV Shows</a></li>
              <li><a href="#genres">Genres</a></li>
            </ul>
          </div>


        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 MovieApp. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
