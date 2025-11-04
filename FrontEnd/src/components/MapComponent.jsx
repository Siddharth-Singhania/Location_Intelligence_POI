import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import "leaflet-control-geocoder";
import "../styles/MapComponent.css";

const CATEGORY_MAP = {
  any: { query: null },
  restaurant: { query: '["amenity"~"^(restaurant|cafe|bar)$"]' },
  hotel: { query: '["tourism"~"^(hotel|guest_house|hostel)$"]' },
  clothing: { query: '["shop"~"^(clothes|fashion|clothing)$"]' },
  supermarket: { query: '["shop"~"^(supermarket|convenience|grocery)$"]' },
  fuel: { query: '["amenity"~"^(fuel)$"]' },
  hospital: { query: '["amenity"~"^(hospital|clinic|doctors)$"]' },
  airport: { query: '["aeroway"~"^(aerodrome|helipad)$"]' },
  attraction: { query: '["tourism"~"^(attraction|viewpoint|museum)$"]' },
  parking: { query: '["amenity"~"^(parking)$"]' },
};

function buildOverpassQuery(lat, lon, radius, categoryKey) {
  const cat = CATEGORY_MAP[categoryKey] || CATEGORY_MAP.any;
  const filter = cat.query || "";
  return `
[out:json][timeout:25];
(
  node(around:${radius},${lat},${lon})${filter};
  way(around:${radius},${lat},${lon})${filter};
  relation(around:${radius},${lat},${lon})${filter};
);
out center qt 100;
`;
}

async function fetchJson(url, opts = {}) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export default function MapComponent({
  onResults = () => {},
  onReady = () => {},
}) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const poiLayerRef = useRef(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (mapRef.current) return;
    // create map once
  mapRef.current = L.map('map-root', {
    center: [20, 0],
    zoom: 6,
    minZoom: 2,
    maxZoom: 18,
    worldCopyJump: false, // do not jump copies when crossing antimeridian
    maxBounds: [
      [-90, -180],
      [90, 180]
    ],
    maxBoundsViscosity: 0.9 // how strongly the map is constrained
  });

// standard OSM tiles, but prevent wrapping repeated tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
  noWrap: true, // DO NOT tile-wrap horizontally
}).addTo(mapRef.current);



    // ensure the map reflows after container is painted (fix initial half-render)
    setTimeout(() => {
      try {
        mapRef.current.invalidateSize();
      } catch (e) {
        /* ignore */
      }
    }, 100);

    const geocoder = L.Control.geocoder({
      defaultMarkGeocode: false,
      geocoder: L.Control.Geocoder.nominatim(),
    })
      .on("markgeocode", (e) => {
        const c = e.geocode.center;
        selectLocation(c.lat, c.lng, e.geocode.name || "");
        gatherAllInfo(c.lat, c.lng, e.geocode.name || "", 2000, "any");
      })
      .addTo(mapRef.current);

    mapRef.current.on("click", (e) => {
      selectLocation(e.latlng.lat, e.latlng.lng, "Clicked location");
    });

    const api = {
      centerOn: (lat, lon, zoom = 14) =>
        mapRef.current && mapRef.current.setView([lat, lon], zoom),
      openPopup: (poi) => {
        if (!poi || !mapRef.current || !poi.lat || !poi.lon) return;
        L.popup()
          .setLatLng([poi.lat, poi.lon])
          .setContent(
            `<strong>${poi.name || poi.category}</strong><div>${
              poi.tags
                ? Object.entries(poi.tags)
                    .slice(0, 3)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(", ")
                : ""
            }</div>`
          )
          .openOn(mapRef.current);
      },
    };
    onReady(api);

    // listen for SearchForm custom event
    const onAuto = async (ev) => {
      const d = ev.detail || {};
      if (d.lat && d.lon) {
        selectLocation(d.lat, d.lon, d.label || d.q || "");
        await gatherAllInfo(
          d.lat,
          d.lon,
          d.label || d.q || "",
          d.radius || 2000,
          d.category || "any"
        );
      } else if (d.q) {
        try {
          const arr = await fetchJson(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
              d.q
            )}&addressdetails=1&limit=1`
          );
          if (arr && arr[0]) {
            const c = arr[0];
            selectLocation(
              parseFloat(c.lat),
              parseFloat(c.lon),
              c.display_name
            );
            await gatherAllInfo(
              parseFloat(c.lat),
              parseFloat(c.lon),
              c.display_name,
              d.radius || 2000,
              d.category || "any"
            );
          }
        } catch (err) {
          console.warn("geocode error", err);
        }
      }
    };
    window.addEventListener("poi-autoselect", onAuto);

    return () => {
      window.removeEventListener("poi-autoselect", onAuto);
      mapRef.current && mapRef.current.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectLocation(lat, lon, label = '') {
  if (!mapRef.current) return;
  if (markerRef.current) markerRef.current.remove();
  markerRef.current = L.marker([lat, lon]).addTo(mapRef.current);
  setSelected({ lat: +lat, lon: +lon, label });
  mapRef.current.setView([lat, lon], 13);

  // ensure the map fully redraws (fixes UI clipping)
  setTimeout(() => {
    try { mapRef.current.invalidateSize(); } catch (e) {}
  }, 150);

  // Emit an event so the SearchForm address input is updated
  window.dispatchEvent(new CustomEvent('poi-selected', {
    detail: { lat: +lat, lon: +lon, label: label || '' }
  }));
}

  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (a) => (a * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1),
      dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function bearingDeg(lat1, lon1, lat2, lon2) {
    const toRad = (a) => (a * Math.PI) / 180,
      toDeg = (a) => (a * 180) / Math.PI;
    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.cos(toRad(lon2 - lon1));
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  async function queryOverpass(lat, lon, rad, catKey) {
    const q = buildOverpassQuery(lat, lon, rad, catKey);
    const resp = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: new URLSearchParams({ data: q }),
    });
    if (!resp.ok) throw new Error(`Overpass ${resp.status}`);
    return resp.json();
  }

  async function gatherAllInfo(
    lat,
    lon,
    label = "",
    rad = 2000,
    catKey = "any"
  ) {
    try {
      const [rev, elev, weatherRaw, overpass] = await Promise.all([
        fetchJson(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
        ).catch((e) => ({ error: e.message })),
        fetchJson(
          `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`
        ).catch((e) => ({ error: e.message })),
        fetchJson(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`
        ).catch((e) => ({ error: e.message })),
        queryOverpass(lat, lon, rad, catKey).catch((e) => ({
          error: e.message,
        })),
      ]);

      let poisList = [],
        aerodromes = [];
      if (overpass && Array.isArray(overpass.elements)) {
        for (const el of overpass.elements) {
          const tags = el.tags || {};
          const typ = el.type;
          const id = `${typ}/${el.id}`;
          const lat_ = el.lat ?? (el.center && el.center.lat);
          const lon_ = el.lon ?? (el.center && el.center.lon);
          if (lat_ === undefined || lon_ === undefined) continue;
          const name = tags.name || tags.ref || "";
          const categoryTag = tags.aeroway
            ? "aeroway:" + tags.aeroway
            : tags.amenity ||
              tags.tourism ||
              tags.shop ||
              Object.keys(tags)[0] ||
              "";
          const dist = haversineDistance(lat, lon, lat_, lon_);
          const item = {
            id,
            name,
            category: categoryTag,
            lat: lat_,
            lon: lon_,
            distance_m: Math.round(dist),
            tags,
          };
          if (tags.aeroway && ["aerodrome", "helipad"].includes(tags.aeroway))
            aerodromes.push(item);
          else poisList.push(item);
        }
      }

      function categoryScore(item, chosenCategory) {
        if (!chosenCategory || chosenCategory === "any") return 5;
        const tags = item.tags || {};
        const ck = chosenCategory;
        if (
          ck === "restaurant" &&
          tags.amenity &&
          ["restaurant", "cafe", "bar"].includes(tags.amenity)
        )
          return 0;
        if (
          ck === "hotel" &&
          tags.tourism &&
          ["hotel", "guest_house", "hostel"].includes(tags.tourism)
        )
          return 0;
        if (
          ck === "clothing" &&
          tags.shop &&
          ["clothes", "fashion", "clothing"].includes(tags.shop)
        )
          return 0;
        if (
          ck === "supermarket" &&
          tags.shop &&
          ["supermarket", "convenience", "grocery"].includes(tags.shop)
        )
          return 0;
        if (ck === "fuel" && tags.amenity === "fuel") return 0;
        if (
          ck === "hospital" &&
          tags.amenity &&
          ["hospital", "clinic", "doctors"].includes(tags.amenity)
        )
          return 0;
        if (
          ck === "airport" &&
          tags.aeroway &&
          ["aerodrome", "helipad"].includes(tags.aeroway)
        )
          return 0;
        if (
          ck === "attraction" &&
          tags.tourism &&
          ["attraction", "viewpoint", "museum"].includes(tags.tourism)
        )
          return 0;
        if (ck === "parking" && tags.amenity === "parking") return 0;
        return item.name ? 2 : 4;
      }

      poisList.sort((a, b) => {
        const ca = categoryScore(a, catKey),
          cb = categoryScore(b, catKey);
        if (ca !== cb) return ca - cb;
        const an = a.name ? 0 : 1,
          bn = b.name ? 0 : 1;
        if (an !== bn) return an - bn;
        return a.distance_m - b.distance_m;
      });

      const topPois = poisList.slice(0, 10);
      aerodromes.sort((a, b) => a.distance_m - b.distance_m);
      const nearestAirport = aerodromes.length ? aerodromes[0] : null;
      if (nearestAirport)
        nearestAirport.bearing_deg = Math.round(
          bearingDeg(lat, lon, nearestAirport.lat, nearestAirport.lon)
        );

      const agg = {
        selection: { lat: +lat, lon: +lon, label: label || "" },
        address: rev && !rev.error ? rev : null,
        elevation:
          elev && elev.results && elev.results[0]
            ? { meters: elev.results[0].elevation }
            : null,
        weather: weatherRaw && !weatherRaw.error ? weatherRaw : null,
        pois_count: poisList.length,
        top_pois: topPois,
        nearest_aerodrome: nearestAirport,
        overpass_raw: overpass,
      };

      // update markers
      if (poiLayerRef.current) {
        poiLayerRef.current.clearLayers();
        mapRef.current.removeLayer(poiLayerRef.current);
        poiLayerRef.current = null;
      }
      const group = L.layerGroup();
      topPois.forEach((p) => {
        const m = L.marker([p.lat, p.lon]);
        // In your MapComponent, where you bindPopup:
        m.bindPopup(
          `<div class="popup-content"><strong>${p.name || p.category}</strong><div class="popup-meta">${p.distance_m} m • ${p.category}</div></div>`
        );
        group.addLayer(m);
      });
      group.addTo(mapRef.current);
      poiLayerRef.current = group;
      // after group.addTo(mapRef.current);
      setTimeout(() => {
        try { mapRef.current.invalidateSize(); } catch (e) {}
      }, 150);
      if (topPois.length) {
        const bounds = L.latLngBounds(topPois.map((p) => [p.lat, p.lon]));
        if (selected) bounds.extend([selected.lat, selected.lon]);
        mapRef.current.fitBounds(bounds, { maxZoom: 16 });
      }

      onResults(agg);
      window._aggResult = agg;
    } catch (err) {
      console.error("Aggregator error", err);
    }
  }

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <div id="map-root" style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
