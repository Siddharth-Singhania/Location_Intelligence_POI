import React from 'react';
import '../styles/PoiResults.css';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { ClockIcon } from '@heroicons/react/24/outline';
import { TagIcon } from '@heroicons/react/24/outline';

export default function PoiResults({ results = [], loading = false, error = null, onPoiClick = () => {} }) {
  if (loading) return <div className="poi-results">Loading …</div>;
  if (error) return <div className="poi-results error">Error: {error}</div>;

  return (
    <div className="poi-results">
      <h3>Top Results</h3>
      {results.length === 0 ? (
        <div className="empty">No results yet. Search or click map.</div>
      ) : (
        <div className="cards">
          {results.map((poi) => (
            <div key={poi.id ?? `${poi.lat}-${poi.lon}`} className="poi-card" onClick={() => onPoiClick(poi)} tabIndex={0} role="button">
              <div className="poi-head">
                <div className="poi-title">{poi.name || poi.category || 'Unnamed'}</div>
                <div className="poi-dist"><ClockIcon className="small-icon" /> {poi.distance_m ? `${poi.distance_m} m` : ''}</div>
              </div>
              <div className="poi-body">
                <div className="poi-cat"><TagIcon className="small-icon" /> {poi.category}</div>
                <div className="poi-tags muted">{poi.tags ? Object.entries(poi.tags).slice(0,3).map(([k,v])=>`${k}=${v}`).join(', ') : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}