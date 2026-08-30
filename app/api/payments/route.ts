import { env } from 'cloudflare:workers';
import { ensureAppSchema } from '../../lib/ledger';
import { apiError, audit, intValue, isResponse, isoDate, receiptNumber, requireOwner, textValue } from '../../lib/api';

export async function POST(request: Request) {
  const owner = await requireOwner(request, true);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const multipart = request.headers.get('content-type')?.includes('multipart/form-data');
  const form = multipart ? await request.formData().catch(() => null) : null;
  if (multipart && !form) return apiError('Invalid payment form');
  const value = (key: string) => form ? form.get(key) : undefined;
  const body = form ? {
    tenancyId: value('tenancyId'), amount: value('amount'), paidOn: value('paidOn'), mode: value('mode'), reference: value('reference'), idempotencyKey: value('idempotencyKey'),
  } : await request.json().catch(() => ({})) as { tenancyId?: number; amount?: number; paidOn?: string; mode?: string; reference?: string; idempotencyKey?: string };
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
  const proof = form?.get('proof');
  if (proof instanceof File && (!env.FILES || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(proof.type) || proof.size <= 0 || proof.size > 8 * 1024 * 1024)) {
    return apiError('Payment proof must be a PDF, JPG, PNG or WebP file up to 8 MB');
  }
  const inserted = await env.DB.prepare(`INSERT INTO payments
      (tenancy_id, amount, paid_on, mode, reference, status, idempotency_key, created_at)
    VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?)`)
    .bind(tenancyId, amount, paidOn, mode, textValue(body.reference, 160) || null, idempotencyKey || null, new Date().toISOString()).run();
  const paymentId = inserted.meta.last_row_id as number;
  const receipt = receiptNumber(paymentId, paidOn);
  let proofKey: string | null = null;
  if (proof instanceof File) {
    const extension = proof.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8) || 'bin';
    proofKey = `${owner.id}/payments/${paymentId}/${crypto.randomUUID()}.${extension}`;
    await env.FILES!.put(proofKey, proof.stream(), { httpMetadata: { contentType: proof.type }, customMetadata: { ownerId: String(owner.id), paymentId: String(paymentId) } });
  }
  await env.DB.prepare('UPDATE payments SET receipt_number = ?, proof_storage_key = ?, proof_original_name = ?, proof_content_type = ?, proof_size_bytes = ? WHERE id = ?')
    .bind(receipt, proofKey, proof instanceof File ? proof.name.slice(0, 180) : null, proof instanceof File ? proof.type : null, proof instanceof File ? proof.size : null, paymentId).run();
  const property = await env.DB.prepare(`SELECT b.property_id FROM tenancies t JOIN beds b ON b.id = t.bed_id WHERE t.id = ?`)
    .bind(tenancyId).first<{ property_id: number }>();
  await audit(owner, property?.property_id ?? null, 'create', 'payment', paymentId, `Recorded ${amount} via ${mode}${proofKey ? ' with payment proof' : ''}`);
  return Response.json({ ok: true, paymentId, receiptNumber: receipt }, { status: 201 });
}

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const id = Number(new URL(request.url).searchParams.get('proofId'));
  if (!id) return apiError('Payment proof is required');
  const payment = await env.DB.prepare(`SELECT py.proof_storage_key, py.proof_original_name, py.proof_content_type
    FROM payments py JOIN tenancies t ON t.id=py.tenancy_id JOIN beds b ON b.id=t.bed_id JOIN properties p ON p.id=b.property_id
    WHERE py.id=? AND p.owner_id=?`).bind(id, owner.id).first<{ proof_storage_key: string | null; proof_original_name: string | null; proof_content_type: string | null }>();
  if (!payment?.proof_storage_key || !env.FILES) return apiError('Payment proof not found', 404);
  const object = await env.FILES.get(payment.proof_storage_key);
  if (!object) return apiError('Payment proof file is missing', 404);
  const name = (payment.proof_original_name || 'payment-proof').replace(/["\r\n]/g, '_');
  return new Response(object.body, { headers: { 'Content-Type': payment.proof_content_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${name}"`, 'Content-Length': String(object.size), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
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
