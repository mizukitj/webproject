import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

// Helper to get/set a local userId for this browser
function getUserId() {
  let userId = localStorage.getItem('movie_party_userid');
  if (!userId) {
    userId = Math.random().toString(36).slice(2, 12);
    localStorage.setItem('movie_party_userid', userId);
  }
  return userId;
}

const PartyCreate = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const createParty = async () => {
      const partyId = uuidv4().slice(0, 8); // short unique id
      const userId = getUserId();
      // Set creatorId in Firestore
      await setDoc(doc(db, 'parties', partyId), { creatorId: userId }, { merge: true });
      navigate(`/party/${partyId}`);
    };
    createParty();
  }, [navigate]);
  return <div style={{ textAlign: 'center', marginTop: '4rem' }}>Creating your party...</div>;
};

export default PartyCreate; 