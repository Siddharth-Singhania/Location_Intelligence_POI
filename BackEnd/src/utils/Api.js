import path from "path";
import fs from "fs";

import { ApiError } from "./ApiErrors.js";

import * as GeoTIFF from 'geotiff';

const fetchFn = (typeof fetch !== "undefined") ? fetch : (await import("node-fetch")).default;


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

async function nearestNodalPointORS(lat, long) {
  const url = 'https://api.openrouteservice.org/v2/snap/driving-car';
  const ORS_API = process.env.ORS_API || "";
  if (!ORS_API) return 1200;
  const body = { geometry: [[long, lat]] };
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Authorization': ORS_API,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      throw new ApiError(404, `ORS error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    if (data && data.features && data.features[0] && data.features[0].properties) {
      return data.features[0].properties?.distance ?? data.features[0].properties?.location_distance ?? 1200;
    }
    return 1200;
  } catch (err) {
    return 1200;
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

const complementaryTags = {
  restaurant: [
    '["office"]',
    '["amenity"="school"]',
    '["amenity"="college"]',
    '["shop"]'
  ],
  clothing_store: [
    '["shop"="mall"]',
    '["amenity"="marketplace"]',
    '["highway"="bus_stop"]'
  ],
  gym: [
    '["landuse"="residential"]',
    '["leisure"="park"]',
    '["amenity"="school"]'
  ],
  // new hospital entry
  hospital: [
    '["amenity"="pharmacy"]',
    '["amenity"="clinic"]',
    '["amenity"="parking"]',
    '["highway"="bus_stop"]'
  ],
  // fallback generic set if nothing matches
  _generic: [
    '["shop"]',
    '["amenity"]',
    '["public_transport"="stop_position"]',
    '["highway"="bus_stop"]'
  ]
};

// getComplementary: uses complementaryTags entries (tag-only) and queries node/way/relation for each
async function getComplementary(lat, lon, radius, businessKey, opts = {}) {

  const businessType = String(businessKey || '').trim().toLowerCase();
  const parts = complementaryTags[businessType];
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