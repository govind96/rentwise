import { env } from 'cloudflare:workers';
import { getResidentContext, mutationAllowed } from '../../lib/auth';
import { apiError, isResponse, textValue } from '../../lib/api';
import { ensureAppSchema, ensureTenancyLedger } from '../../lib/ledger';

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_BYTES = 8 * 1024 * 1024;

async function residentOrError(request: Request, mutation = false) {
  if (!env.DB) return apiError('Database unavailable', 503);
  if (mutation && !mutationAllowed(request)) return apiError('Cross-site request blocked', 403);
  const resident = await getResidentContext(request);
  return resident ?? apiError('Resident sign-in is required', 401);
}

function allocation(charges: Array<{ id: number; amount: number }>, payments: Array<{ amount: number }>) {
  let credit = payments.reduce((total, payment) => total + payment.amount, 0);
  return charges.map((charge) => {
    const paid = Math.min(charge.amount, credit); credit -= paid;
    return { ...charge, paid, outstanding: Math.max(0, charge.amount - paid) };
  });
}

export async function GET(request: Request) {
  const resident = await residentOrError(request);
  if (isResponse(resident)) return resident;
  await ensureAppSchema();
  const tenancy = await env.DB.prepare(`SELECT t.id, t.allotment_date, t.monthly_rent, t.security_amount, t.first_month_rent, p.rent_due_day
    FROM tenancies t JOIN beds b ON b.id=t.bed_id JOIN properties p ON p.id=b.property_id WHERE t.id=?`)
    .bind(resident.tenancyId).first<{ id: number; allotment_date: string; monthly_rent: number; security_amount: number; first_month_rent: number; rent_due_day: number }>();
  if (!tenancy) return apiError('Your tenancy is no longer active', 404);
  await ensureTenancyLedger(tenancy);
  const [chargeRows, paymentRows, documentRows, maintenanceRows] = await Promise.all([
    env.DB.prepare('SELECT id, kind, period, amount, due_on, status FROM charges WHERE tenancy_id=? ORDER BY due_on DESC, id DESC').bind(resident.tenancyId).all<{ id: number; kind: string; period: string; amount: number; due_on: string; status: string }>(),
    env.DB.prepare("SELECT id, amount, paid_on, mode, reference, receipt_number FROM payments WHERE tenancy_id=? AND status='confirmed' ORDER BY paid_on DESC, id DESC").bind(resident.tenancyId).all<{ id: number; amount: number; paid_on: string; mode: string; reference: string | null; receipt_number: string | null }>(),
    env.DB.prepare('SELECT id, kind, label, original_name, verification_status, created_at FROM documents WHERE tenancy_id=? ORDER BY created_at DESC').bind(resident.tenancyId).all<{ id: number; kind: string; label: string; original_name: string | null; verification_status: string; created_at: string }>(),
    env.DB.prepare('SELECT id, title, category, priority, status, created_at, updated_at FROM work_orders WHERE tenancy_id=? ORDER BY created_at DESC').bind(resident.tenancyId).all<{ id: number; title: string; category: string; priority: string; status: string; created_at: string; updated_at: string }>(),
  ]);
  const charges = allocation([...chargeRows.results].sort((a, b) => a.due_on.localeCompare(b.due_on) || a.id - b.id), paymentRows.results)
    .sort((a, b) => b.due_on.localeCompare(a.due_on) || b.id - a.id);
  const balance = charges.reduce((total, charge) => total + charge.outstanding, 0);
  return Response.json({
    resident: { name: resident.tenantName, email: resident.email, property: resident.propertyName, room: resident.room, bed: resident.bed, monthlyRent: resident.monthlyRent },
    balance, charges, payments: paymentRows.results, documents: documentRows.results, maintenance: maintenanceRows.results,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const resident = await residentOrError(request, true);
  if (isResponse(resident)) return resident;
  await ensureAppSchema();
  const multipart = request.headers.get('content-type')?.includes('multipart/form-data');
  if (multipart) {
    if (!env.FILES) return apiError('File storage unavailable', 503);
    const form = await request.formData().catch(() => null);
    if (!form) return apiError('Invalid upload');
    const file = form.get('file'); const kind = textValue(form.get('kind'), 40) || 'other'; const label = textValue(form.get('label'), 120);
    if (!(file instanceof File) || !label) return apiError('A label and file are required');
    if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > MAX_FILE_BYTES) return apiError('Upload a PDF, JPG, PNG or WebP file up to 8 MB');
    const extension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8) || 'bin';
    const key = `${resident.ownerId}/${resident.propertyId}/${resident.tenancyId}/${crypto.randomUUID()}.${extension}`;
    await env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type }, customMetadata: { ownerId: String(resident.ownerId), tenancyId: String(resident.tenancyId) } });
    const now = new Date().toISOString();
    try {
      const result = await env.DB.prepare(`INSERT INTO documents (tenancy_id, kind, label, storage_key, original_name, content_type, size_bytes, verification_status, consent_recorded_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'uploaded', ?, ?, ?)`)
        .bind(resident.tenancyId, kind, label, key, file.name.slice(0, 180), file.type, file.size, now, now, now).run();
      await env.DB.prepare(`INSERT INTO audit_events (owner_id, property_id, actor, action, entity_type, entity_id, summary, created_at)
        VALUES (?, ?, ?, 'upload', 'document', ?, ?, ?)`).bind(resident.ownerId, resident.propertyId, resident.email, String(result.meta.last_row_id), `Resident uploaded ${label}`, now).run();
      return Response.json({ ok: true, id: result.meta.last_row_id }, { status: 201 });
    } catch (error) { await env.FILES.delete(key); throw error; }
  }
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const title = textValue(body.title, 160); const category = textValue(body.category, 40) || 'general';
  const priority = ['low', 'normal', 'urgent'].includes(textValue(body.priority, 20)) ? textValue(body.priority, 20) : 'normal';
  if (!title) return apiError('Describe the maintenance issue');
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`INSERT INTO work_orders (property_id, tenancy_id, room_no, title, category, priority, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?)`)
    .bind(resident.propertyId, resident.tenancyId, resident.room, title, category, priority, now, now).run();
  await env.DB.prepare(`INSERT INTO audit_events (owner_id, property_id, actor, action, entity_type, entity_id, summary, created_at)
    VALUES (?, ?, ?, 'create', 'work_order', ?, ?, ?)`).bind(resident.ownerId, resident.propertyId, resident.email, String(result.meta.last_row_id), `Resident reported: ${title}`, now).run();
  return Response.json({ ok: true, id: result.meta.last_row_id }, { status: 201 });
}
