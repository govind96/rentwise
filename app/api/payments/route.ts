import { env } from 'cloudflare:workers';
import { ensureAppSchema } from '../../lib/ledger';
import { apiError, audit, intValue, isResponse, isoDate, receiptNumber, requireOwner, textValue } from '../../lib/api';

export async function POST(request: Request) {
  const owner = await requireOwner(request, true);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const body = await request.json().catch(() => ({})) as { tenancyId?: number; amount?: number; paidOn?: string; mode?: string; reference?: string; idempotencyKey?: string };
  const tenancyId = Number(body.tenancyId);
  const amount = intValue(body.amount, 0, 10_000_000);
  if (!tenancyId || amount <= 0) return apiError('Tenancy and a positive amount are required');
  const mode = ['UPI', 'Cash', 'Bank transfer'].includes(String(body.mode)) ? String(body.mode) : 'UPI';
  const paidOn = isoDate(body.paidOn) || new Date().toISOString().slice(0, 10);
  const idempotencyKey = textValue(body.idempotencyKey || request.headers.get('idempotency-key'), 100);
  const tenancy = await env.DB.prepare(`SELECT t.id FROM tenancies t
    JOIN beds b ON b.id = t.bed_id JOIN properties p ON p.id = b.property_id
    WHERE t.id = ? AND p.owner_id = ? AND t.status != 'closed'`).bind(tenancyId, owner.id).first<{ id: number }>();
  if (!tenancy) return apiError('Tenancy not found', 404);
  if (idempotencyKey) {
    const existing = await env.DB.prepare('SELECT id, receipt_number FROM payments WHERE idempotency_key = ?').bind(idempotencyKey).first<{ id: number; receipt_number: string | null }>();
    if (existing) return Response.json({ ok: true, paymentId: existing.id, receiptNumber: existing.receipt_number, duplicate: true });
  }
  const inserted = await env.DB.prepare(`INSERT INTO payments
      (tenancy_id, amount, paid_on, mode, reference, status, idempotency_key, created_at)
    VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?)`)
    .bind(tenancyId, amount, paidOn, mode, textValue(body.reference, 160) || null, idempotencyKey || null, new Date().toISOString()).run();
  const paymentId = inserted.meta.last_row_id as number;
  const receipt = receiptNumber(paymentId, paidOn);
  await env.DB.prepare('UPDATE payments SET receipt_number = ? WHERE id = ?').bind(receipt, paymentId).run();
  const property = await env.DB.prepare(`SELECT b.property_id FROM tenancies t JOIN beds b ON b.id = t.bed_id WHERE t.id = ?`)
    .bind(tenancyId).first<{ property_id: number }>();
  await audit(owner, property?.property_id ?? null, 'create', 'payment', paymentId, `Recorded ${amount} via ${mode}`);
  return Response.json({ ok: true, paymentId, receiptNumber: receipt }, { status: 201 });
}

export async function DELETE(request: Request) {
  const owner = await requireOwner(request, true);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const body = await request.json().catch(() => ({})) as { paymentId?: number };
  const paymentId = Number(body.paymentId);
  if (!paymentId) return apiError('Payment is required');
  const owned = await env.DB.prepare(`SELECT p.id, b.property_id FROM payments p
    JOIN tenancies t ON t.id = p.tenancy_id JOIN beds b ON b.id = t.bed_id JOIN properties pr ON pr.id = b.property_id
    WHERE p.id = ? AND pr.owner_id = ? AND p.status = 'confirmed'`).bind(paymentId, owner.id).first<{ id: number; property_id: number }>();
  if (!owned) return apiError('Receipt not found or already voided', 404);
  await env.DB.prepare("UPDATE payments SET status = 'voided', voided_at = ? WHERE id = ? AND status = 'confirmed'")
    .bind(new Date().toISOString(), paymentId).run();
  await audit(owner, owned.property_id, 'void', 'payment', paymentId, 'Voided receipt; original record retained');
  return Response.json({ ok: true, voided: true });
}
