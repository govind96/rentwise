import Link from 'next/link';
import BrandMark from '../components/BrandMark';
import ThemeToggle from '../components/ThemeToggle';

const highlights = [
  { icon: '₹', title: 'Waterfall rent ledger', copy: 'Deposits, prorated move-ins and monthly cycles — allocated oldest-due-first.' },
  { icon: '▦', title: 'Live bed map', copy: 'Mixed sharing, dorms and single rooms across every floor.' },
  { icon: '✦', title: 'Copilot on watch', copy: 'A daily brief of dues, vacancies and repairs, from live records.' },
];

export default function Login() {
  return (
    <div className="auth-wrap">
      <section className="auth-panel">
        <Link className="land-brand" href="/" style={{ color: '#fff' }}>
          <BrandMark /><strong>RentWise</strong><em style={{ color: '#cfc4ff', borderColor: 'rgba(148,133,255,.45)' }}>OS</em>
        </Link>
        <div className="auth-story">
          <p className="overline">RentWise OS</p>
          <h2>Your PG, run like a product.</h2>
          <ul>
            {highlights.map((item) => (
              <li key={item.title}><b aria-hidden="true">{item.icon}</b><span><strong>{item.title}.</strong> {item.copy}</span></li>
            ))}
          </ul>
        </div>
        <p className="auth-panel-foot">PUBLIC MVP · NO ACCOUNT REQUIRED</p>
      </section>

      <section className="auth-stage">
        <div className="auth-theme"><ThemeToggle compact /></div>
        <div className="auth-card">
          <span className="land-brand auth-brand"><BrandMark /><strong>RentWise</strong><em>OS</em></span>
          <p className="overline">No account needed</p>
          <h1>Owner accounts are coming later</h1>
          <p className="auth-copy">
            For this first MVP, the complete RentWise workspace is open as a
            private-in-your-browser demo. There is no sign-in requirement — your
            changes stay on this device.
          </p>
          <Link className="main-button full auth-cta" href="/dashboard">Open the live demo →</Link>
          <Link className="quiet-button full auth-cta" href="/">Back to the product page</Link>
          <p className="auth-foot">Sample residents only · Your demo changes stay on this device</p>
        </div>
      </section>
    </div>
  );
}
