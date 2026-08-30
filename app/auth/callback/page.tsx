'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabase-client';

export default function AuthCallback() {
  const [message, setMessage] = useState('Finishing your secure sign-in…');
  useEffect(() => { void (async () => { try {
    const client = await getSupabaseClient(); const code = new URLSearchParams(window.location.search).get('code');
    if (code) { const { error } = await client.auth.exchangeCodeForSession(code); if (error) throw error; }
    let { data } = await client.auth.getSession();
    // Support the implicit callback issued by older Supabase OAuth settings as
    // well as the PKCE callback used for all new sign-ins.
    if (!data.session && window.location.hash) {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get('access_token'); const refreshToken = hash.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) throw error;
        data = (await client.auth.getSession()).data;
        window.history.replaceState({}, '', '/auth/callback');
      }
    }
    if (!data.session) throw new Error('Your sign-in session could not be confirmed.');
    const owner = await fetch('/api/auth/me', { headers: { authorization: `Bearer ${data.session.access_token}` } });
    if (owner.ok) { window.location.replace('/dashboard'); return; }
    const resident = await fetch('/api/tenant', { headers: { authorization: `Bearer ${data.session.access_token}` } });
    if (resident.ok) { window.location.replace('/tenant'); return; }
    setMessage('This email does not have RentWise access yet. Ask your property owner to add it to your tenancy.');
  } catch (error) { setMessage(error instanceof Error ? error.message : 'Sign-in could not be completed.'); } })(); }, []);
  return <main className="auth-callback"><p className="overline">RENTWISE</p><h1>{message}</h1><a className="quiet-button" href="/login">Return to sign in</a></main>;
}
