'use client';

import { useEffect, useState } from 'react';

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
  { n: '01', title: 'Add your property', copy: 'Rooms, beds and rents — a two-minute setup that builds your floor plan.' },
  { n: '02', title: 'Move tenants in', copy: 'Allot a bed and the copilot prorates the first month and opens the dues automatically.' },
  { n: '03', title: 'Ask, and it’s done', copy: 'Reminders, receipts and follow-ups become a conversation instead of a spreadsheet.' },
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
        <span className="land-brand"><i>R</i><strong>RentWise</strong><em>OS</em></span>
        <nav>
          <a href="#features">Product</a>
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
          <em>{promptExamples[exampleIndex]}</em>
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
        <h2>Two minutes to a calmer property.</h2>
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

      <section className="land-cta">
        <h2>Own a PG? Give it a chief of staff.</h2>
        <p>Explore the complete owner workflow with realistic sample data. Your changes stay in your browser.</p>
        <div>
          <a className="main-button" href="/dashboard">Open the live workspace</a>
          <a className="quiet-button" href="#features">Review the features</a>
        </div>
      </section>

      <footer className="land-footer">
        <span><i>R</i> RentWise OS</span>
        <p>Built for Indian PGs & hostels · Demo workspace uses sample data only</p>
      </footer>
    </div>
  );
}
