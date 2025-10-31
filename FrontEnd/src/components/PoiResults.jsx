// frontend/src/components/PoiResults.jsx
import React from 'react';
import '../styles//PoiResults.css';

function PoiResults({ results, loading, error }) {
  if (loading) {
    return <div className="poi-results">Loading...</div>;
  }

  if (error) {
    return <div className="poi-results error">Error: {error}</div>;
  }

  return (
    <div className="poi-results">
      <h3>Search Results</h3>
      {results.length > 0 ? (
        <ul>
          {results.map((poi, index) => (
            <li key={index}>
              <h4>{poi.name}</h4>
              <p>{poi.address}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No results found. Try a new search!</p>
      )}
    </div>
  );
}

export default PoiResults;
