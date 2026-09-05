'use client';

import { FormEvent, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase-client';

export default function AuthForm() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [codeSent, setCodeSent] = useState(false);
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
  async function phone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const phone = String(form.get('phone') || '').replace(/[^\d+]/g, '');
    const token = String(form.get('code') || '').replace(/\D/g, '');
    try {
      const client = await getSupabaseClient();
      if (!codeSent) {
        const { error } = await client.auth.signInWithOtp({ phone });
        if (error) throw error;
        setCodeSent(true);
        setMessage(`We sent a 6-digit code to ${phone}. It may take a few seconds to arrive.`);
      } else {
        const { error } = await client.auth.verifyOtp({ phone, token, type: 'sms' });
        if (error) throw error;
        window.location.assign('/auth/callback');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Phone sign-in is not available right now.');
    } finally { setBusy(false); }
  }
  return <>
    <button className="main-button full auth-cta" type="button" onClick={google} disabled={busy}>Continue with Google</button>
    <div className="auth-divider"><span>or use {channel === 'email' ? 'email' : 'your phone'}</span></div>
    {channel === 'email' ? (
      <form className="auth-form" onSubmit={email}>
        <label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
        <label>Password<input name="password" type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required placeholder="At least 8 characters" /></label>
        <button className="quiet-button full auth-cta" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in with email' : 'Create account'}</button>
      </form>
    ) : (
      <form className="auth-form" onSubmit={phone}>
        <label>Mobile number<input name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="+91 98765 43210" disabled={codeSent} /></label>
        {codeSent && <label>6-digit code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="••••••" autoFocus /></label>}
        <button className="quiet-button full auth-cta" disabled={busy}>{busy ? 'Please wait…' : codeSent ? 'Verify & sign in' : 'Send login code'}</button>
        {codeSent && <button type="button" className="auth-switch" onClick={() => { setCodeSent(false); setMessage(''); }}>Change number or resend</button>}
      </form>
    )}
    {channel === 'email' && <button type="button" className="auth-switch" onClick={() => { setChannel('phone'); setMessage(''); }}>Sign in with your phone instead</button>}
    {channel === 'phone' && <button type="button" className="auth-switch" onClick={() => { setChannel('email'); setCodeSent(false); setMessage(''); }}>Use email instead</button>}
    {channel === 'email' && <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage(''); }}>{mode === 'sign-in' ? 'New to RentWise? Create an account' : 'Already have an account? Sign in'}</button>}
    {message && <p className="auth-message" role="status">{message}</p>}
  </>;
}
