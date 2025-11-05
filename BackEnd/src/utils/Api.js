import path from "path";
import fs from "fs";

import { ApiError } from "./ApiErrors.js";

import * as GeoTIFF from 'geotiff';

const fetchFn = (typeof fetch !== "undefined") ? fetch : (await import("node-fetch")).default;
const complementaryTags = {
  restaurant: [
    '["amenity"="restaurant"]',
    '["amenity"="fast_food"]',
    '["amenity"="cafe"]',
    '["amenity"="bar"]',
    '["amenity"="pub"]',
    '["shop"]'                       // any shop near restaurants is often complementary
  ],

  clothing_store: [
    '["shop"="clothes"]',
    '["shop"="mall"]',
    '["shop"="shoes"]',
    '["shop"="department_store"]',
    '["shop"]'
  ],

  gym: [
    '["leisure"="fitness_centre"]',
    '["amenity"="gym"]',
    '["leisure"="swimming_pool"]',
    '["sport"]'
  ],

  hospital: [
    '["amenity"="hospital"]',
    '["amenity"="clinic"]',
    '["amenity"="pharmacy"]',
    '["emergency"]',
    '["amenity"="parking"]',
    '["highway"="bus_stop"]'
  ],

  school: [
    '["amenity"="school"]',
    '["amenity"="college"]',
    '["amenity"="kindergarten"]'
  ],

  supermarket: [
    '["shop"="supermarket"]',
    '["shop"="grocery"]',
    '["shop"="convenience"]',
    '["shop"]'
  ],

  cafe: [
    '["amenity"="cafe"]',
    '["amenity"="coffee_shop"]',
    '["shop"="bakery"]'
  ],

  bar_pub: [
    '["amenity"="bar"]',
    '["amenity"="pub"]',
    '["amenity"="nightclub"]'
  ],

  fuel: [
    '["amenity"="fuel"]'
  ],

  parking: [
    '["amenity"="parking"]',
    '["amenity"="parking_entrance"]'
  ],

  bank_atm: [
    '["amenity"="bank"]',
    '["amenity"="atm"]'
  ],

  pharmacy: [
    '["amenity"="pharmacy"]'
  ],

  public_transport: [
    '["highway"="bus_stop"]',
    '["public_transport"="platform"]',
    '["railway"="station"]',
    '["public_transport"]'
  ],

  leisure_park: [
    '["leisure"="park"]',
    '["leisure"="playground"]',
    '["leisure"="garden"]'
  ],

  retail_general: [
    '["shop"]',
    '["shop"="mall"]',
    '["shop"="department_store"]'
  ],

  entertainment: [
    '["amenity"="theatre"]',
    '["amenity"="cinema"]'
  ],

  hotel: [
    '["tourism"="hotel"]',
    '["tourism"="guest_house"]',
    '["tourism"="hostel"]'
  ],

  _generic: [
    '["shop"]',
    '["amenity"]',
    '["highway"="bus_stop"]',
    '["public_transport"="platform"]'
  ]
};

function normalizeCategoryKey(raw) {
  const k = String(raw || '').trim().toLowerCase();
  const map = {
    // restaurant variants
    'restaurant': 'restaurant',
    'restaurants': 'restaurant',
    'food': 'restaurant',
    'food & beverage': 'restaurant',
    'eatery': 'restaurant',
    'catering': 'restaurant',

    // clothing / retail
    'clothing': 'clothing_store',
    'clothing store': 'clothing_store',
    'apparel': 'clothing_store',
    'shop': 'retail_general',
    'retail': 'retail_general',

    // gym / fitness
    'gym': 'gym',
    'fitness': 'gym',
    'fitness centre': 'gym',
    'fitness center': 'gym',

    // hospital / clinic
    'hospital': 'hospital',
    'clinic': 'hospital',
    'medical': 'hospital',
    'healthcare': 'hospital',

    // school / education
    'school': 'school',
    'college': 'school',
    'education': 'school',
    'university': 'school',

    // supermarket / grocery
    'supermarket': 'supermarket',
    'grocery': 'supermarket',
    'convenience': 'supermarket',

    // cafe / coffee
    'cafe': 'cafe',
    'coffee': 'cafe',
    'coffee shop': 'cafe',

    // bar / pub
    'bar': 'bar_pub',
    'pub': 'bar_pub',
    'nightlife': 'bar_pub',

    // fuel / petrol
    'fuel': 'fuel',
    'petrol': 'fuel',
    'gas': 'fuel',
    'gas station': 'fuel',

    // parking
    'parking': 'parking',
    'car park': 'parking',
    'park and ride': 'parking',

    // bank / atm
    'bank': 'bank_atm',
    'atm': 'bank_atm',

    // pharmacy
    'pharmacy': 'pharmacy',
    'drugstore': 'pharmacy',

    // public transport
    'public transport': 'public_transport',
    'bus': 'public_transport',
    'train': 'public_transport',
    'transit': 'public_transport',

    // leisure / parks
    'park': 'leisure_park',
    'leisure': 'leisure_park',
    'playground': 'leisure_park',

    // entertainment
    'cinema': 'entertainment',
    'theatre': 'entertainment',
    'entertainment': 'entertainment',

    // hotel
    'hotel': 'hotel',
    'lodging': 'hotel',
    'accommodation': 'hotel'
  };
  return map[k] || k; // return mapped key or the normalized key
}

async function populationDensity(geotiffPath, lat, lon) {
   if (!geotiffPath) throw new ApiError(400, "geotiffPath required");
  const resolved = path.resolve(geotiffPath);
  if (!fs.existsSync(resolved)) throw new ApiError(404, `GeoTIFF not found: ${resolved}`);

  const buffer = fs.readFileSync(resolved);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  if (!GeoTIFF || typeof GeoTIFF.fromArrayBuffer !== 'function') {
    throw new ApiError(500, 'populationDensity: geotiff.fromArrayBuffer is not available — check import');
  }

  const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage()
  const width = image.getWidth();
  const height = image.getHeight();

  const tiePoints = image.getTiePoints();
  const pixelScale = image.getFileDirectory().ModelPixelScale;
  const transform = image.getFileDirectory().ModelTransformation;

  if (pixelScale && tiePoints && tiePoints.length > 0) {
    const tp = tiePoints[0];
    const xScale = pixelScale[0];
    const yScale = -pixelScale[1];
    const xOrigin = tp.x - tp.i * xScale;
    const yOrigin = tp.y - tp.j * pixelScale[1];

    const worldX = Number(lon);
    const worldY = Number(lat);
    const colF = (worldX - xOrigin) / xScale;
    const rowF = (worldY - yOrigin) / yScale;
    const col = Math.floor(colF);
    const row = Math.floor(rowF);

    if (col < 0 || col >= width || row < 0 || row >= height) return null;
    const rasters = await image.readRasters({
        window: [col, row, col + 1, row + 1],
        interleave: true
    });

    if (!rasters || rasters.length === 0) return null;
    const v = Number(rasters[0]);
    return Number.isFinite(v) ? v : null;

  } else if (transform && Array.isArray(transform) && transform.length === 16) {
    const m = transform;
    const worldToPixel = (wx, wy) => {
      const vx = wx, vy = wy, vz = 0, vw = 1;
      const rx = m[0]*vx + m[1]*vy + m[2]*vz + m[3]*vw;
      const ry = m[4]*vx + m[5]*vy + m[6]*vz + m[7]*vw;
      const rw = m[12]*vx + m[13]*vy + m[14]*vz + m[15]*vw;
      return [rx / rw, ry / rw];
    };
    const [colF, rowF] = worldToPixel(Number(lon), Number(lat));
    const col = Math.round(colF);
    const row = Math.round(rowF);
    if (col < 0 || col >= width || row < 0 || row >= height) return null;
    const rasters = await image.readRasters({ window: [col, row, 1, 1], interleave: true });
    if (!rasters || rasters.length === 0) return null;
    const v = Number(rasters[0]);
    return Number.isFinite(v) ? v : null;
  } else {
    throw new ApiError(500, "populationDensity: No georeference info found in GeoTIFF");
  }
}

async function getLocationData(lat, long) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(long)}&zoom=18&addressdetails=1&extratags=1&namedetails=1`;
  try {
    const resp = await fetchFn(url, { headers: { "User-Agent": "demo-app/1.0 (me@example.com)" }});
    if (!resp.ok) throw new ApiError(404, `HTTP ${resp.status}`);
    const data = await resp.json();
    return data;
  } catch (err) {
    throw err;
  }
}

async function nearestNodalPointORS(lat, lon, opts = {}) {
  const url = 'https://api.openrouteservice.org/v2/snap/driving-car';
  const ORS_API = process.env.ORS_API || "";
  const debug = !!opts.debug;
  const fallback = Number.isFinite(opts.fallback) ? opts.fallback : 1000;
  
  if (!ORS_API) {
    if (debug) console.warn('nearestNodalPointORS: no ORS API key, returning fallback', fallback);
    return fallback;
  }

  const latN = Number(lat);
  const lonN = Number(lon);
  if (!Number.isFinite(latN) || !Number.isFinite(lonN)) {
    throw new Error('lat and lon must be finite numbers');
  }
  
  const body = { locations: [[lonN, latN]] }; 

  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Authorization': ORS_API,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });
  
    if (!res.ok) {
      if (debug) console.warn('nearestNodalPointORS: non-ok response', res.status);
      return fallback;
    }
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (err) {
      if (debug) console.error('nearestNodalPointORS: invalid JSON', err);
      return fallback;
    }

    const locEntry = Array.isArray(data.locations) ? data.locations[0] : null;
    const snappedDistance = locEntry?.snapped_distance ?? locEntry?.location_distance ?? null;


    const distance = Number(snappedDistance)

    if (Number.isFinite(distance)) {
      if (debug) console.log('nearestNodalPointORS: distance (m)=', distance);
      return distance;
    }

    if (debug) console.warn('nearestNodalPointORS: distance not found, returning fallback');
    return fallback;

  } catch (err) {
    if (debug) console.error('nearestNodalPointORS: fetch error', err);
    return fallback;
  }
}

// Helper: validate/coerce numeric inputs
function toNumberOrThrow(v, name) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new ApiError(400, `${name} must be a finite number`);
  return n;
}

async function postOverpassWithRetries(query, url = 'https://overpass-api.de/api/interpreter', options = {}) {
  const maxRetries = options.retries ?? 3;
  const userAgent = options.userAgent ?? 'MyApp/1.0 (+https://example.com)';
  let attempt = 0;
  while (true) {
    attempt++;
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': userAgent
      },
      body: query,
    });

    if (res.ok) {
      const json = await res.json();
      return json;
    }

    // read text for diagnostics
    const text = await res.text();

    // if last attempt, throw
    if (attempt >= maxRetries) {
      // use 502 as gateway/proxy error from Overpass rather than 404
      throw new ApiError(502, `Overpass error ${res.status}: ${text}`);
    }

    // on server-side issues (504, 429, 5xx) do an exponential backoff retry
    if ([429, 500, 502, 503, 504].includes(res.status) || /timeout|busy/i.test(text)) {
      const backoffMs = 500 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoffMs));
      continue;
    }

    // for other status codes, don't retry
    throw new ApiError(502, `Overpass error ${res.status}: ${text}`);
  }
}

function buildClausesForPart(rawPart, lat, lon, radius) {
  const p = String(rawPart).trim();
  if (!p) return '';

  // If begins with node/way/relation (possibly with space), extract them
  const m = p.match(/^(node|way|relation)\s*(\[.*\])$/i);
  if (m) {
    // already prefixed: use exactly that element type once
    const elem = m[1].toLowerCase();
    const tagExpr = m[2];
    return `${elem}${tagExpr}(around:${radius},${lat},${lon});`;
  }

  // If starts with '[' assume tag-only; create node/way/relation clauses
  if (p.startsWith('[')) {
    return `node${p}(around:${radius},${lat},${lon});` +
           `way${p}(around:${radius},${lat},${lon});` +
           `relation${p}(around:${radius},${lat},${lon});`;
  }

  // Bare key or key=value (like shop or shop=mall)
  const kv = p.split('=').map(s => s.trim());
  if (kv.length === 1) {
    const expr = `["${kv[0]}"]`;
    return `node${expr}(around:${radius},${lat},${lon});` +
           `way${expr}(around:${radius},${lat},${lon});` +
           `relation${expr}(around:${radius},${lat},${lon});`;
  } else {
    const key = kv[0].replace(/^"|"$/g, '');
    const value = kv.slice(1).join('=').replace(/^"|"$/g, '');
    const expr = `["${key}"="${value}"]`;
    return `node${expr}(around:${radius},${lat},${lon});` +
           `way${expr}(around:${radius},${lat},${lon});` +
           `relation${expr}(around:${radius},${lat},${lon});`;
  }
}

// competitionDensity: queries node+way+relation and returns a deduped count
async function competitionDensity(lat, lon, radius, category, opts = {}) {
  // validate inputs to avoid NaN in query
  const latN = toNumberOrThrow(lat, 'lat');
  const lonN = toNumberOrThrow(lon, 'lon');
  const radiusN = toNumberOrThrow(radius, 'radius');
  const timeoutSec = opts.timeoutSec ?? 60;
  const overpassUrl = opts.url ?? 'https://overpass-api.de/api/interpreter';

  const query = `
    [out:json][timeout:${timeoutSec}];
    (
      node["amenity"="${category}"](around:${radiusN},${latN},${lonN});
      way["amenity"="${category}"](around:${radiusN},${latN},${lonN});
      relation["amenity"="${category}"](around:${radiusN},${latN},${lonN});
    );
    out center;
  `;

  const data = await postOverpassWithRetries(query, overpassUrl, opts);
  const elements = Array.isArray(data.elements) ? data.elements : [];

  // dedupe by type+id
  const seen = new Set();
  let uniqueCount = 0;
  for (const e of elements) {
    if (!e || e.id == null || !e.type) continue;
    const key = `${e.type}:${e.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCount++;
    }
  }

  return { count: uniqueCount, raw: data };
}

// getComplementary: uses complementaryTags entries (tag-only) and queries node/way/relation for each
async function getComplementary(lat, lon, radius, businessKey, opts = {}) {
  const businessType = normalizeCategoryKey(String(businessKey || '').trim().toLowerCase());
  
  const parts = complementaryTags[businessType];

  console.log("businessKey: ",businessType)
  console.log("parts: ",parts)

  if (!parts || parts.length === 0) {
  if (opts.debug) console.warn('getComplementary: no complementaryTags for', businessKey);
    return { count: 0, raw: null, query: null };
    }
  if (!parts || parts.length === 0) return { count: 0, raw: null, query: null };
  const latN = Number(lat);
  const lonN = Number(lon);
  const radiusN = Number(radius);
  if (!Number.isFinite(latN) || !Number.isFinite(lonN) || !Number.isFinite(radiusN)) {
    throw new ApiError(400, 'lat, lon and radius must be finite numbers');
  }

  // Build clauses safely (avoids double prefixes)
  let clauses = '';
  for (const rawPart of parts) {
    clauses += buildClausesForPart(rawPart, latN, lonN, radiusN);
  }

  if (!clauses) return { count: 0, raw: null, query: null };

  const timeoutSec = opts.timeoutSec ?? 60;
  const url = opts.url ?? 'https://overpass-api.de/api/interpreter';
  const query = `[out:json][timeout:${timeoutSec}];(${clauses});out center;`;

  // Debug: return query when debug flag set (or you can log)
  if (opts.debug) console.log('getComplementary query:\n', query);

  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'User-Agent': opts.userAgent || 'MyApp/1.0 (+https://example.com)'
    },
    body: query
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(502, `Overpass error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const elements = Array.isArray(data.elements) ? data.elements : [];
  const seen = new Set();
  let uniqueCount = 0;
  for (const e of elements) {
    if (!e || e.id == null || !e.type) continue;
    const key = `${e.type}:${e.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCount++;
    }
  }

  return { count: uniqueCount, raw: data, query };
}

export { populationDensity, nearestNodalPointORS, competitionDensity, getComplementary, getLocationData };