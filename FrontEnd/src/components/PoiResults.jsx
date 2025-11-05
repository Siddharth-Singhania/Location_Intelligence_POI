import React from 'react';
import '../styles/PoiResults.css';
import { MapPinIcon, ClockIcon, TagIcon } from '@heroicons/react/24/outline';

/**
 * PoiResults
 * Props:
 * - results: array of POI objects { id, name, category, lat, lon, distance_m, tags }
 * - loading: boolean
 * - error: string|null
 * - onPoiClick: function(poi)
 * - userDoc: optional saved user document returned by backend
 */
export default function PoiResults({
  results = [],
  loading = false,
  error = null,
  onPoiClick = () => {},
  userDoc = null,
}) {
  // if (loading) return <div className="poi-results">Loading …</div>;
  // if (error) return <div className="poi-results error">Error: {error}</div>;

  return (
    <>
    </>
    // <div className="poi-results" aria-live="polite">
    //   <h3>Top Results</h3>

    //   {/* Saved user doc card (if backend returned one) */}
    //   {userDoc && (
    //     <div className="user-saved-card" role="region" aria-label="Saved location">
    //       <div className="user-saved-title">
    //         <MapPinIcon className="inline-icon" /> {userDoc.address ?? 'Saved location'}
    //       </div>
    //       <div className="user-saved-meta">
    //         <span>Type: {userDoc.type ?? userDoc.category ?? '—'}</span>
    //         <span style={{ marginLeft: 10 }}>Importance: {userDoc.importance ?? '—'}</span>
    //       </div>
    //     </div>
    //   )}

    //   {results.length === 0 ? (
    //     <div className="empty">No results yet. Search or click map.</div>
    //   ) : (
    //     <div className="cards" role="list">
    //       {results.map((poi, idx) => (
    //         <div
    //           key={poi.id ?? `${poi.lat}-${poi.lon}-${idx}`}
    //           className="poi-card"
    //           role="button"
    //           tabIndex={0}
    //           onClick={() => onPoiClick(poi)}
    //           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPoiClick(poi); }}
    //         >
    //           <div className="poi-head">
    //             <div className="poi-title" title={poi.name || poi.category || 'Unnamed'}>
    //               {poi.name || poi.category || 'Unnamed'}
    //             </div>
    //             <div className="poi-dist" aria-hidden>
    //               <ClockIcon className="small-icon" /> {poi.distance_m != null ? `${poi.distance_m} m` : '—'}
    //             </div>
    //           </div>

    //           <div className="poi-body">
    //             <div className="poi-cat">
    //               <TagIcon className="small-icon" /> {poi.category ?? '—'}
    //             </div>
    //             <div className="poi-tags muted">
    //               {poi.tags
    //                 ? Object.entries(poi.tags)
    //                     .slice(0, 3)
    //                     .map(([k, v]) => `${k}=${v}`)
    //                     .join(', ')
    //                 : ''}
    //             </div>
    //           </div>
    //         </div>
    //       ))}
    //     </div>
    //   )}
    // </div>
  );
}