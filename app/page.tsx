'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BrandMark from './components/BrandMark';
import ThemeToggle from './components/ThemeToggle';

const promptExamples = [
  'Who needs a rent reminder?',
  'Which rooms have vacant beds?',
  'What maintenance needs attention today?',
  'How much rent is still pending?',
];

const propertyModels = [
  {
    preset: 'classic-pg', code: 'PG', title: 'Classic PG', layout: 'Single to triple sharing', copy: 'Meals, utilities and resident verification.', tone: 'lilac',
    example: 'Aarohi Residency', summary: 'Ladies PG · 3 floors · meals included', occupancy: '75% occupied', occupied: '18 / 24', collected: '₹71,993', attention: '3 items',
    mix: [{ label: 'Single', detail: '2 rooms · 2 beds', status: 'Full' }, { label: 'Double', detail: '5 rooms · 10 beds', status: '2 open' }, { label: 'Triple', detail: '2 rooms · 6 beds', status: '1 open' }, { label: 'Dorm 6', detail: '1 room · 6 beds', status: '3 open' }],
    tags: ['Meals included', 'Metered electricity', '30-day notice'],
  },
  {
    preset: 'student-hostel', code: 'HS', title: 'Student hostel', layout: 'Four and six sharing', copy: 'Dense bed inventory with mess operations.', tone: 'mint',
    example: 'Campus House', summary: 'Men’s hostel · 4 floors · mess included', occupancy: '81% occupied', occupied: '39 / 48', collected: '₹2,18,400', attention: '7 items',
    mix: [{ label: 'Four share', detail: '6 rooms · 24 beds', status: '4 open' }, { label: 'Dorm 6', detail: '4 rooms · 24 beds', status: '5 open' }],
    tags: ['Mess included', 'Power backup', 'Shared bathrooms'],
  },
  {
    preset: 'co-living', code: 'CL', title: 'Co-living', layout: 'Private and shared rooms', copy: 'Bundled services with flexible policies.', tone: 'peach',
    example: 'The Nook Living', summary: 'Co-living · 5 floors · flexible services', occupancy: '86% occupied', occupied: '19 / 22', collected: '₹1,92,500', attention: '2 items',
    mix: [{ label: 'Private', detail: '6 rooms · 6 beds', status: '1 open' }, { label: 'Double', detail: '8 rooms · 16 beds', status: '2 open' }],
    tags: ['Optional meals', 'Attached bathrooms', 'AC & non-AC'],
  },
];

export default function Landing() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [selectedModel, setSelectedModel] = useState(0);
  const activeModel = propertyModels[selectedModel];

  useEffect(() => {
    const cycle = window.setInterval(() => setExampleIndex((index) => (index + 1) % promptExamples.length), 3800);
    return () => window.clearInterval(cycle);
  }, []);

  return (
    <div className="landing">
      <div className="land-glow" aria-hidden="true" />

      <header className="land-nav">
        <Link className="land-brand" href="/">
          <BrandMark /><strong>RentWise</strong>
        </Link>
        <nav className="land-links">
          <a href="#product">Product</a>
          <a href="#how">How it works</a>
          <a href="#properties">Property types</a>
        </nav>
        <div className="land-nav-actions">
          <ThemeToggle compact />
          <a className="main-button" href="/dashboard">
            <span className="nav-label-full">Go to dashboard</span>
            <span className="nav-label-short">Dashboard</span>
          </a>
        </div>
      </header>

      <main>
        {/* ---------- hero ---------- */}
        <section className="hero land-hero">
          <span className="hero-badge"><i aria-hidden="true" />Property management for Indian PGs &amp; hostels</span>
          <h1>Rent, rooms and repairs, <em>in one place</em>.</h1>
          <p className="land-sub">
            See occupancy, collections, residents and repairs clearly — then ask RentWise what needs attention.
          </p>

          <div className="hero-ctas">
            <a className="main-button" href="/dashboard">Go to dashboard →</a>
            <a className="hero-secondary-link" href="/dashboard?newProperty=1">Add your first property <span>→</span></a>
          </div>
          <p className="land-hint">OWNER-ONLY ACCESS · RENT &amp; OCCUPANCY RECORDS · BUILT FOR INDIA</p>
        </section>

        {/* ---------- pure-CSS product preview ---------- */}
        <div className="hero-preview">
          <a className="land-prompt hero-floating-prompt" href="/dashboard" aria-label="Open Ask RentWise in the owner workspace">
            <span className="prompt-orb" aria-hidden="true">✦</span>
            <span className="land-prompt-copy" aria-live="polite">
              <em key={promptExamples[exampleIndex]}>{promptExamples[exampleIndex]}</em>
            </span>
            <b>Open<i>↗</i></b>
          </a>
          <div className="preview-window" role="img" aria-label="Preview of the RentWise owner dashboard">
            <div className="pw-bar">
              <span className="pw-dot" /><span className="pw-dot" /><span className="pw-dot" />
              <span className="pw-url">rentwise.app/dashboard</span>
            </div>
            <div className="pw-body" aria-hidden="true">
              <div className="pw-side">
                <span className="pw-logo"><i /><b>RentWise</b></span>
                <span className="pw-item on"><i />Today</span>
                <span className="pw-item"><i />Property</span>
                <span className="pw-item"><i />Tenants</span>
                <span className="pw-item"><i />Rent</span>
                <span className="pw-item"><i />Repairs</span>
              </div>
              <div className="pw-main">
                <div className="pw-greet"><strong>Saffron Stay PG</strong><span className="pw-live"><i />Live</span></div>
                <div className="pw-number-row">
                  <span className="pw-number">₹71,993</span>
                  <span className="pw-delta">▲ 18.4% collected</span>
                </div>
                <div className="pw-tiles">
                  <div className="pw-tile"><span>Occupancy</span><strong>18 / 24 beds</strong></div>
                  <div className="pw-tile"><span>Pending</span><strong>₹14,850</strong></div>
                  <div className="pw-tile"><span>Open repairs</span><strong>3</strong></div>
                </div>
                <div className="pw-chart"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
                <div className="pw-rows">
                  <div className="pw-row"><span className="pw-avatar" /><div><strong>Mahi Kumari</strong><small>Room 1 · Bed A</small></div><span className="pw-pill ok">Paid</span></div>
                  <div className="pw-row"><span className="pw-avatar" /><div><strong>Aditi Prajapati</strong><small>Room 11 · Bed A</small></div><span className="pw-pill due">₹2,434 due</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- bento features ---------- */}
        <section className="bento" id="product">
          <header className="land-section-head concise">
            <div>
              <p className="overline">The daily essentials</p>
              <h2>Everything you need to run the property.</h2>
            </div>
            <p>Rent cycles, bed maps, repairs and compliance — modelled the way Indian PGs actually run.</p>
          </header>

          <div className="bento-grid">
            <article className="bento-card wide">
              <span className="bento-icon" aria-hidden="true">₹</span>
              <h3>A clear rent ledger</h3>
              <p>Track deposits, prorated move-in rent and monthly dues. Each receipt is applied to the oldest unpaid charge first, including split UPI payments.</p>
              <div className="bento-visual">
                <div className="vz-ledger" aria-hidden="true">
                  <div><i>₹</i><b>Mahi Kumari · Room 1</b><em className="ok">Clear</em></div>
                  <div><i>₹</i><b>Aditi Prajapati · Room 11</b><em className="due">₹2,434 due</em></div>
                  <div><i>₹</i><b>Navya Kumari · Room 12</b><em className="late">Overdue</em></div>
                </div>
              </div>
            </article>

            <article className="bento-card">
              <span className="bento-icon tone-cyan" aria-hidden="true">▦</span>
              <h3>Room and bed occupancy</h3>
              <p>See every occupied and vacant bed, then allot a resident from the same view.</p>
              <div className="bento-visual">
                <div className="vz-beds" aria-hidden="true">
                  <i className="on" /><i className="on" /><i /><i className="on" /><i className="on" /><i /><i className="on" /><i />
                  <i className="on" /><i /><i className="on" /><i className="on" /><i /><i className="on" /><i /><i className="on" />
                </div>
              </div>
            </article>

            <article className="bento-card">
              <span className="bento-icon tone-violet" aria-hidden="true">✦</span>
              <h3>Ask about your property</h3>
              <p>Find current dues, vacancies and repair requests from your records.</p>
              <div className="bento-visual">
                <div className="vz-chat" aria-hidden="true">
                  <span>Who still owes rent this month?</span>
                  <span>3 residents — ₹6,844 total.</span>
                </div>
              </div>
            </article>

            <article className="bento-card">
              <span className="bento-icon tone-amber" aria-hidden="true">◇</span>
              <h3>Maintenance tracking</h3>
              <p>Record each issue and track it from report to resolution.</p>
              <div className="bento-visual">
                <div className="vz-orders" aria-hidden="true"><em>Urgent · 1</em><em>In progress · 2</em><em>Resolved · 7</em></div>
              </div>
            </article>

            <article className="bento-card wide">
              <span className="bento-icon" aria-hidden="true">⌑</span>
              <h3>Resident documents, organised</h3>
              <p>Keep identity proofs, rental agreements and notice periods with each resident, including consent and review status.</p>
              <div className="bento-visual">
                <div className="vz-docs" aria-hidden="true"><em>Aadhaar · Verified</em><em>Agreement · Signed</em><em>Notice · 30 days</em></div>
              </div>
            </article>
          </div>
        </section>

        {/* ---------- how it works ---------- */}
        <section className="steps" id="how">
          <header className="land-section-head concise">
            <div>
              <p className="overline">Property setup</p>
              <h2>Start with your actual room layout.</h2>
            </div>
            <p>Add your rooms, beds and rent rules once, then use the workspace for daily operations.</p>
          </header>
          <div className="steps-grid">
            <article className="step-card">
              <span className="step-num">1</span>
              <h3>Add the property details</h3>
              <p>Set up rooms, sharing types, meals, electricity and resident policies in a guided four-step flow.</p>
              <span className="step-tag">Property setup</span>
            </article>
            <article className="step-card">
              <span className="step-num">2</span>
              <h3>Allot beds and record payments</h3>
              <p>Move-in rent is prorated by date. Record UPI, cash or bank payments against each resident’s outstanding charges.</p>
              <span className="step-tag">Day one</span>
            </article>
            <article className="step-card">
              <span className="step-num">3</span>
              <h3>Review daily actions</h3>
              <p>The dashboard highlights overdue rent, vacant beds and unresolved repairs that need attention.</p>
              <span className="step-tag">Daily overview</span>
            </article>
          </div>
        </section>

        {/* ---------- property types ---------- */}
        <section className="land-properties" id="properties">
          <header className="land-section-head concise">
            <div>
              <p className="overline">Flexible property setup</p>
              <h2>Model the PG you actually run.</h2>
            </div>
            <p>Mixed sharing, meals, utilities and resident policies — without duplicate room-by-room setup.</p>
          </header>

          <div className="property-showcase-grid">
            <article className="property-blueprint">
              <div className="blueprint-toolbar">
                <span><i />Property canvas</span>
                <b>Live overview</b>
              </div>
              <div className="blueprint-property">
                <span className="blueprint-monogram">{activeModel.code}</span>
                <div>
                  <strong>{activeModel.example}</strong>
                  <small>{activeModel.summary}</small>
                </div>
                <em>{activeModel.occupancy}</em>
              </div>

              <div className="canvas-metrics">
                <div><span>Occupied</span><strong>{activeModel.occupied}</strong></div>
                <div><span>Collected</span><strong>{activeModel.collected}</strong></div>
                <div><span>Needs action</span><strong>{activeModel.attention}</strong></div>
              </div>

              <div className="canvas-mix" aria-label="Example sharing mix">
                {activeModel.mix.map((room) => (
                  <article key={room.label}>
                    <span>{room.label}</span>
                    <strong>{room.detail}</strong>
                    <small className={room.status === 'Full' ? 'full' : ''}>{room.status}</small>
                  </article>
                ))}
              </div>
              <footer>
                {activeModel.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </footer>
            </article>

            <div className="property-model-list">
              <div className="model-list-intro"><span>Choose a starting model</span><strong>Everything stays editable.</strong></div>
              {propertyModels.map((model, index) => (
                <article className={selectedModel === index ? 'active' : ''} key={model.title}>
                  <button type="button" className="model-choice" aria-pressed={selectedModel === index} onClick={() => setSelectedModel(index)}>
                    <span className={`model-mark ${model.tone}`}>{model.code}</span>
                    <div>
                      <h3>{model.title}</h3>
                      <strong>{model.layout}</strong>
                      <p>{model.copy}</p>
                    </div>
                    <i>{selectedModel === index ? '✓' : index + 1}</i>
                  </button>
                  {selectedModel === index && <Link className="model-start" href={`/dashboard?newProperty=1&preset=${model.preset}`}>Start with {model.title} →</Link>}
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

        {/* ---------- final CTA ---------- */}
        <section className="cta-band">
          <div className="cta-panel">
            <p className="overline">Ready when you are</p>
            <h2>Manage your PG <em>in one place</em>.</h2>
            <p>Sign in to add your property, allot beds, record payments and keep daily operations up to date.</p>
            <div className="cta-actions">
              <a className="main-button" href="/dashboard">Go to dashboard →</a>
              <a className="quiet-button light" href="/dashboard?newProperty=1">Add a property</a>
            </div>
            <p className="cta-note">OWNER ACCOUNT REQUIRED · NO APP TO INSTALL</p>
          </div>
        </section>
      </main>

      <footer className="land-footer">
        <div className="land-footer-inner">
          <div className="foot-col">
            <span className="land-brand"><BrandMark /><strong>RentWise</strong></span>
            <p className="foot-note">Property management for Indian PGs, hostels and co-living spaces. Rooms, residents, rent, repairs and documents in one workspace.</p>
          </div>
          <div className="land-footer-cols">
            <div className="foot-col">
              <span>Product</span>
              <a href="/dashboard">Dashboard</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="#product">Features</a>
              <a href="#how">How it works</a>
              <a href="#properties">Property types</a>
            </div>
            <div className="foot-col">
              <span>Get started</span>
              <a href="/dashboard?newProperty=1">Set up a property</a>
              <a href="/login">Owner sign-in</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
