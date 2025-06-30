# Movie Voting Party - Setup Guide

## Overview
This is a React-based movie voting website where users can create parties, select movies, and vote on their favorites with friends. The app uses Firebase for real-time data and TMDB API for movie information.

## Features
- ✅ Create movie voting parties with unique IDs
- ✅ Browse and select movies using TMDB API
- ✅ Share party links with friends
- ✅ Real-time voting with like/dislike/pass options
- ✅ Live results updates
- ✅ Responsive design with modern UI

## Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- TMDB API key

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Go to Project Settings > General
5. Add a web app to your project
6. Copy the Firebase configuration

### 3. TMDB API Setup
1. Go to [TMDB](https://www.themoviedb.org/settings/api)
2. Create an account and request an API key
3. Copy your API key

### 4. Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
REACT_APP_API_KEY=your_firebase_api_key
REACT_APP_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_PROJECT_ID=your_project_id
REACT_APP_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_APP_ID=your_app_id

# TMDB API Key
REACT_APP_TMDB_API_KEY=your_tmdb_api_key
```

### 5. Firestore Security Rules
Update your Firestore security rules to allow read/write access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /parties/{partyId} {
      allow read, write: if true;
      
      match /votes/{voteId} {
        allow read, write: if true;
      }
    }
  }
}
```

### 6. Run the Application
```bash
npm start
```

The app will be available at `http://localhost:3000`

## How to Use

### Creating a Party
1. Click "Create Your Party" on the landing page
2. The app will generate a unique party ID
3. Use the filters to browse movies by genre, year, and language
4. Select movies you want to include in the voting
5. Click "Lock In Movies" to finalize the selection
6. Share the party link with your friends

### Voting
1. Friends click the shared link to join the party
2. They'll see each movie one by one
3. Vote with ❤️ (like), ➖ (pass), or ❌ (dislike)
4. After voting on all movies, they can see the results

### Results
- Results update in real-time as people vote
- Movies are sorted by most likes first
- The winner gets a special gold border and trophy icon

## Technical Details

### Tech Stack
- **Frontend**: React 19, React Router
- **Backend**: Firebase Firestore
- **Styling**: Inline styles with modern design
- **APIs**: TMDB for movie data

### Data Structure
```
parties/{partyId}
├── creatorId: string
├── lockedMovies: array
└── votes/{userId}
    └── votes: object
```

### Key Features
- Real-time updates using Firebase onSnapshot
- Responsive design for mobile and desktop
- User-friendly voting interface
- Automatic vote aggregation and sorting
- Shareable party links

## Troubleshooting

### Common Issues
1. **Movies not loading**: Check your TMDB API key
2. **Firebase errors**: Verify your Firebase configuration
3. **Votes not saving**: Check Firestore security rules
4. **Real-time updates not working**: Ensure Firebase is properly configured

### Development
- The app uses React 19 with hooks
- Firebase Firestore for real-time data
- TMDB API for movie information
- UUID for generating unique party IDs

## Deployment
The app can be deployed to Firebase Hosting, Vercel, or any static hosting service.

```bash
npm run build
```

This will create a `build` folder with the production-ready files. 