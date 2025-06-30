import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './unAuth/LandingPage';
import PartyCreate from './unAuth/PartyCreate';
import PartySession from './unAuth/PartySession';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/party/new" element={<PartyCreate />} />
        <Route path="/party/:partyId/*" element={<PartySession />} />
      </Routes>
    </Router>
  );
}

export default App;
