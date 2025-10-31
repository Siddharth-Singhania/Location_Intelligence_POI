// frontend/src/components/SearchForm.jsx
import React, { useState } from 'react';
import '../styles/SearchForm.css';

function SearchForm({ onSearch }) {
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (address && category) {
      onSearch(address, category);
    }
  };

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <h2>Find Points of Interest</h2>
      <div className="form-group">
        <label htmlFor="address">Address</label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g., 1600 Amphitheatre Parkway"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="category">Category</label>
        <input
          id="category"
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g., restaurants, parks, cafes"
          required
        />
      </div>
      <button type="submit">Search</button>
    </form>
  );
}

export default SearchForm;
