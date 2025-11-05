// frontend/src/pages/SearchPage.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/MapComponent';
import SearchForm from '../components/SearchForm';
import PoiResults from '../components/PoiResults';
import '../styles/SearchPage.css';

export default function SearchPage() {
  const [aggResults, setAggResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mapApiRef = useRef(null);
  const navigate = useNavigate();

  const handleMapResults = (agg) => {
    setAggResults(agg || null);
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
          <h2 className="page-title">Find Points of Interest</h2>
        </div>

        {/* Score card (shows when scoreResult present on aggResults) */}
        {aggResults?.scoreResult && (
          <div className="score-card">
            <div className="score-row">
              <div className="score-label">Suitability</div>
              <div className={`score-badge ${aggResults.scoreResult.result === 'Not Suitable' ? 'bad' : 'good'}`}>
                {aggResults.scoreResult.result}
              </div>
            </div>
            <div className="score-value">
              Score: <strong>{typeof aggResults.scoreResult.score === 'number' ? aggResults.scoreResult.score.toFixed(3) : '—'}</strong>
            </div>
            <div className="score-hint">
              {aggResults.scoreResult.result === 'Not Suitable'
                ? 'This location may not meet the desired criteria.'
                : 'This location appears suitable.'}
            </div>
          </div>
        )}

        {/* Search form */}
        <SearchForm setLoading={setLoading} setError={setError} />

        {/* Optional: show saved user doc (if present) */}
        {aggResults?.userDoc && (
          <div className="user-saved-card">
            <div className="user-saved-title">{aggResults.userDoc.address ?? 'Saved location'}</div>
            <div className="user-saved-meta">
              Type: {aggResults.userDoc.type ?? aggResults.userDoc.category ?? '—'} • Importance: {aggResults.userDoc.importance ?? '—'}
            </div>
          </div>
        )}

        {/* Results list */}
        <div className="results-wrapper">
          <PoiResults
            results={aggResults?.top_pois ?? []}
            loading={loading}
            error={error}
            onPoiClick={handlePoiClick}
            userDoc={aggResults?.userDoc}
          />
        </div>
      </aside>

      <main className="map-area">
        <MapComponent onResults={handleMapResults} onReady={handleMapApiReady} />
      </main>
    </div>
  );
}