'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let clientPromise: Promise<SupabaseClient> | null = null;

export function getSupabaseClient() {
  if (!clientPromise) {
    clientPromise = fetch('/api/auth/config', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Sign-in is not configured yet.');
        return response.json() as Promise<{ url: string; publishableKey: string }>;
      })
      .then(({ url, publishableKey }) => createClient(url, publishableKey, {
        // The callback route exchanges the code itself, so automatic URL parsing
        // must stay off to prevent a second exchange consuming the verifier.
        auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true },
      }))
      .catch((error) => { clientPromise = null; throw error; });
  }
  return clientPromise;
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  // A missing or misconfigured auth endpoint must not take the workspace down:
  // same-origin requests still authenticate via platform identity headers.
  const bearer = getSupabaseClient()
    .then((client) => client.auth.getSession())
    .then(({ data }) => data.session?.access_token ?? null)
    .catch(() => null);
  const token = await bearer;
  const headers = new Headers(init.headers);
  if (token) headers.set('authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
