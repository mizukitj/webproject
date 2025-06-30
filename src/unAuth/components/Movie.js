import React, { useState } from 'react';
import './Movie.css';

const movies = [
  {
    id: 1,
    title: 'The Dark Knight',
    year: '2008',
    origin: 'USA',
    genre: 'Action, Crime, Drama',
    rating: '9.0',
    image: 'https://m.media-amazon.com/images/I/51EbJjlLw-L._AC_SY679_.jpg',
  },
  {
    id: 2,
    title: 'Inception',
    year: '2010',
    origin: 'USA',
    genre: 'Action, Adventure, Sci-Fi',
    rating: '8.8',
    image: 'https://m.media-amazon.com/images/I/81p+xe8cbnL._AC_SY679_.jpg',
  },
  {
    id: 3,
    title: 'Parasite',
    year: '2019',
    origin: 'South Korea',
    genre: 'Drama, Thriller',
    rating: '8.6',
    image: 'https://m.media-amazon.com/images/I/91KkWf50SoL._AC_SY679_.jpg',
  },
];

const Movie = () => {
  const [current, setCurrent] = useState(0);
  const movie = movies[current];

  // Swipe logic (basic)
  const handleYes = () => {
    setCurrent((prev) => (prev + 1) % movies.length);
  };
  const handleNo = () => {
    setCurrent((prev) => (prev + 1) % movies.length);
  };
  const handlePass = () => {
    setCurrent((prev) => (prev + 1) % movies.length);
  };

  // Touch events for swipe
  let startX = null;
  const onTouchStart = (e) => {
    startX = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (startX === null) return;
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;
    if (diff > 60) handleYes(); // swipe right
    else if (diff < -60) handleNo(); // swipe left
    startX = null;
  };

  return (
    <div className="tinder-card-container">
      <div
        className="tinder-card"
        style={{ backgroundImage: `url(${movie.image})` }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="tinder-card-gradient">
          <div className="tinder-card-info">
            <h2>{movie.title} <span>{movie.year}</span></h2>
            <div className="tinder-card-meta">{movie.origin} &bull; {movie.genre}</div>
            <div className="tinder-card-rating">⭐ {movie.rating}</div>
          </div>
        </div>
      </div>
      <div className="tinder-card-actions">
        <button className="action-btn dislike" onClick={handleNo} aria-label="Dislike">✖️</button>
        <button className="action-btn pass" onClick={handlePass} aria-label="Pass">➖</button>
        <button className="action-btn like" onClick={handleYes} aria-label="Like">💚</button>
      </div>
    </div>
  );
};

export default Movie;
