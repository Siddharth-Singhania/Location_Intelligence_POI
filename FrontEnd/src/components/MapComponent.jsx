// src/components/MapComponent.jsx
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
  clothing_store: { query: '["shop"~"^(clothes|fashion|clothing)$"]' },
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

export default function MapComponent({ onResults = () => {}, onReady = () => {} }) {
  const mapRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const poiLayerRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(null);

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const postUserData = async ({ lat, lon, address, category }) => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8080";
      const res = await fetch(`${apiBase}/api/v1/user/getUserData`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: Number(lat),
          long: Number(lon),
          address: String(address || ""),
          category: String(category || "any"),
        }),
      });

      
      if (!res.ok) {
        const text = await res.text().catch(() => null);
        throw new Error(`Backend ${res.status} ${res.statusText} ${text || ""}`);
      }
      const payload = await res.json();
      return payload?.data?.doc ?? null;
    } catch (err) {
      console.warn("postUserData error", err);
      return null;
    }
  };

  const fetchScore = async (payload = {}) => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8080";
      const url = `${apiBase}/api/v1/score/getScore`;
      console.debug("[MapComponent] POST /score payload:", payload);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log(res)
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Score API ${res.status} ${res.statusText} ${text || ""}`);
      }
      const json = await res.json();
      return json?.data ?? null;
    } catch (err) {
      console.warn("fetchScore error", err);
      return null;
    }
  };

  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = L.map("map-root", {
      center: [20, 0],
      zoom: 6,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: false,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 0.9,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
      noWrap: true,
    }).addTo(mapRef.current);

    setTimeout(() => { try { mapRef.current.invalidateSize(); } catch (e) {} }, 100);

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
      centerOn: (lat, lon, zoom = 14) => mapRef.current && mapRef.current.setView([lat, lon], zoom),
      openPopup: (poi) => {
        if (!poi || !mapRef.current || !poi.lat || !poi.lon) return;
        L.popup()
          .setLatLng([poi.lat, poi.lon])
          .setContent(`<strong>${poi.name || poi.category}</strong><div>${poi.tags ? Object.entries(poi.tags).slice(0,3).map(([k,v])=>`${k}=${v}`).join(", ") : ""}</div>`)
          .openOn(mapRef.current);
      },
    };
    onReady(api);

    const onAuto = async (ev) => {
      const d = ev.detail || {};
      console.debug("[MapComponent] poi-autoselect received", d);
      if (d.lat && d.lon) {
        selectLocation(d.lat, d.lon, d.label || d.q || "");
        await gatherAllInfo(d.lat, d.lon, d.label || d.q || "", d.radius || 2000, d.category || "any");
      } else if (d.q) {
        try {
          const arr = await fetchJson(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(d.q)}&addressdetails=1&limit=1`);
          if (arr && arr[0]) {
            const c = arr[0];
            selectLocation(parseFloat(c.lat), parseFloat(c.lon), c.display_name);
            await gatherAllInfo(parseFloat(c.lat), parseFloat(c.lon), c.display_name, d.radius || 2000, d.category || "any");
          }
        } catch (err) { console.warn("geocode error", err); }
      }
    };

    const onCategoryChange = (ev) => {
      const d = ev.detail || {};
      const newCat = d.category;
      const newRadius = Number(d.radius || 2000);
      const sel = selectedRef.current;
      console.debug("[MapComponent] category-change received", d, "selected:", sel);
      if (sel && sel.lat != null && sel.lon != null) {
        try { onResults({ selection: sel, scoreLoading: true }); } catch (e) {}
        gatherAllInfo(sel.lat, sel.lon, sel.label || "", newRadius, newCat).catch(() => {});
      }
    };

    window.addEventListener("poi-autoselect", onAuto);
    window.addEventListener("category-change", onCategoryChange);

    return () => {
      window.removeEventListener("poi-autoselect", onAuto);
      window.removeEventListener("category-change", onCategoryChange);
      mapRef.current && mapRef.current.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectLocation(lat, lon, label = "") {
    if (!mapRef.current) return;
    if (selectedMarkerRef.current) { selectedMarkerRef.current.remove(); selectedMarkerRef.current = null; }
    selectedMarkerRef.current = L.marker([lat, lon]).addTo(mapRef.current);
    const sel = { lat:+lat, lon:+lon, label };
    setSelected(sel); selectedRef.current = sel;
    mapRef.current.setView([lat, lon], 13);
    setTimeout(() => { try { mapRef.current.invalidateSize(); } catch (e) {} }, 150);
    window.dispatchEvent(new CustomEvent("poi-selected", { detail: sel }));
  }

  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (a) => a * Math.PI/180;
    const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function bearingDeg(lat1, lon1, lat2, lon2) {
    const toRad = (a) => a * Math.PI/180, toDeg = (a) => a * 180/Math.PI;
    const y = Math.sin(toRad(lon2-lon1))*Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) - Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2-lon1));
    return (toDeg(Math.atan2(y,x))+360)%360;
  }

  async function queryOverpass(lat, lon, rad, catKey) {
    const q = buildOverpassQuery(lat, lon, rad, catKey);
    const resp = await fetch("https://overpass-api.de/api/interpreter", {
      method:"POST",
      headers: {"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8"},
      body: new URLSearchParams({ data: q })
    });
    if (!resp.ok) throw new Error(`Overpass ${resp.status}`);
    return resp.json();
  }

  async function gatherAllInfo(lat, lon, label = "", rad = 2000, catKey = "any") {
    try {
      // immediate interim emit
      try { onResults({ selection: { lat:+lat, lon:+lon, label: label||"" }, scoreLoading: true, top_pois: [] }); } catch(e) {}
      console.debug('[MapComponent] gatherAllInfo start', { lat, lon, label, rad, catKey });

      const [rev, elev, weatherRaw, overpass] = await Promise.all([
        fetchJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`).catch((e)=>({error:e.message})),
        fetchJson(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`).catch((e)=>({error:e.message})),
        fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`).catch((e)=>({error:e.message})),
        queryOverpass(lat,lon,rad,catKey).catch((e)=>({error:e.message}))
      ]);

      let poisList = [], aerodromes = [];
      if (overpass && Array.isArray(overpass.elements)) {
        for (const el of overpass.elements) {
          const tags = el.tags || {};
          const typ = el.type;
          const id = `${typ}/${el.id}`;
          const lat_ = el.lat ?? (el.center && el.center.lat);
          const lon_ = el.lon ?? (el.center && el.center.lon);
          if (lat_===undefined||lon_===undefined) continue;
          const name = tags.name||tags.ref||"";
          const categoryTag = tags.aeroway ? "aeroway:"+tags.aeroway : tags.amenity||tags.tourism||tags.shop||Object.keys(tags)[0]||"";
          const dist = haversineDistance(lat,lon,lat_,lon_);
          const item = { id, name, category: categoryTag, lat: lat_, lon: lon_, distance_m: Math.round(dist), tags };
          if (tags.aeroway && ["aerodrome","helipad"].includes(tags.aeroway)) aerodromes.push(item); else poisList.push(item);
        }
      }

      function categoryScore(item, chosenCategory) {
        if (!chosenCategory||chosenCategory==="any") return 5;
        const tags=item.tags||{}; const ck=chosenCategory;
        if (ck==="restaurant"&&tags.amenity&&["restaurant","cafe","bar"].includes(tags.amenity)) return 0;
        if (ck==="hotel"&&tags.tourism&&["hotel","guest_house","hostel"].includes(tags.tourism)) return 0;
        if (ck==="clothing"&&tags.shop&&["clothes","fashion","clothing"].includes(tags.shop)) return 0;
        if (ck==="supermarket"&&tags.shop&&["supermarket","convenience","grocery"].includes(tags.shop)) return 0;
        if (ck==="fuel"&&tags.amenity==="fuel") return 0;
        if (ck==="hospital"&&tags.amenity&&["hospital","clinic","doctors"].includes(tags.amenity)) return 0;
        if (ck==="airport"&&tags.aeroway&&["aerodrome","helipad"].includes(tags.aeroway)) return 0;
        if (ck==="attraction"&&tags.tourism&&["attraction","viewpoint","museum"].includes(tags.tourism)) return 0;
        if (ck==="parking"&&tags.amenity==="parking") return 0;
        return item.name ? 2 : 4;
      }

      poisList.sort((a,b)=>{ const ca=categoryScore(a,catKey), cb=categoryScore(b,catKey); if(ca!==cb) return ca-cb; const an=a.name?0:1, bn=b.name?0:1; if(an!==bn) return an-bn; return a.distance_m-b.distance_m; });

      const topPois = poisList.slice(0,10);
      aerodromes.sort((a,b)=>a.distance_m-b.distance_m);
      const nearestAirport = aerodromes.length ? aerodromes[0] : null;
      if (nearestAirport) nearestAirport.bearing_deg = Math.round(bearingDeg(lat,lon,nearestAirport.lat,nearestAirport.lon));

      const agg = {
        selection: { lat:+lat, lon:+lon, label: label||"" },
        address: rev && !rev.error ? rev : null,
        elevation: elev && elev.results && elev.results[0] ? { meters: elev.results[0].elevation } : null,
        weather: weatherRaw && !weatherRaw.error ? weatherRaw : null,
        pois_count: poisList.length,
        top_pois: topPois,
        nearest_aerodrome: nearestAirport,
        overpass_raw: overpass
      };

      try {
        const userDoc = await postUserData({ lat: agg.selection.lat, lon: agg.selection.lon, address: (agg.address && agg.address.display_name) || agg.selection.label || '', category: (catKey||'any') });
        if (userDoc) agg.userDoc = userDoc;
      } catch (err) {}

      agg.scoreLoading = true;
      try { onResults({ ...agg }); console.debug('[MapComponent] interim emitted'); } catch(e){}

      const scorePayload = {
        address: (agg.address && agg.address.display_name) || agg.selection.label || '',
        lat: agg.selection.lat,
        long: agg.selection.lon,
        radius: Number(rad || 1000),
        category: catKey || 'any',
        type: catKey || 'any',
        parts: agg.parts ?? [],
        businessKey: agg.businessKey ?? 'any'
      };

      try {
        const scoreData = await fetchScore(scorePayload);
        console.debug('[MapComponent] scoreData received', scoreData);
        if (scoreData) agg.scoreResult = scoreData;
      } catch (err) { console.warn('fetchScore error', err); }
      agg.scoreLoading = false;

      try { onResults({ ...agg }); console.debug('[MapComponent] final emitted'); } catch(e){}

      window._aggResult = agg;

    } catch (err) {
      console.error("Aggregator error", err);
    }
  } // end gatherAllInfo

  return (<div style={{height:"100%",width:"100%",position:"relative"}}><div id="map-root" style={{height:"100%",width:"100%"}}/></div>);
}