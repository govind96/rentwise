import { env } from 'cloudflare:workers';

export async function GET() {
  const url = env.SUPABASE_URL?.replace(/\/$/, ''); const publishableKey = env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return Response.json({ error: 'Authentication is not configured' }, { status: 503 });
  return Response.json({ url, publishableKey }, { headers: { 'Cache-Control': 'no-store' } });
}
