import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';

// Small SVG icons (inline for convenience)
const IconMap = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M3 6.5L9 4l6 2 6-2v13l-6 2-6-2-6 2V6.5z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="10.5" r="2.2" fill="currentColor" />
  </svg>
);

const IconSpeed = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M3 12h3m12 0h3M7 12a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 16l1.5-2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconDev = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M8 9l-4 3 4 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 9l4 3-4 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 5v2m0 10v2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Simple testimonial data
const TESTIMONIALS = [
  { name: 'Aisha R., Site Planner', text: 'Identified high-potential retail spots in minutes. Saved weeks of manual research.' },
  { name: 'Dev Team, GeoApps', text: 'Integrated quickly. Map component and POI APIs are developer friendly.' },
  { name: 'Logistics Ops', text: 'Nearest aerodrome detection and POI context helped plan last-mile ops.' }
];

// HomePage main
export default function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ searches: 0, pois: 0, users: 0 });
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const testimonialTimer = useRef(null);
  const demoInputRef = useRef(null);

  // Demo stats increment animation (simulated)
  useEffect(() => {
    let mounted = true;
    const target = { searches: 24321, pois: 128340, users: 1324 };
    let start = { searches: 0, pois: 0, users: 0 };
    const duration = 1400;
    const startTime = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - startTime) / duration);
      if (!mounted) return;
      setStats({
        searches: Math.floor(start.searches + (target.searches - start.searches) * t),
        pois: Math.floor(start.pois + (target.pois - start.pois) * t),
        users: Math.floor(start.users + (target.users - start.users) * t)
      });
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return () => { mounted = false; };
  }, []);

  // testimonial auto-rotate
  useEffect(() => {
    testimonialTimer.current = setInterval(() => {
      setTestimonialIndex(i => (i + 1) % TESTIMONIALS.length);
    }, 4500);
    return () => clearInterval(testimonialTimer.current);
  }, []);

  // Demo search action: dispatch custom event so MapComponent/SearchPage handles it
  const runDemoSearch = (q = '') => {
    const query = q || demoInputRef.current?.value || 'Starbucks near Seattle';
    // Dispatch the same custom event used by SearchForm -> MapComponent
    window.dispatchEvent(new CustomEvent('poi-autoselect', {
      detail: { q: query, radius: 2000, category: 'any' }
    }));
    // Optional: navigate to search page to show full UI
    navigate('/search');
  };

  return (
    <div className="hp-root">
      <header className="hp-header">
        <div className="hp-brand" role="img" aria-label="Points of Interest logo">
          <IconMap />
          <div className="hp-title">POI Explorer</div>
        </div>
        <nav className="hp-nav">
          <button className="nav-btn" onClick={() => navigate('/search')}>Search</button>
          <button className="nav-btn ghost" onClick={() => navigate('/search')}>Docs</button>
        </nav>
      </header>

      <main className="hp-main">
        <section className="hp-hero">
          <div className="hero-left">
            <h1>Discover the right places, faster — with contextual maps</h1>
            <p className="lead">Find, filter, and compare POIs with distance, category, nearby aerodrome, elevation and live context. Built for analysts, product teams, and developers.</p>

            <div className="demo-search">
              <input
                ref={demoInputRef}
                className="demo-input"
                placeholder="Try: 'Starbucks near Seattle' or an address"
                aria-label="Demo search input"
                onKeyDown={(e) => { if (e.key === 'Enter') runDemoSearch(); }}
              />
              <button className="btn primary" onClick={() => runDemoSearch()}>Try Demo</button>
              <button className="btn ghost" onClick={() => navigate('/search')}>Open Full Search</button>
            </div>

            <div className="hp-highlights">
              <div className="stat">
                <div className="stat-value">{stats.searches.toLocaleString()}</div>
                <div className="stat-label">Searches</div>
              </div>
              <div className="stat">
                <div className="stat-value">{stats.pois.toLocaleString()}</div>
                <div className="stat-label">POIs indexed</div>
              </div>
              <div className="stat">
                <div className="stat-value">{stats.users.toLocaleString()}</div>
                <div className="stat-label">Active users</div>
              </div>
            </div>
          </div>

          <div className="hero-right" aria-hidden>
            {/* simple animated SVG "map preview" — lightweight, no libs */}
            <div className="mini-map">
              <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet" className="mini-svg">
                <rect x="0" y="0" width="200" height="120" rx="8" fill="#e6f0f8" />
                <g transform="translate(10,10)">
                  <path d="M0 80 L40 60 L80 72 L120 44 L160 60 L200 48" stroke="#cde6ff" strokeWidth="8" fill="none" strokeLinecap="round" />
                  <circle cx="120" cy="44" r="6" fill="#2563eb" />
                  <circle cx="160" cy="60" r="4" fill="#fff" stroke="#2563eb" strokeWidth="1" />
                </g>
              </svg>
              <div className="mini-legend">Live POI preview</div>
            </div>
          </div>
        </section>

        <section className="hp-features" aria-labelledby="features-heading">
          <h2 id="features-heading">How it helps</h2>
          <div className="features-grid">
            <div className="feature">
              <div className="feature-icon"><IconSpeed /></div>
              <h3>Fast results</h3>
              <p>Instant geospatial queries with smart ranking and filters.</p>
            </div>
            <div className="feature">
              <div className="feature-icon"><IconMap /></div>
              <h3>Context-rich</h3>
              <p>POI tags, distances, elevation and nearby transport hubs in one view.</p>
            </div>
            <div className="feature">
              <div className="feature-icon"><IconDev /></div>
              <h3>Developer-first</h3>
              <p>Embed the map, integrate the API, or run a local dev mode.</p>
            </div>
            <div className="feature cta-card">
              <h3>Want a demo environment?</h3>
              <p>We provide a sample dataset and dev instructions to get you started quickly.</p>
              <div style={{ marginTop: 10 }}>
                <button className="btn primary" onClick={() => navigate('/search')}>Get the Demo</button>
              </div>
            </div>
          </div>
        </section>

        <section className="hp-testimonials" aria-label="Testimonials">
          <h2>What customers say</h2>
          <div className="testimonial">
            <p className="quote">“{TESTIMONIALS[testimonialIndex].text}”</p>
            <div className="quote-author">— {TESTIMONIALS[testimonialIndex].name}</div>
          </div>
        </section>

      </main>

      <footer className="hp-footer">
        <div>© {new Date().getFullYear()} POI Explorer</div>
        <div className="footer-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/contact">Contact</a>
        </div>
      </footer>
    </div>
  );
}