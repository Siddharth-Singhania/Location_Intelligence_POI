// frontend/src/components/SearchForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import '../styles/SearchForm.css';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function SearchForm({ setLoading, setError }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('restaurant'); // default machine value
  const [radius, setRadius] = useState(1000);
  const [suggestions, setSuggestions] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  // Debounced autocomplete (Nominatim)
  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&addressdetails=1&limit=6`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const arr = await res.json();
        setSuggestions(arr || []);
        setFocusedIndex(-1);
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Autocomplete error', err);
      }
    }, 260);
    return () => clearTimeout(t);
  }, [query]);

  // Keep input in sync when map selection occurs
  useEffect(() => {
    const onPoiSelected = (ev) => {
      const d = ev.detail || {};
      if (d.label) {
        setQuery(d.label);
        setSuggestions([]);
      } else if (d.lat && d.lon) {
        setQuery(`${d.lat.toFixed(6)}, ${d.lon.toFixed(6)}`);
      }
    };
    window.addEventListener('poi-selected', onPoiSelected);
    return () => window.removeEventListener('poi-selected', onPoiSelected);
  }, []);

  // Always include category (option value) and numeric radius when dispatching
  const dispatchSelect = (payload) => {
    const enriched = {
      ...payload,
      category,
      radius: Number(radius),
    };
    // debug: console.log('Dispatch poi-autoselect:', enriched);
    window.dispatchEvent(new CustomEvent('poi-autoselect', { detail: enriched }));
  };

  const handleSelectSuggestion = (item) => {
    setQuery(item.display_name);
    setSuggestions([]);
    dispatchSelect({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      label: item.display_name,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading && setLoading(true);
    setError && setError(null);

    // If suggestions exist and none focused, use first suggestion
    if (suggestions.length > 0 && focusedIndex === -1) {
      handleSelectSuggestion(suggestions[0]);
      return;
    }
    // If suggestion focused, select it
    if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
      handleSelectSuggestion(suggestions[focusedIndex]);
      return;
    }

    // Free-text query: dispatch query; MapComponent will geocode and use category/radius
    dispatchSelect({ q: query });
  };

  const handleKeyDown = (e) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
    }
  };

  return (
    <div className="search-form-panel advanced" role="search" aria-label="Search points of interest">
      <form onSubmit={handleSubmit} className="search-form" autoComplete="off">
        <label className="label" htmlFor="poi-search">Address or place</label>

        <div className="input-group">
          <span className="input-icon" aria-hidden>
            <MagnifyingGlassIcon width={18} height={18} />
          </span>
          <input
            id="poi-search"
            ref={inputRef}
            aria-label="Search address"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 1600 Amphitheatre Parkway or Starbucks"
            className="input advanced-input"
          />
        </div>

        {suggestions.length > 0 && (
          <ul className="suggestions advanced-suggestions" role="listbox" aria-label="Search suggestions">
            {suggestions.map((s, i) => (
              <li
                key={s.place_id ?? i}
                role="option"
                aria-selected={focusedIndex === i}
                className={`suggestion-item ${focusedIndex === i ? 'focused' : ''}`}
                onMouseDown={(ev) => { ev.preventDefault(); handleSelectSuggestion(s); }}
              >
                <div className="s-main">{s.display_name}</div>
                <div className="s-meta muted">{s.type ?? s.class}</div>
              </li>
            ))}
          </ul>
        )}

        <div className="row-inline advanced-row">
          <div className="field">
            <label className="label small" htmlFor="poi-category">Category</label>
            <select
              id="poi-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input advanced-select"
            >
              <option value="restaurant">Restaurant</option>
              <option value="clothing_store">Clothing Store</option>
              <option value="gym">Gym / Fitness</option>
              <option value="hospital">Hospital / Clinic</option>
              <option value="school">School / College</option>
              <option value="supermarket">Supermarket / Grocery</option>
              <option value="cafe">Cafe / Coffee</option>
              <option value="bar_pub">Bar / Pub / Nightlife</option>
              <option value="fuel">Fuel / Petrol</option>
              <option value="parking">Parking</option>
              <option value="bank_atm">Bank / ATM</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="public_transport">Public Transport</option>
              <option value="leisure_park">Park / Leisure</option>
              <option value="retail_general">General Retail</option>
              <option value="entertainment">Entertainment</option>
              <option value="hotel">Hotel / Lodging</option>
              <option value="_generic">Generic / Any</option>
            </select>
          </div>

          <div className="field">
            <label className="label small" htmlFor="poi-radius">Radius (meters)</label>
            <input
              id="poi-radius"
              type="number"
              className="input advanced-input-radius"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              min="100"
            />
          </div>
        </div>

        <div className="form-actions advanced-actions">
          <button type="submit" className="btn primary large">Search</button>
          <button
            type="button"
            className="btn ghost large"
            onClick={() => { setQuery(''); setSuggestions([]); inputRef.current?.focus(); }}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}