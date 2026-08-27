import { env } from 'cloudflare:workers';
import { apiError, audit, intValue, isResponse, isoDate, requireOwner, textValue } from '../../lib/api';
import { ensureAppSchema } from '../../lib/ledger';

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_BYTES = 8 * 1024 * 1024;

async function ownedTenancy(ownerId: number, tenancyId: number) {
  return env.DB.prepare(`SELECT t.id, b.property_id FROM tenancies t JOIN beds b ON b.id=t.bed_id JOIN properties p ON p.id=b.property_id
    WHERE t.id=? AND p.owner_id=?`).bind(tenancyId, ownerId).first<{ id: number; property_id: number }>();
}

export async function POST(request: Request) {
  const owner = await requireOwner(request, true);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  if (!env.FILES) return apiError('File storage unavailable', 503);
  const form = await request.formData().catch(() => null);
  if (!form) return apiError('Invalid upload');
  const file = form.get('file'); const tenancyId = intValue(form.get('tenancyId'), 1);
  const kind = textValue(form.get('kind'), 40); const label = textValue(form.get('label'), 120);
  if (!(file instanceof File) || !tenancyId || !kind || !label) return apiError('Resident, document type, label and file are required');
  if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > MAX_FILE_BYTES) return apiError('Upload a PDF, JPG, PNG or WebP file up to 8 MB');
  if (form.get('consent') !== 'true') return apiError('Resident consent must be recorded before upload');
  const tenancy = await ownedTenancy(owner.id, tenancyId);
  if (!tenancy) return apiError('Resident not found', 404);
  const extension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8) || 'bin';
  const key = `${owner.id}/${tenancy.property_id}/${tenancyId}/${crypto.randomUUID()}.${extension}`;
  await env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type }, customMetadata: { ownerId: String(owner.id), tenancyId: String(tenancyId) } });
  const now = new Date().toISOString();
  try {
    const result = await env.DB.prepare(`INSERT INTO documents
      (tenancy_id, kind, label, storage_key, original_name, content_type, size_bytes, verification_status, expires_on, consent_recorded_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'uploaded', ?, ?, ?, ?)`)
      .bind(tenancyId, kind, label, key, file.name.slice(0, 180), file.type, file.size, isoDate(form.get('expiresOn')) || null, now, now, now).run();
    await audit(owner, tenancy.property_id, 'upload', 'document', result.meta.last_row_id as number, `Uploaded ${label}`);
    return Response.json({ ok: true, id: result.meta.last_row_id }, { status: 201 });
  } catch (error) {
    await env.FILES.delete(key);
    throw error;
  }
}

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const id = intValue(new URL(request.url).searchParams.get('id'), 1);
  if (!id) return apiError('Document is required');
  const document = await env.DB.prepare(`SELECT d.storage_key, d.original_name, d.content_type FROM documents d
    JOIN tenancies t ON t.id=d.tenancy_id JOIN beds b ON b.id=t.bed_id JOIN properties p ON p.id=b.property_id
    WHERE d.id=? AND p.owner_id=?`).bind(id, owner.id).first<{ storage_key: string | null; original_name: string | null; content_type: string | null }>();
  if (!document?.storage_key || !env.FILES) return apiError('Document not found', 404);
  const object = await env.FILES.get(document.storage_key);
  if (!object) return apiError('Document file is missing', 404);
  const safeName = (document.original_name || 'document').replace(/["\r\n]/g, '_');
  return new Response(object.body, { headers: {
    'Content-Type': document.content_type || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${safeName}"`,
    'Content-Length': String(object.size), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}

export async function PATCH(request: Request) {
  const owner = await requireOwner(request, true);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = intValue(body.id, 1); const status = textValue(body.status, 20);
  if (!id || !['verified', 'rejected', 'expired'].includes(status)) return apiError('Document and valid review status are required');
  const document = await env.DB.prepare(`SELECT d.id, b.property_id FROM documents d JOIN tenancies t ON t.id=d.tenancy_id
    JOIN beds b ON b.id=t.bed_id JOIN properties p ON p.id=b.property_id WHERE d.id=? AND p.owner_id=?`)
    .bind(id, owner.id).first<{ id: number; property_id: number }>();
  if (!document) return apiError('Document not found', 404);
  await env.DB.prepare('UPDATE documents SET verification_status=?, updated_at=? WHERE id=?').bind(status, new Date().toISOString(), id).run();
  await audit(owner, document.property_id, 'review', 'document', id, `Document marked ${status}`);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const owner = await requireOwner(request, true);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const id = intValue((await request.json().catch(() => ({})) as { id?: number }).id, 1);
  const document = await env.DB.prepare(`SELECT d.storage_key, b.property_id FROM documents d JOIN tenancies t ON t.id=d.tenancy_id
    JOIN beds b ON b.id=t.bed_id JOIN properties p ON p.id=b.property_id WHERE d.id=? AND p.owner_id=?`)
    .bind(id, owner.id).first<{ storage_key: string | null; property_id: number }>();
  if (!document) return apiError('Document not found', 404);
  if (document.storage_key && env.FILES) await env.FILES.delete(document.storage_key);
  await env.DB.prepare('DELETE FROM documents WHERE id=?').bind(id).run();
  await audit(owner, document.property_id, 'delete', 'document', id, 'Deleted document at owner request');
  return Response.json({ ok: true });
}
