'use client';

import { useEffect, useState } from 'react';
import BrandMark from './components/BrandMark';

const promptExamples = [
  'Who needs a rent reminder?',
  'Which rooms have vacant beds?',
  'What maintenance needs attention today?',
  'How much rent is still pending?',
];

const features = [
  { icon: '✦', title: 'A copilot that knows your building', copy: 'Ask “who owes rent?” and get names, amounts and one-tap receipts — answered from your live records, not guesses.', wide: true },
  { icon: '₹', title: 'Collections on rails', copy: 'Prorated first-month rent, deposits and split payments — the remaining balance is always exact.' },
  { icon: '▦', title: 'Every bed, at a glance', copy: 'Occupancy across rooms and beds, with allotment in seconds.' },
  { icon: '◇', title: 'Maintenance desk', copy: 'From a morning complaint to a closed ticket, with urgent items flagged first.' },
  { icon: '⌑', title: 'Documents & KYC', copy: 'Identity proofs and agreements tracked gently, without chasing WhatsApp threads.' },
  { icon: '☏', title: 'Built for your phone', copy: 'The full workspace fits the device already in your pocket.' },
];

const steps = [
  { n: '01', title: 'Shape your property', copy: 'Choose a uniform layout or mix single, double, triple, four and six-sharing rooms floor by floor.' },
  { n: '02', title: 'Move tenants in', copy: 'Allot a bed and the copilot prorates the first month and opens the dues automatically.' },
  { n: '03', title: 'Ask, and it’s done', copy: 'Reminders, receipts and follow-ups become a conversation instead of a spreadsheet.' },
];

const propertyModels = [
  { code: 'LP', title: 'Ladies PG', layout: 'Double + triple sharing', copy: 'Meals, guardian contacts and a clear KYC checklist.', tone: 'lilac' },
  { code: 'SH', title: 'Student hostel', layout: 'Four + six sharing', copy: 'Mess rules, floor-level occupancy and bed-led billing.', tone: 'mint' },
  { code: 'CL', title: 'Co-living', layout: 'Single + double', copy: 'Bundled utilities, premium amenities and flexible notice.', tone: 'peach' },
  { code: 'IR', title: 'Independent rooms', layout: 'Private inventory', copy: 'Metered electricity, deposits and room-level ledgers.', tone: 'sand' },
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
          <a href="#properties">Properties</a>
          <a href="#how">How it works</a>
        </nav>
        <div className="land-nav-actions">
          <a className="quiet-button" href="#how">See how it works</a>
          <a className="main-button" href="/dashboard">Open live demo</a>
        </div>
      </header>

      <section className="land-hero">
        <p className="overline">RentWise OS · AI-native property operations</p>
        <h1>Your rooms, rent and repairs, <em>on autopilot</em>.</h1>
        <p className="land-sub">RentWise watches collections, occupancy and maintenance for Indian PGs and hostels — and shows you exactly what needs your attention today. Start with a live workspace, no signup required.</p>
        <a className="land-prompt" href="/dashboard" aria-label="Try the live demo">
          <span className="prompt-orb" aria-hidden="true">✦</span>
          <span className="land-prompt-copy" aria-live="polite">
            <em key={promptExamples[exampleIndex]}>{promptExamples[exampleIndex]}</em>
          </span>
          <b>Ask<i>↗</i></b>
        </a>
        <p className="land-hint">Live demo · pre-loaded with a working PG · no login needed</p>
        <div className="land-proof">
          <span><b>18</b> residents</span>
          <span><b>13</b> rooms</span>
          <span><b>₹71,993</b> collected this month</span>
          <span><b>78%</b> collection rate</span>
        </div>
      </section>

      <section className="land-properties" id="properties">
        <header className="land-section-head">
          <div>
            <p className="overline">One system, many property models</p>
            <h2>Built around how Indian PGs actually operate.</h2>
          </div>
          <p>Start with the structure you run today. RentWise adapts the inventory, collection rules and resident policies instead of forcing every property into the same template.</p>
        </header>

        <div className="property-showcase-grid">
          <article className="property-blueprint">
            <div className="blueprint-toolbar">
              <span><i /> Property canvas</span>
              <b>18 of 24 beds live</b>
            </div>
            <div className="blueprint-property">
              <span className="blueprint-monogram">AP</span>
              <div>
                <strong>Aarohi Residency</strong>
                <small>3 floors · mixed sharing · meals included</small>
              </div>
              <em>75% occupied</em>
            </div>
            <div className="blueprint-building" aria-label="Example mixed-sharing property layout">
              {[
                { floor: '03', rooms: ['3B', '3B', '2B'] },
                { floor: '02', rooms: ['4B', '4B', '2B'] },
                { floor: '01', rooms: ['2B', '3B', '1B'] },
              ].map((row, rowIndex) => (
                <div className="blueprint-floor" key={row.floor}>
                  <span>Floor {row.floor}</span>
                  <div>
                    {row.rooms.map((room, roomIndex) => (
                      <i className={rowIndex === 0 && roomIndex === 2 ? 'available' : ''} key={`${row.floor}-${roomIndex}`}>
                        <b>{room}</b><small>{rowIndex === 0 && roomIndex === 2 ? '1 open' : 'occupied'}</small>
                      </i>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <footer>
              <span>Meals · veg + non-veg</span>
              <span>Electricity · metered</span>
              <span>Notice · 30 days</span>
            </footer>
          </article>

          <div className="property-model-list">
            {propertyModels.map((model, index) => (
              <article className={index === 0 ? 'active' : ''} key={model.title}>
                <span className={`model-mark ${model.tone}`}>{model.code}</span>
                <div>
                  <h3>{model.title}</h3>
                  <strong>{model.layout}</strong>
                  <p>{model.copy}</p>
                </div>
                <i>↗</i>
              </article>
            ))}
          </div>
        </div>

        <div className="india-ready-strip">
          <strong>India-ready by design</strong>
          <span>1–6 sharing</span>
          <span>UPI + manual receipts</span>
          <span>Prorated move-ins</span>
          <span>Meals + utilities</span>
          <span>Agreement + verification controls</span>
        </div>
      </section>

      <section className="land-bento" id="features">
        {features.map((feature) => (
          <article key={feature.title} className={feature.wide ? 'land-card wide' : 'land-card'}>
            <span className="land-card-icon">{feature.icon}</span>
            <h2>{feature.title}</h2>
            <p>{feature.copy}</p>
          </article>
        ))}
      </section>

      <section className="land-steps" id="how">
        <p className="overline">How it works</p>
        <h2>A few minutes to a calmer property.</h2>
        <div>
          {steps.map((step) => (
            <article key={step.n}>
              <span>{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="owner-foundations" aria-label="Owner-ready foundations">
        <div>
          <p className="overline">Owner-ready foundations</p>
          <h2>Your operating data stays useful beyond the dashboard.</h2>
        </div>
        <ul>
          <li><b>Portable portfolio backup</b><span>Export and restore every property, room and record as a dated file.</span></li>
          <li><b>Property-specific rules</b><span>Keep different rent, deposit, meal and notice defaults per PG.</span></li>
          <li><b>Document readiness</b><span>Track ID proof, agreements and verification without pretending one rule fits every city.</span></li>
          <li><b>Mobile-first operations</b><span>Allot beds, record rent and review issues from the front desk or on the move.</span></li>
        </ul>
      </section>

      <section className="land-cta">
        <h2>Own a PG? Give it a chief of staff.</h2>
        <p>Explore the complete owner workflow with realistic sample data. Your changes stay in your browser.</p>
        <div>
          <a className="main-button" href="/dashboard">Open the live workspace</a>
          <a className="quiet-button" href="/dashboard?newProperty=1">Set up a new property</a>
        </div>
      </section>

      <footer className="land-footer">
        <span><BrandMark /> RentWise OS</span>
        <p>Built for Indian PGs & hostels · Demo workspace uses sample data only</p>
      </footer>
    </div>
  );
}
