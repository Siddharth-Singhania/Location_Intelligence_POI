// frontend/src/components/MapComponent.jsx
import React, { useRef, useEffect } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';
import '../styles/MapComponent.css';

const render = (status) => {
  if (status === 'LOADING') return <h3>Loading map...</h3>;
  if (status === 'FAILURE') return <h3>Could not load map.</h3>;
  return null;
};

function MapComponent({ poiResults }) {
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Replace with your Google Maps API key
    if (window.google) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 37.4221, lng: -122.0841 }, // Default center (e.g., Googleplex)
        zoom: 12,
      });

      // Clear old markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      if (poiResults.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        
        poiResults.forEach((poi) => {
          const position = { lat: poi.lat, lng: poi.lng };
          const marker = new window.google.maps.Marker({
            position,
            map,
            title: poi.name,
          });
          markersRef.current.push(marker);
          bounds.extend(position);
        });
        
        map.fitBounds(bounds);
      }
    }
  }, [poiResults]);

  return (
    <Wrapper apiKey="YOUR_GOOGLE_MAPS_API_KEY_HERE" render={render}>
      <div ref={mapRef} className="map-container" />
    </Wrapper>
  );
}

export default MapComponent;
