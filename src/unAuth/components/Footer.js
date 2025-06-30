import React from 'react';
import './Footer.css';

const Footer = ({ groupName = "Marvel Fans", onResultsClick }) => {
  return (
    <footer className="footer-new">
      <div className="footer-section left">
        In Group: <span className="group-name">{groupName}</span>
      </div>
      <div className="footer-section right">
        <button className="results-btn" onClick={onResultsClick || (() => window.location.href = '/results')}>See Results</button>
      </div>
    </footer>
  );
};

export default Footer;
