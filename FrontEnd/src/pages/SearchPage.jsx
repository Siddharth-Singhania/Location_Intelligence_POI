// src/pages/SearchPage.jsx
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

        {/* Suitability card - always visible */}
        <div className="score-card" role="status" aria-live="polite">
          <div className="score-row">
            <div className="score-label">Suitability</div>

            {aggResults?.scoreLoading ? (
              <div className="score-badge loading" aria-hidden>
                <span className="spinner" />
                Calculating...
              </div>
            ) : aggResults?.scoreResult ? (
              <div className={`score-badge ${aggResults.scoreResult?.result === 'Not Suitable' ? 'bad' : 'good'}`}>
                {aggResults.scoreResult?.result ?? '—'}
              </div>
            ) : (
              <div className="score-badge neutral">—</div>
            )}
          </div>

          <div className="score-value">
            {aggResults?.scoreLoading ? (
              <>Score: <strong>—</strong></>
            ) : aggResults?.scoreResult ? (
              <>Score: <strong>{typeof aggResults.scoreResult.score === 'number' ? aggResults.scoreResult.score.toFixed(3) : '—'}</strong></>
            ) : (
              <>Score: <strong>—</strong></>
            )}
          </div>

          <div className="score-hint">
            {aggResults?.scoreLoading
              ? 'Calculating suitability...'
              : aggResults?.scoreResult
                ? (aggResults.scoreResult.result === 'Not Suitable'
                    ? 'This location may not meet the desired criteria.'
                    : 'This location appears suitable.')
                : 'No location selected. Enter an address or click the map to calculate.'}
          </div>
        </div>

        {/* Search form */}
        <SearchForm setLoading={setLoading} setError={setError} />

        {/* Results list */}
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