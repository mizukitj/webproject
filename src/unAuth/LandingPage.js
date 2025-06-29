import React from 'react';
import NavBar from './components/NavBar';
import Movie from './components/Movie';
import Footer from './components/Footer';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <NavBar />
      <Movie />
      <Footer />
    </div>
  );
};

export default LandingPage;
