'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabase-client';

export default function AuthCallback() {
  const [message, setMessage] = useState('Finishing your secure sign-in…');
  useEffect(() => { void (async () => { try { const client = await getSupabaseClient(); const code = new URLSearchParams(window.location.search).get('code'); if (code) { const { error } = await client.auth.exchangeCodeForSession(code); if (error) throw error; } const { data } = await client.auth.getSession(); if (!data.session) throw new Error('Your sign-in session could not be confirmed.'); window.location.replace('/dashboard'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Sign-in could not be completed.'); } })(); }, []);
  return <main className="auth-callback"><p className="overline">RENTWISE</p><h1>{message}</h1><a className="quiet-button" href="/login">Return to sign in</a></main>;
}
