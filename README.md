# PointsOfInterest_POC
A Location Intelligence Proof-of-Concept to score candidate micro-sites (retail, food hubs, kiosks) using multi-source signals: population rasters (GeoTIFF), OpenStreetMap (Overpass) POIs, and routing/accessibility (OpenRouteService). Produces a numeric launch score (0–1) and classification to prioritize pilots and improve ROI.

## Getting started
To get the repo running locally, follow these steps.

### Prerequisites
- Node.js 18+ recommended
- npm or yarn
- Internet access for Overpass and ORS (or use mirrors/local services)
- A population GeoTIFF (e.g., ppp_2020.tif)

### Clone and install

```bash
git clone https://git.web.boeing.com/sandeep.ds2/pointsofinterest_poc.git
cd pointsofinterest_poc
npm install
```

### Run (development)
```bash
npm run dev
or
node ./src/index.js
```

## Project overview
Problem:

- New retail/food sites face uncertainty because localized ROI inputs (footfall, demographics, competitor density, transit) are not combined into a single decision signal.
Solution:
- Score candidate sites using multi-source features (population, POI density, transit/accessibility) to produce an actionable launch score.
- Integrate the score into CRM/marketing workflows to prioritize pilots and track performance.
Vision:

- Data-driven site selection that improves ROI and reduces failed launches.
### Features
- Population density lookup from GeoTIFF rasters
- Competitor & complementary POI counts from OpenStreetMap (Overpass API)
- Accessibility via nearest network snap (OpenRouteService)
- Normalized scoring (0–1) with configurable weights and thresholds
- Debug mode to print Overpass/ORS queries
- Retry + backoff for external API requests, dedupe POI results
### Architecture
Node.js backend (ESM)
Modules:
- populationDensity — GeoTIFF raster lookup
- competitionDensity — Overpass POI queries
- getComplementary — complementary POI queries
- nearestNodalPointORS — ORS snap/nearest for network distance
- Scoring module: normalization, weights, final classification
HTTP API (example endpoint: POST /api/score)


## Install & Run (local)
- Create .env or export variables (example below).
- Start server:

```bash
npm run dev
```
Example .env (or set in CI)
```bash
PORT=8080
MONGODB_URI=<your-mongodb-uri>
ORS_API=<your-ors-key>
```


