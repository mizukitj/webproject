import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  doc, setDoc, getDoc, onSnapshot, collection
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
      fetchResults();
    }
  };

  // Fetch results (aggregate votes)
  const fetchResults = async () => {
    const votesCol = collection(db, 'parties', partyId, 'votes');
    const snap = await getDoc(doc(db, 'parties', partyId));
    let movieList = lockedMovies || (snap.data() && snap.data().lockedMovies) || [];
    // Get all votes
    const votesSnap = await (await import('firebase/firestore')).getDocs(votesCol);
    const allVotes = [];
    votesSnap.forEach(doc => {
      allVotes.push(doc.data().votes);
    });
    // Tally votes
    const tally = {};
    movieList.forEach(m => {
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
      <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '5rem' }}>
        <h2>Results</h2>
        <button onClick={() => navigate(`/party/${partyId}`)} style={{ background: '#b49504', color: '#fff', fontWeight: 600, fontSize: '1rem', border: 'none', borderRadius: '20px', padding: '0.7em 1.5em', cursor: 'pointer', marginBottom: 24 }}>Back to Party</button>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, marginTop: 32 }}>
          {results.map((movie, idx) => (
            <div key={movie.id} style={{ width: 180, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 8 }}>
              <img src={movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : 'https://via.placeholder.com/180x270?text=No+Image'} alt={movie.title} style={{ width: '100%', borderRadius: 8 }} />
              <div style={{ fontWeight: 600, margin: '0.5em 0 0.2em 0' }}>{idx + 1}. {movie.title}</div>
              <div style={{ fontSize: 14, color: '#888' }}>{movie.release_date ? movie.release_date.slice(0, 4) : ''}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>👍 {movie.like} | ➖ {movie.pass} | 👎 {movie.dislike}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Selection UI (creator only)
  if (showSelection && movies.length > 0 && userId === creatorId) {
    return (
      <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '5rem' }}>
        <h2>Select Movies for the Party</h2>
        <button onClick={() => setShowSelection(false)} style={{ background: '#b49504', color: '#fff', fontWeight: 600, fontSize: '1rem', border: 'none', borderRadius: '20px', padding: '0.7em 1.5em', cursor: 'pointer', marginBottom: 24 }}>Back to Filters</button>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, marginTop: 32 }}>
          {movies.map(movie => {
            const selected = selectedMovies.find(m => m.id === movie.id);
            return (
              <div key={movie.id} style={{ width: 120, background: selected ? '#ffe082' : '#fff', borderRadius: 12, boxShadow: selected ? '0 2px 12px #b49504' : '0 2px 8px rgba(0,0,0,0.08)', padding: 6, cursor: 'pointer', border: selected ? '2px solid #b49504' : '2px solid transparent' }} onClick={() => toggleSelectMovie(movie)}>
                <img src={movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : 'https://via.placeholder.com/120x180?text=No+Image'} alt={movie.title} style={{ width: '100%', borderRadius: 8 }} />
                <div style={{ fontWeight: 600, fontSize: 13, margin: '0.5em 0 0.2em 0' }}>{movie.title}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{movie.release_date ? movie.release_date.slice(0, 4) : ''}</div>
                {selected && <div style={{ color: '#b49504', fontWeight: 700, fontSize: 12 }}>Selected</div>}
              </div>
            );
          })}
        </div>
        <button onClick={lockInMovies} disabled={selectedMovies.length === 0} style={{ background: selectedMovies.length ? '#2ecc71' : '#ccc', color: '#fff', fontWeight: 600, fontSize: '1.1rem', border: 'none', borderRadius: '20px', padding: '0.7em 2em', cursor: selectedMovies.length ? 'pointer' : 'not-allowed', marginTop: 24 }}>Lock In {selectedMovies.length} Movies</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '5rem' }}>
      <h2>Party ID: {partyId}</h2>
      <p>Share this link with your friends to join the party!</p>
      <button onClick={copyLink} style={{ background: '#b49504', color: '#fff', fontWeight: 600, fontSize: '1rem', border: 'none', borderRadius: '20px', padding: '0.7em 1.5em', cursor: 'pointer', marginBottom: 12 }}>Copy Party Link</button>
      {copied && <span style={{ color: '#2ecc71', marginLeft: 8 }}>Copied!</span>}
      {/* If movies are not locked, show filter/fetch UI for creator only */}
      {!lockedMovies && !showSelection && userId === creatorId && (
        <>
          <div style={{ margin: '2rem auto', maxWidth: 400, background: '#f7f7f7', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3>Filter Movies</h3>
            <div style={{ marginBottom: 12 }}>
              <label>Genre: </label>
              <select name="genre" value={filters.genre} onChange={handleChange}>
                <option value="">Any</option>
                {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Year: </label>
              <input name="year" type="number" min="1900" max={new Date().getFullYear()} value={filters.year} onChange={handleChange} style={{ width: 100 }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Language: </label>
              <select name="language" value={filters.language} onChange={handleChange}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="hi">Hindi</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
                {/* Add more as needed */}
              </select>
            </div>
            <button onClick={fetchMovies} style={{ background: '#b49504', color: '#fff', fontWeight: 600, fontSize: '1rem', border: 'none', borderRadius: '20px', padding: '0.7em 1.5em', cursor: 'pointer', marginTop: 8 }}>Fetch Movies</button>
          </div>
        </>
      )}
      {/* If movies are locked, show voting UI for all users except creator (creator can return to selection) */}
      {lockedMovies && !showResults && (
        <>
          <h3 style={{ marginTop: 32 }}>Vote for your favorites!</h3>
          {userId === creatorId && (
            <button onClick={returnToSelection} style={{ background: '#b49504', color: '#fff', fontWeight: 600, fontSize: '1rem', border: 'none', borderRadius: '20px', padding: '0.7em 1.5em', cursor: 'pointer', marginBottom: 24 }}>Return to Selection</button>
          )}
          {userId !== creatorId && hasVoted && (
            <div style={{ marginTop: 32 }}>
              <h4>Thanks for voting!</h4>
              <button onClick={goToResults} style={{ background: '#b49504', color: '#fff', fontWeight: 600, fontSize: '1rem', border: 'none', borderRadius: '20px', padding: '0.7em 1.5em', cursor: 'pointer', marginTop: 8 }}>See Results</button>
            </div>
          )}
          {userId !== creatorId && !hasVoted && votingIndex < lockedMovies.length && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 }}>
              <div style={{ width: 260, background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 12 }}>
                <img src={lockedMovies[votingIndex].poster_path ? `https://image.tmdb.org/t/p/w300${lockedMovies[votingIndex].poster_path}` : 'https://via.placeholder.com/260x390?text=No+Image'} alt={lockedMovies[votingIndex].title} style={{ width: '100%', borderRadius: 12 }} />
                <div style={{ fontWeight: 600, fontSize: 18, margin: '0.5em 0 0.2em 0' }}>{lockedMovies[votingIndex].title}</div>
                <div style={{ fontSize: 15, color: '#888' }}>{lockedMovies[votingIndex].release_date ? lockedMovies[votingIndex].release_date.slice(0, 4) : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
                <button className="action-btn dislike" style={{ fontSize: 28, width: 56, height: 56, borderRadius: '50%', background: '#fff', color: '#ff3a5e', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }} onClick={() => handleVote('dislike')}>✖️</button>
                <button className="action-btn pass" style={{ fontSize: 28, width: 56, height: 56, borderRadius: '50%', background: '#fff', color: '#ffb300', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }} onClick={() => handleVote('pass')}>➖</button>
                <button className="action-btn like" style={{ fontSize: 28, width: 56, height: 56, borderRadius: '50%', background: '#fff', color: '#2ecc71', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }} onClick={() => handleVote('like')}>💚</button>
              </div>
              <div style={{ marginTop: 16, fontSize: 14, color: '#888' }}>Movie {votingIndex + 1} of {lockedMovies.length}</div>
            </div>
          )}
        </>
      )}
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
};

export default PartySession; 