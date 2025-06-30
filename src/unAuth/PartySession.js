import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  doc, setDoc, getDoc, onSnapshot, collection, getDocs
} from 'firebase/firestore';

const TMDB_API_KEY = process.env.REACT_APP_TMDB_API_KEY;

// Helper to get/set a local userId for this browser
function getUserId() {
  let userId = localStorage.getItem('movie_party_userid');
  if (!userId) {
    userId = Math.random().toString(36).slice(2, 12);
    localStorage.setItem('movie_party_userid', userId);
  }
  return userId;
}

const PartySession = () => {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [genres, setGenres] = useState([]);
  const [filters, setFilters] = useState({ genre: '', year: '', language: 'en' });
  const [movies, setMovies] = useState([]); // local fetched movies
  const [selectedMovies, setSelectedMovies] = useState([]); // movies selected for session
  const [lockedMovies, setLockedMovies] = useState(null); // movies locked in Firestore
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [votingIndex, setVotingIndex] = useState(0);
  const [votes, setVotes] = useState({}); // { movieId: 'like'|'dislike'|'pass' }
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);
  const [showSelection, setShowSelection] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creatorId, setCreatorId] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [totalVoters, setTotalVoters] = useState(0);
  const userId = getUserId();
  const partyUrl = `${window.location.origin}/party/${partyId}`;

  // Fetch genres on mount
  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`)
      .then(res => res.json())
      .then(data => setGenres(data.genres || []));
  }, []);

  // Listen for party data (locked movies, creatorId)
  useEffect(() => {
    const partyDoc = doc(db, 'parties', partyId);
    const unsub = onSnapshot(partyDoc, (snap) => {
      const data = snap.data();
      if (data) {
        if (data.lockedMovies) {
          setLockedMovies(data.lockedMovies);
          setShowSelection(false);
        } else {
          setLockedMovies(null);
        }
        if (data.creatorId) {
          setCreatorId(data.creatorId);
        }
      }
    });
    return () => unsub();
  }, [partyId]);

  // Real-time results listener
  useEffect(() => {
    if (!lockedMovies) return;
    
    const votesCol = collection(db, 'parties', partyId, 'votes');
    const unsub = onSnapshot(votesCol, async () => {
      await fetchResults();
    });
    
    return () => unsub();
  }, [partyId, lockedMovies]);

  // On mount, if no creatorId, set it (first user is creator)
  useEffect(() => {
    const partyDoc = doc(db, 'parties', partyId);
    getDoc(partyDoc).then(snap => {
      const data = snap.data();
      if (!data || !data.creatorId) {
        setDoc(partyDoc, { creatorId: userId }, { merge: true });
        setCreatorId(userId);
      } else {
        setCreatorId(data.creatorId);
      }
    });
  }, [partyId, userId]);

  // Check if user has already voted
  useEffect(() => {
    const votesDoc = doc(db, 'parties', partyId, 'votes', userId);
    getDoc(votesDoc).then(snap => {
      if (snap.exists()) {
        setHasVoted(true);
      } else {
        setHasVoted(false);
      }
    });
  }, [partyId, userId, lockedMovies]);

  // Handle filter changes
  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // Fetch movies from TMDB
  const fetchMovies = async () => {
    setLoading(true);
    setError('');
    setMovies([]);
    let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}`;
    if (filters.genre) url += `&with_genres=${filters.genre}`;
    if (filters.year) url += `&primary_release_year=${filters.year}`;
    if (filters.language) url += `&language=${filters.language}`;
    url += `&sort_by=popularity.desc&page=1`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      setMovies((data.results || []).slice(0, 12));
      setSelectedMovies([]);
      setShowSelection(true);
    } catch (err) {
      setError('Failed to fetch movies.');
    }
    setLoading(false);
  };

  // Select/deselect a movie
  const toggleSelectMovie = (movie) => {
    setSelectedMovies((prev) => {
      if (prev.find((m) => m.id === movie.id)) {
        return prev.filter((m) => m.id !== movie.id);
      } else {
        return [...prev, movie];
      }
    });
  };

  // Lock in selected movies (creator only)
  const lockInMovies = async () => {
    if (!selectedMovies.length) return;
    setLoading(true);
    const partyDoc = doc(db, 'parties', partyId);
    await setDoc(partyDoc, { lockedMovies: selectedMovies }, { merge: true });
    setLoading(false);
  };

  // Return to selection (unlock movies, creator only)
  const returnToSelection = async () => {
    if (userId !== creatorId) return;
    const partyDoc = doc(db, 'parties', partyId);
    await setDoc(partyDoc, { lockedMovies: null }, { merge: true });
    setShowSelection(true);
    setVotingIndex(0);
    setVotes({});
    setShowResults(false);
  };

  // Copy party link
  const copyLink = () => {
    navigator.clipboard.writeText(partyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Voting logic
  const handleVote = async (voteType) => {
    if (!lockedMovies || hasVoted) return;
    const movie = lockedMovies[votingIndex];
    const newVotes = { ...votes, [movie.id]: voteType };
    setVotes(newVotes);
    if (votingIndex < lockedMovies.length - 1) {
      setVotingIndex(votingIndex + 1);
    } else {
      // Save votes to Firestore (only if not already voted)
      const votesDoc = doc(db, 'parties', partyId, 'votes', userId);
      await setDoc(votesDoc, { votes: newVotes }, { merge: true });
      setHasVoted(true);
      setShowResults(true);
    }
  };

  // Fetch results (aggregate votes)
  const fetchResults = async () => {
    if (!lockedMovies) return;
    
    const votesCol = collection(db, 'parties', partyId, 'votes');
    const votesSnap = await getDocs(votesCol);
    const allVotes = [];
    votesSnap.forEach(doc => {
      allVotes.push(doc.data().votes);
    });
    
    setTotalVoters(allVotes.length);
    
    // Tally votes
    const tally = {};
    lockedMovies.forEach(m => {
      tally[m.id] = { ...m, like: 0, dislike: 0, pass: 0 };
    });
    
    allVotes.forEach(voteObj => {
      Object.entries(voteObj).forEach(([movieId, v]) => {
        if (tally[movieId]) tally[movieId][v]++;
      });
    });
    
    // Sort by likes desc, then passes, then dislikes
    const sorted = Object.values(tally).sort((a, b) => b.like - a.like || b.pass - a.pass || a.dislike - b.dislike);
    setResults(sorted);
  };

  // Dedicated results page navigation
  const goToResults = () => {
    setShowResults(true);
    fetchResults();
  };

  // UI
  if (showResults) {
    return (
      <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '5rem', padding: '0 1rem' }}>
        <h2 style={{ color: '#333', marginBottom: '0.5rem' }}>🎬 Voting Results</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>{totalVoters} people voted</p>
        
        <button 
          onClick={() => navigate(`/party/${partyId}`)} 
          style={{ 
            background: '#b49504', 
            color: '#fff', 
            fontWeight: 600, 
            fontSize: '1rem', 
            border: 'none', 
            borderRadius: '20px', 
            padding: '0.7em 1.5em', 
            cursor: 'pointer', 
            marginBottom: 24,
            boxShadow: '0 2px 8px rgba(180, 149, 4, 0.3)'
          }}
        >
          Back to Party
        </button>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, marginTop: 32 }}>
          {results.map((movie, idx) => (
            <div key={movie.id} style={{ 
              width: 200, 
              background: '#fff', 
              borderRadius: 16, 
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)', 
              padding: 12,
              border: idx === 0 ? '3px solid #ffd700' : '1px solid #eee',
              position: 'relative'
            }}>
              {idx === 0 && (
                <div style={{
                  position: 'absolute',
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#ffd700',
                  color: '#333',
                  fontWeight: 'bold',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  zIndex: 1
                }}>
                  🏆 WINNER
                </div>
              )}
              <img 
                src={movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'} 
                alt={movie.title} 
                style={{ width: '100%', borderRadius: 12, marginBottom: '8px' }} 
              />
              <div style={{ fontWeight: 600, margin: '0.5em 0 0.2em 0', fontSize: '14px' }}>
                #{idx + 1} {movie.title}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: '8px' }}>
                {movie.release_date ? movie.release_date.slice(0, 4) : ''}
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: 12, 
                fontWeight: 500,
                background: '#f8f9fa',
                padding: '6px 8px',
                borderRadius: '8px'
              }}>
                <span style={{ color: '#2ecc71' }}>👍 {movie.like}</span>
                <span style={{ color: '#ffb300' }}>➖ {movie.pass}</span>
                <span style={{ color: '#ff3a5e' }}>👎 {movie.dislike}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Selection UI (creator only)
  if (showSelection && movies.length > 0 && userId === creatorId) {
    return (
      <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '5rem', padding: '0 1rem' }}>
        <h2 style={{ color: '#333', marginBottom: '1rem' }}>🎬 Select Movies for Voting</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>Choose the movies you want your friends to vote on</p>
        
        <button 
          onClick={() => setShowSelection(false)} 
          style={{ 
            background: '#b49504', 
            color: '#fff', 
            fontWeight: 600, 
            fontSize: '1rem', 
            border: 'none', 
            borderRadius: '20px', 
            padding: '0.7em 1.5em', 
            cursor: 'pointer', 
            marginBottom: 24,
            boxShadow: '0 2px 8px rgba(180, 149, 4, 0.3)'
          }}
        >
          Back to Filters
        </button>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20, marginTop: 32 }}>
          {movies.map(movie => {
            const selected = selectedMovies.find(m => m.id === movie.id);
            return (
              <div key={movie.id} style={{ 
                width: 140, 
                background: selected ? '#fff3cd' : '#fff', 
                borderRadius: 12, 
                boxShadow: selected ? '0 4px 16px rgba(180, 149, 4, 0.3)' : '0 2px 8px rgba(0,0,0,0.08)', 
                padding: 8, 
                cursor: 'pointer', 
                border: selected ? '2px solid #b49504' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }} 
              onClick={() => toggleSelectMovie(movie)}
              >
                <img 
                  src={movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : 'https://via.placeholder.com/140x210?text=No+Image'} 
                  alt={movie.title} 
                  style={{ width: '100%', borderRadius: 8 }} 
                />
                <div style={{ fontWeight: 600, fontSize: 12, margin: '0.5em 0 0.2em 0', lineHeight: '1.2' }}>
                  {movie.title}
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  {movie.release_date ? movie.release_date.slice(0, 4) : ''}
                </div>
                {selected && (
                  <div style={{ 
                    color: '#b49504', 
                    fontWeight: 700, 
                    fontSize: 11, 
                    marginTop: '4px',
                    background: '#b49504',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    display: 'inline-block'
                  }}>
                    ✓ Selected
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <button 
          onClick={lockInMovies} 
          disabled={selectedMovies.length === 0} 
          style={{ 
            background: selectedMovies.length ? '#28a745' : '#ccc', 
            color: '#fff', 
            fontWeight: 600, 
            fontSize: '1.1rem', 
            border: 'none', 
            borderRadius: '24px', 
            padding: '0.8em 2em', 
            cursor: selectedMovies.length ? 'pointer' : 'not-allowed', 
            marginTop: 32,
            boxShadow: selectedMovies.length ? '0 4px 16px rgba(40, 167, 69, 0.3)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          🔒 Lock In {selectedMovies.length} Movie{selectedMovies.length !== 1 ? 's' : ''}
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '5rem', padding: '0 1rem' }}>
      <h2 style={{ color: '#333', marginBottom: '0.5rem' }}>🎬 Movie Voting Party</h2>
      <p style={{ color: '#666', marginBottom: '1rem' }}>Party ID: <strong>{partyId}</strong></p>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Share this link with your friends to join the party!</p>
      
      <button 
        onClick={copyLink} 
        style={{ 
          background: '#b49504', 
          color: '#fff', 
          fontWeight: 600, 
          fontSize: '1rem', 
          border: 'none', 
          borderRadius: '20px', 
          padding: '0.7em 1.5em', 
          cursor: 'pointer', 
          marginBottom: 12,
          boxShadow: '0 2px 8px rgba(180, 149, 4, 0.3)'
        }}
      >
        📋 Copy Party Link
      </button>
      {copied && <span style={{ color: '#28a745', marginLeft: 8, fontWeight: '600' }}>✓ Copied!</span>}
      
      {/* If movies are not locked, show filter/fetch UI for creator only */}
      {!lockedMovies && !showSelection && userId === creatorId && (
        <>
          <div style={{ 
            margin: '2rem auto', 
            maxWidth: 400, 
            background: '#f8f9fa', 
            borderRadius: 16, 
            padding: 24, 
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ color: '#333', marginBottom: '1rem' }}>🔍 Filter Movies</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Genre: </label>
              <select 
                name="genre" 
                value={filters.genre} 
                onChange={handleChange}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="">Any Genre</option>
                {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Year: </label>
              <input 
                name="year" 
                type="number" 
                min="1900" 
                max={new Date().getFullYear()} 
                value={filters.year} 
                onChange={handleChange} 
                placeholder="Any year"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }} 
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Language: </label>
              <select 
                name="language" 
                value={filters.language} 
                onChange={handleChange}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="hi">Hindi</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
            <button 
              onClick={fetchMovies} 
              disabled={loading}
              style={{ 
                background: '#b49504', 
                color: '#fff', 
                fontWeight: 600, 
                fontSize: '1rem', 
                border: 'none', 
                borderRadius: '20px', 
                padding: '0.7em 1.5em', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                marginTop: 8,
                width: '100%',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? '🔍 Searching...' : '🔍 Find Movies'}
            </button>
          </div>
        </>
      )}
      
      {/* If movies are locked, show voting UI for all users except creator (creator can return to selection) */}
      {lockedMovies && !showResults && (
        <>
          <h3 style={{ marginTop: 32, color: '#333' }}>🗳️ Vote for your favorites!</h3>
          {userId === creatorId && (
            <button 
              onClick={returnToSelection} 
              style={{ 
                background: '#6c757d', 
                color: '#fff', 
                fontWeight: 600, 
                fontSize: '1rem', 
                border: 'none', 
                borderRadius: '20px', 
                padding: '0.7em 1.5em', 
                cursor: 'pointer', 
                marginBottom: 24,
                boxShadow: '0 2px 8px rgba(108, 117, 125, 0.3)'
              }}
            >
              ⚙️ Return to Selection
            </button>
          )}
          {userId !== creatorId && hasVoted && (
            <div style={{ marginTop: 32 }}>
              <h4 style={{ color: '#28a745' }}>✅ Thanks for voting!</h4>
              <button 
                onClick={goToResults} 
                style={{ 
                  background: '#b49504', 
                  color: '#fff', 
                  fontWeight: 600, 
                  fontSize: '1rem', 
                  border: 'none', 
                  borderRadius: '20px', 
                  padding: '0.7em 1.5em', 
                  cursor: 'pointer', 
                  marginTop: 8,
                  boxShadow: '0 2px 8px rgba(180, 149, 4, 0.3)'
                }}
              >
                📊 See Results
              </button>
            </div>
          )}
          {userId !== creatorId && !hasVoted && votingIndex < lockedMovies.length && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 }}>
              <div style={{ 
                width: 280, 
                background: '#fff', 
                borderRadius: 20, 
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)', 
                padding: 16,
                border: '1px solid #e9ecef'
              }}>
                <img 
                  src={lockedMovies[votingIndex].poster_path ? `https://image.tmdb.org/t/p/w300${lockedMovies[votingIndex].poster_path}` : 'https://via.placeholder.com/280x420?text=No+Image'} 
                  alt={lockedMovies[votingIndex].title} 
                  style={{ width: '100%', borderRadius: 16, marginBottom: '12px' }} 
                />
                <div style={{ fontWeight: 600, fontSize: 18, margin: '0.5em 0 0.2em 0', color: '#333' }}>
                  {lockedMovies[votingIndex].title}
                </div>
                <div style={{ fontSize: 15, color: '#666', marginBottom: '16px' }}>
                  {lockedMovies[votingIndex].release_date ? lockedMovies[votingIndex].release_date.slice(0, 4) : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
                <button 
                  className="action-btn dislike" 
                  style={{ 
                    fontSize: 32, 
                    width: 64, 
                    height: 64, 
                    borderRadius: '50%', 
                    background: '#fff', 
                    color: '#ff3a5e', 
                    border: '2px solid #ff3a5e', 
                    boxShadow: '0 4px 16px rgba(255, 58, 94, 0.2)', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }} 
                  onClick={() => handleVote('dislike')}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                  ❌
                </button>
                <button 
                  className="action-btn pass" 
                  style={{ 
                    fontSize: 32, 
                    width: 64, 
                    height: 64, 
                    borderRadius: '50%', 
                    background: '#fff', 
                    color: '#ffb300', 
                    border: '2px solid #ffb300', 
                    boxShadow: '0 4px 16px rgba(255, 179, 0, 0.2)', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }} 
                  onClick={() => handleVote('pass')}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                  ➖
                </button>
                <button 
                  className="action-btn like" 
                  style={{ 
                    fontSize: 32, 
                    width: 64, 
                    height: 64, 
                    borderRadius: '50%', 
                    background: '#fff', 
                    color: '#2ecc71', 
                    border: '2px solid #2ecc71', 
                    boxShadow: '0 4px 16px rgba(46, 204, 113, 0.2)', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }} 
                  onClick={() => handleVote('like')}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                  ❤️
                </button>
              </div>
              <div style={{ marginTop: 16, fontSize: 14, color: '#666', fontWeight: '500' }}>
                Movie {votingIndex + 1} of {lockedMovies.length}
              </div>
            </div>
          )}
        </>
      )}
      {loading && <div style={{ marginTop: '2rem', fontSize: '16px', color: '#666' }}>⏳ Loading...</div>}
      {error && <div style={{ marginTop: '2rem', color: '#dc3545', fontWeight: '500' }}>❌ {error}</div>}
    </div>
  );
};

export default PartySession; 