import React from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Movie from './components/Movie';
import Footer from './components/Footer';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="landing-page">
      <NavBar />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '2rem 0' }}>
        <button
          style={{
            background: '#b49504', color: '#fff', fontWeight: 600, fontSize: '1.2rem', border: 'none', borderRadius: '24px', padding: '1em 2em', cursor: 'pointer', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
          onClick={() => navigate('/party/new')}
        >
          Create Party
        </button>
      </div>
      <Movie />
      <Footer />
    </div>
  );
};

export default LandingPage;
