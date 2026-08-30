'use client';

import { FormEvent, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase-client';

export default function AuthForm() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function google() {
    setBusy(true); setMessage('');
    try {
      const client = await getSupabaseClient();
      const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
      if (data.url) window.location.assign(data.url);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Google sign-in could not start.'); setBusy(false); }
  }
  async function email(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget); const email = String(form.get('email') || '').trim(); const password = String(form.get('password') || '');
    try {
      const client = await getSupabaseClient();
      const result = mode === 'sign-in' ? await client.auth.signInWithPassword({ email, password }) : await client.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (result.error) throw result.error;
      if (mode === 'sign-up' && !result.data.session) setMessage('Check your email to confirm your account, then sign in.'); else window.location.assign('/auth/callback');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'We could not sign you in.'); } finally { setBusy(false); }
  }
  return <>
    <button className="main-button full auth-cta" type="button" onClick={google} disabled={busy}>Continue with Google</button>
    <div className="auth-divider"><span>or use email</span></div>
    <form className="auth-form" onSubmit={email}>
      <label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
      <label>Password<input name="password" type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required placeholder="At least 8 characters" /></label>
      <button className="quiet-button full auth-cta" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in with email' : 'Create account'}</button>
    </form>
    <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage(''); }}>{mode === 'sign-in' ? 'New to RentWise? Create an account' : 'Already have an account? Sign in'}</button>
    {message && <p className="auth-message" role="status">{message}</p>}
  </>;
}
