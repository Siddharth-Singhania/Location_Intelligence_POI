// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import './App.css';

// HomePage is now a separate component
function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <h1 className="main-title">Points of Interests - Location Intelligence</h1>
      <button className="search-btn" onClick={() => navigate('/search')}>
        Search
      </button>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </Router>
  );
}

export default App;
