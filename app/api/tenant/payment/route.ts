import { env } from 'cloudflare:workers';
import { getResidentContext, mutationAllowed } from '../../../lib/auth';
import { apiError, intValue, isoDate, textValue } from '../../../lib/api';
import { ensureAppSchema } from '../../../lib/ledger';

const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  if (!mutationAllowed(request)) return apiError('Cross-site request blocked', 403);
  const resident = await getResidentContext(request);
  if (!resident || !env.DB || !env.FILES) return apiError('Resident sign-in is required', 401);
  await ensureAppSchema();
  const form = await request.formData().catch(() => null);
  if (!form) return apiError('Invalid payment submission');
  const amount = intValue(form.get('amount'), 1, 10_000_000); const paidOn = isoDate(form.get('paidOn'));
  const mode = ['UPI', 'Cash', 'Bank transfer'].includes(String(form.get('mode'))) ? String(form.get('mode')) : 'UPI';
  const reference = textValue(form.get('reference'), 160); const proof = form.get('proof');
  if (!paidOn || !reference || !(proof instanceof File) || !allowed.has(proof.type) || proof.size <= 0 || proof.size > 8 * 1024 * 1024) return apiError('Add a valid payment date, reference and PDF, JPG, PNG or WebP proof up to 8 MB');
  const now = new Date().toISOString();
  const inserted = await env.DB.prepare(`INSERT INTO payments (tenancy_id, amount, paid_on, mode, reference, status, proof_original_name, proof_content_type, proof_size_bytes, created_at) VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?)`)
    .bind(resident.tenancyId, amount, paidOn, mode, reference, proof.name.slice(0, 180), proof.type, proof.size, now).run();
  const id = inserted.meta.last_row_id as number; const ext = proof.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin'; const key = `${resident.ownerId}/payments/${id}/${crypto.randomUUID()}.${ext}`;
  await env.FILES.put(key, proof.stream(), { httpMetadata: { contentType: proof.type } });
  await env.DB.prepare('UPDATE payments SET proof_storage_key=? WHERE id=?').bind(key, id).run();
  await env.DB.prepare(`INSERT INTO audit_events (owner_id, property_id, actor, action, entity_type, entity_id, summary, created_at) VALUES (?, ?, ?, 'submit', 'payment', ?, ?, ?)`)
    .bind(resident.ownerId, resident.propertyId, resident.email, String(id), `Resident submitted ${amount} via ${mode}`, now).run();
  return Response.json({ ok: true, id }, { status: 201 });
}
