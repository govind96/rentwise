'use client';

import { useEffect, useState } from 'react';
import BrandMark from './components/BrandMark';
import ThemeToggle from './components/ThemeToggle';

const promptExamples = [
  'Who needs a rent reminder?',
  'Which rooms have vacant beds?',
  'What maintenance needs attention today?',
  'How much rent is still pending?',
];

const essentials = [
  { icon: '₹', title: 'Rent without guesswork', copy: 'Dues, deposits, prorating, split payments and receipts in one clean ledger.' },
  { icon: '▦', title: 'One live bed map', copy: 'See every room, resident and vacancy—then allot a bed in seconds.' },
  { icon: '✦', title: 'The next task, surfaced', copy: 'RentWise brings pending rent, repairs and documents to your attention.' },
];

const propertyModels = [
  { code: 'PG', title: 'Classic PG', layout: 'Single to triple sharing', copy: 'Meals, utilities and resident verification.', tone: 'lilac' },
  { code: 'HS', title: 'Student hostel', layout: 'Four and six sharing', copy: 'Dense bed inventory with mess operations.', tone: 'mint' },
  { code: 'CL', title: 'Co-living', layout: 'Private and shared rooms', copy: 'Bundled services with flexible policies.', tone: 'peach' },
];

const roomMix = [
  { label: 'Single', detail: '2 rooms · 2 beds', status: 'Full' },
  { label: 'Double', detail: '5 rooms · 10 beds', status: '2 open' },
  { label: 'Triple', detail: '2 rooms · 6 beds', status: '1 open' },
  { label: 'Dorm 6', detail: '1 room · 6 beds', status: '3 open' },
];

export default function Landing() {
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    const cycle = window.setInterval(() => setExampleIndex((index) => (index + 1) % promptExamples.length), 3800);
    return () => window.clearInterval(cycle);
  }, []);

  return (
    <div className="landing">
      <header className="land-nav">
        <span className="land-brand"><BrandMark /><strong>RentWise</strong><em>OS</em></span>
        <nav>
          <a href="#features">Product</a>
          <a href="#properties">Property types</a>
        </nav>
        <div className="land-nav-actions">
          <ThemeToggle compact />
          <a className="main-button" href="/dashboard"><span className="nav-label-full">Open live demo</span><span className="nav-label-short">Open demo</span></a>
        </div>
      </header>

      <section className="land-hero">
        <p className="overline">RentWise OS · Built for Indian PG owners</p>
        <h1>Your rooms, rent and repairs, <em>under control</em>.</h1>
        <p className="land-sub">A clear owner workspace for collections, occupancy, residents and maintenance. No signup needed for the demo.</p>

        <div className="land-owner-callout">
          <div>
            <span>For property owners</span>
            <h2>Own a PG? Give it a chief of staff.</h2>
            <p>Start with the sample workspace or build your own property structure.</p>
          </div>
          <div>
            <a className="main-button" href="/dashboard">Open workspace</a>
            <a className="quiet-button" href="/dashboard?newProperty=1">Set up a property</a>
          </div>
        </div>

        <a className="land-prompt" href="/dashboard" aria-label="Try Ask RentWise in the live demo">
          <span className="prompt-orb" aria-hidden="true">✦</span>
          <span className="land-prompt-copy" aria-live="polite">
            <em key={promptExamples[exampleIndex]}>{promptExamples[exampleIndex]}</em>
          </span>
          <b>Ask<i>↗</i></b>
        </a>
        <p className="land-hint">Live sample property · no login · changes stay on your device</p>
      </section>

      <section className="land-properties" id="properties">
        <header className="land-section-head concise">
          <div>
            <p className="overline">Flexible property setup</p>
            <h2>Model the PG you actually run.</h2>
          </div>
          <p>Mixed sharing, meals, utilities and resident policies—without duplicate room-by-room setup.</p>
        </header>

        <div className="property-showcase-grid">
          <article className="property-blueprint">
            <div className="blueprint-toolbar">
              <span><i /> Property canvas</span>
              <b>Live overview</b>
            </div>
            <div className="blueprint-property">
              <span className="blueprint-monogram">AR</span>
              <div>
                <strong>Aarohi Residency</strong>
                <small>Ladies PG · 3 floors · meals included</small>
              </div>
              <em>75% occupied</em>
            </div>

            <div className="canvas-metrics">
              <div><span>Occupied</span><strong>18 / 24</strong></div>
              <div><span>Collected</span><strong>₹71,993</strong></div>
              <div><span>Needs action</span><strong>3 items</strong></div>
            </div>

            <div className="canvas-mix" aria-label="Example sharing mix">
              {roomMix.map((room) => (
                <article key={room.label}>
                  <span>{room.label}</span>
                  <strong>{room.detail}</strong>
                  <small className={room.status === 'Full' ? 'full' : ''}>{room.status}</small>
                </article>
              ))}
            </div>
            <footer>
              <span>Meals included</span>
              <span>Metered electricity</span>
              <span>30-day notice</span>
            </footer>
          </article>

          <div className="property-model-list">
            <div className="model-list-intro"><span>Choose a starting model</span><strong>Everything stays editable.</strong></div>
            {propertyModels.map((model, index) => (
              <article className={index === 0 ? 'active' : ''} key={model.title}>
                <span className={`model-mark ${model.tone}`}>{model.code}</span>
                <div>
                  <h3>{model.title}</h3>
                  <strong>{model.layout}</strong>
                  <p>{model.copy}</p>
                </div>
                <i>{index + 1}</i>
              </article>
            ))}
          </div>
        </div>

        <div className="india-ready-strip">
          <strong>India-ready defaults</strong>
          <span>1–6 sharing</span>
          <span>UPI + receipts</span>
          <span>Meals + utilities</span>
          <span>Agreement + verification</span>
        </div>
      </section>

      <section className="land-essentials" id="features">
        <header>
          <p className="overline">The daily essentials</p>
          <h2>Less admin. Better visibility.</h2>
        </header>
        <div>
          {essentials.map((feature) => (
            <article key={feature.title}>
              <span>{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="land-footer">
        <span><BrandMark /> RentWise OS</span>
        <p>Built for Indian PGs & hostels · Sample data only</p>
      </footer>
    </div>
  );
}
