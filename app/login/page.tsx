import Link from 'next/link';
import BrandMark from '../components/BrandMark';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  return (
    <div className="auth-wrap">
      <div className="auth-theme"><ThemeToggle compact /></div>
      <Link className="land-brand auth-brand" href="/"><BrandMark /><strong>RentWise</strong><em>OS</em></Link>
      <section className="auth-card">
        <p className="overline">No account needed</p>
        <h1>Owner accounts are coming later</h1>
        <p className="auth-copy">For this first MVP, the complete RentWise workspace is open as a private-in-your-browser demo. There is no ChatGPT account or sign-in requirement.</p>
        <Link className="main-button full auth-cta" href="/dashboard">Open the live demo →</Link>
        <Link className="quiet-button full auth-cta" href="/">Back to the product page</Link>
        <p className="auth-foot">Sample residents only · Your demo changes stay on this device</p>
      </section>
    </div>
  );
}
