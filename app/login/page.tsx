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
        <p className="auth-panel-foot">SECURE OWNER WORKSPACE</p>
      </section>

      <section className="auth-stage">
        <div className="auth-theme"><ThemeToggle compact /></div>
        <div className="auth-card">
          <span className="land-brand auth-brand"><BrandMark /><strong>RentWise</strong><em>OS</em></span>
          <p className="overline">Owner access</p>
          <h1>Sign in to your workspace</h1>
          <p className="auth-copy">
            Your properties, residents, receipts and documents stay scoped to
            your verified account and are saved automatically.
          </p>
          <Link className="main-button full auth-cta" href="/signin-with-chatgpt?return_to=/dashboard">Sign in securely →</Link>
          <Link className="quiet-button full auth-cta" href="/">Back to the product page</Link>
          <p className="auth-foot">Encrypted in transit · Owner-scoped access · Audit history</p>
        </div>
      </section>
    </div>
  );
}
