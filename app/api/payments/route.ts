import { env } from 'cloudflare:workers';
import { getSessionOwner } from '../../lib/auth';
import { ensureAppSchema } from '../../lib/ledger';

export async function POST(request: Request) {
  if (!env.DB) return Response.json({ error: 'Database unavailable' }, { status: 500 });
  const ownerId = await getSessionOwner(request);
  if (!ownerId) return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  await ensureAppSchema();
  const body = await request.json().catch(() => ({})) as { tenancyId?: number; amount?: number; paidOn?: string; mode?: string; reference?: string };
  const tenancyId = Number(body.tenancyId);
  const amount = Math.floor(Number(body.amount) || 0);
  if (!tenancyId || amount <= 0) return Response.json({ error: 'Tenancy and a positive amount are required' }, { status: 400 });
  const mode = ['UPI', 'Cash', 'Bank transfer'].includes(String(body.mode)) ? String(body.mode) : 'UPI';
  const tenancy = await env.DB.prepare(`SELECT t.id FROM tenancies t
    JOIN beds b ON b.id = t.bed_id JOIN properties p ON p.id = b.property_id
    WHERE t.id = ? AND p.owner_id = ?`).bind(tenancyId, ownerId).first<{ id: number }>();
  if (!tenancy) return Response.json({ error: 'Tenancy not found' }, { status: 404 });
  await env.DB.prepare('INSERT INTO payments (tenancy_id, amount, paid_on, mode, reference, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(tenancyId, amount, String(body.paidOn ?? new Date().toISOString().slice(0, 10)), mode, String(body.reference ?? '').trim() || null, new Date().toISOString())
    .run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!env.DB) return Response.json({ error: 'Database unavailable' }, { status: 500 });
  const ownerId = await getSessionOwner(request);
  if (!ownerId) return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { paymentId?: number };
  const paymentId = Number(body.paymentId);
  if (!paymentId) return Response.json({ error: 'Payment is required' }, { status: 400 });
  const owned = await env.DB.prepare(`SELECT p.id FROM payments p
    JOIN tenancies t ON t.id = p.tenancy_id JOIN beds b ON b.id = t.bed_id JOIN properties pr ON pr.id = b.property_id
    WHERE p.id = ? AND pr.owner_id = ?`).bind(paymentId, ownerId).first<{ id: number }>();
  if (!owned) return Response.json({ error: 'Receipt not found' }, { status: 404 });
  await env.DB.prepare('DELETE FROM payments WHERE id = ?').bind(paymentId).run();
  return Response.json({ ok: true });
}
