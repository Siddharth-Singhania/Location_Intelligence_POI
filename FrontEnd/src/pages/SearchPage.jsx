import React, { useState, useRef } from 'react';
import MapComponent from '../components/MapComponent';
import SearchForm from '../components/SearchForm';
import PoiResults from '../components/PoiResults';
import '../styles/SearchPage.css';
import { HomeIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function SearchPage() {
  const [aggResults, setAggResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mapApiRef = useRef(null);
  const navigate = useNavigate();

  const handleMapResults = (agg) => {
    setAggResults(agg);
    setLoading(false);
    setError(null);
  };

  const handleMapApiReady = (api) => {
    mapApiRef.current = api;
  };

  const handlePoiClick = (poi) => {
    if (mapApiRef.current?.centerOn) {
      mapApiRef.current.centerOn(poi.lat, poi.lon, 16);
      mapApiRef.current.openPopup?.(poi);
    }
  };

  return (
    <div className="search-page">
      <aside className="left-panel">
        <div className="search-header">
          <button
            className="home-btn"
            onClick={() => navigate('/')}
            aria-label="Back to Home"
            title="Home"
          >
            <HomeIcon width={18} height={18} /> Home
          </button>
          <h2 className="page-title">Find Points of Interest</h2>
        </div>

        <SearchForm
          setLoading={setLoading}
          setError={setError}
        />

        <div className="results-wrapper">
          <PoiResults
            results={aggResults?.top_pois ?? []}
            loading={loading}
            error={error}
            onPoiClick={handlePoiClick}
          />
        </div>
      </aside>

      <main className="map-area">
        <MapComponent onResults={handleMapResults} onReady={handleMapApiReady} />
      </main>
    </div>
  );
}