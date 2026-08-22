import { env } from 'cloudflare:workers';

async function ensureStateTable() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS mvp_state (
    id INTEGER PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
}

export async function GET() {
  await ensureStateTable();
  const row = await env.DB.prepare('SELECT payload FROM mvp_state WHERE id = ?').bind(1).first<{ payload: string }>();
  return Response.json(row ? JSON.parse(row.payload) : { tenants: [] });
}

export async function POST(request: Request) {
  const state = await request.json<{ tenants: unknown[] }>();
  if (!Array.isArray(state.tenants)) return Response.json({ error: 'Invalid state' }, { status: 400 });
  await ensureStateTable();
  await env.DB.prepare(`INSERT INTO mvp_state (id, payload, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`)
    .bind(1, JSON.stringify({ tenants: state.tenants }), new Date().toISOString())
    .run();
  return Response.json({ ok: true });
}
