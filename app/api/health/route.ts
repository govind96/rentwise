import { env } from 'cloudflare:workers';

export async function GET() {
  try {
    if (!env.DB) throw new Error('missing binding');
    await env.DB.prepare('SELECT 1 AS ok').first();
    return Response.json({ status: 'ok', time: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'degraded' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
