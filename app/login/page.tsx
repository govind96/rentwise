import Link from 'next/link';
import BrandMark from '../components/BrandMark';
import ThemeToggle from '../components/ThemeToggle';
import AuthForm from '../components/AuthForm';

const highlights = [
  { icon: '₹', title: 'Rent ledger', copy: 'Track deposits, prorated move-ins, monthly dues and receipts.' },
  { icon: '▦', title: 'Room and bed occupancy', copy: 'See mixed sharing, dorms and single rooms across every floor.' },
  { icon: '✦', title: 'Daily overview', copy: 'Review dues, vacancies and open repairs from current records.' },
];

export default function Login() {
  return (
    <div className="auth-wrap">
      <section className="auth-panel">
        <Link className="land-brand" href="/" style={{ color: '#fff' }}>
          <BrandMark /><strong>RentWise</strong>
        </Link>
        <div className="auth-story">
          <p className="overline">RentWise</p>
          <h2>Your PG operations, in one workspace.</h2>
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
          <span className="land-brand auth-brand"><BrandMark /><strong>RentWise</strong></span>
          <p className="overline">Owner access</p>
          <h1>Sign in to your workspace</h1>
          <p className="auth-copy">
            Your properties, residents, receipts and documents stay scoped to
            your verified account and are saved automatically.
          </p>
          <AuthForm />
          <Link className="quiet-button full auth-cta" href="/">Back to the product page</Link>
          <p className="auth-foot">Encrypted in transit · Owner-scoped access · Audit history</p>
        </div>
      </section>
    </div>
  );
}
