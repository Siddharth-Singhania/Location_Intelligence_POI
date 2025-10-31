// frontend/src/pages/SearchPage.jsx
import React, { useState, useEffect } from 'react';
import MapComponent from '../components/MapComponent';
import SearchForm from '../components/SearchForm';
import PoiResults from '../components/PoiResults';
import '../styles/SearchPage.css'; // Create this CSS file for styling

function SearchPage() {
  const [poiResults, setPoiResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (address, category) => {
    setLoading(true);
    setError(null);
    setPoiResults([]);

    try {
      // Replace with your actual backend API URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/search?address=${address}&category=${category}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch points of interest');
      }

      const data = await response.json();
      setPoiResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-page">
      <div className="search-panel">
        <SearchForm onSearch={handleSearch} />
        <PoiResults results={poiResults} loading={loading} error={error} />
      </div>
      <div className="map-panel">
        <MapComponent poiResults={poiResults} />
      </div>
    </div>
  );
}

export default SearchPage;
