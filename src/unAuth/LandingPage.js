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
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        margin: '3rem 0',
        padding: '0 1rem'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: '700', 
          color: '#333', 
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          🎬 Movie Voting Party
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#666', 
          marginBottom: '2rem',
          textAlign: 'center',
          maxWidth: '600px',
          lineHeight: '1.6'
        }}>
          Create a party, select movies, and let your friends vote on their favorites. 
          See real-time results as everyone casts their votes!
        </p>
        <button
          style={{
            background: 'linear-gradient(135deg, #b49504 0%, #d4af37 100%)',
            color: '#fff', 
            fontWeight: 600, 
            fontSize: '1.3rem', 
            border: 'none', 
            borderRadius: '28px', 
            padding: '1.2em 2.5em', 
            cursor: 'pointer', 
            marginBottom: '2rem', 
            boxShadow: '0 8px 24px rgba(180, 149, 4, 0.3)',
            transition: 'all 0.3s ease',
            transform: 'translateY(0)'
          }}
          onClick={() => navigate('/party/new')}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 12px 32px rgba(180, 149, 4, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 24px rgba(180, 149, 4, 0.3)';
          }}
        >
          🎉 Create Your Party
        </button>
        <div style={{ 
          display: 'flex', 
          gap: '2rem', 
          flexWrap: 'wrap', 
          justifyContent: 'center',
          marginTop: '2rem'
        }}>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '1.5rem', 
            borderRadius: '16px', 
            textAlign: 'center',
            minWidth: '200px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Easy Setup</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
              Create a party in seconds and get a shareable link
            </p>
          </div>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '1.5rem', 
            borderRadius: '16px', 
            textAlign: 'center',
            minWidth: '200px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎬</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Curate Movies</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
              Browse and select from thousands of movies
            </p>
          </div>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '1.5rem', 
            borderRadius: '16px', 
            textAlign: 'center',
            minWidth: '200px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗳️</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Vote Together</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
              Friends vote on each movie with like/dislike/pass
            </p>
          </div>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '1.5rem', 
            borderRadius: '16px', 
            textAlign: 'center',
            minWidth: '200px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>See Results</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
              Real-time results show the most popular choices
            </p>
          </div>
        </div>
      </div>
      <Movie />
      <Footer />
    </div>
  );
};

export default LandingPage;
