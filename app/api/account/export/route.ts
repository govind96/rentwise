import { env } from 'cloudflare:workers';
import { isResponse, requireOwner } from '../../../lib/api';
import { ensureAppSchema } from '../../../lib/ledger';

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const properties = await env.DB.prepare('SELECT * FROM properties WHERE owner_id=? ORDER BY id').bind(owner.id).all();
  const ids = properties.results.map((row) => Number((row as { id: number }).id));
  const payload: Record<string, unknown> = { format: 'rentwise-owner-export', version: 1, exportedAt: new Date().toISOString(), owner: { email: owner.email, name: owner.name }, properties: properties.results };
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const [beds, tenancies, charges, payments, bookings, expenses, workOrders, documents, auditEvents] = await Promise.all([
      env.DB.prepare(`SELECT * FROM beds WHERE property_id IN (${placeholders})`).bind(...ids).all(),
      env.DB.prepare(`SELECT t.* FROM tenancies t JOIN beds b ON b.id=t.bed_id WHERE b.property_id IN (${placeholders})`).bind(...ids).all(),
      env.DB.prepare(`SELECT c.* FROM charges c JOIN tenancies t ON t.id=c.tenancy_id JOIN beds b ON b.id=t.bed_id WHERE b.property_id IN (${placeholders})`).bind(...ids).all(),
      env.DB.prepare(`SELECT py.* FROM payments py JOIN tenancies t ON t.id=py.tenancy_id JOIN beds b ON b.id=t.bed_id WHERE b.property_id IN (${placeholders})`).bind(...ids).all(),
      env.DB.prepare(`SELECT * FROM bookings WHERE property_id IN (${placeholders})`).bind(...ids).all(),
      env.DB.prepare(`SELECT * FROM expenses WHERE property_id IN (${placeholders})`).bind(...ids).all(),
      env.DB.prepare(`SELECT * FROM work_orders WHERE property_id IN (${placeholders})`).bind(...ids).all(),
      env.DB.prepare(`SELECT d.id,d.tenancy_id,d.kind,d.label,d.original_name,d.content_type,d.size_bytes,d.verification_status,d.expires_on,d.consent_recorded_at,d.created_at,d.updated_at FROM documents d JOIN tenancies t ON t.id=d.tenancy_id JOIN beds b ON b.id=t.bed_id WHERE b.property_id IN (${placeholders})`).bind(...ids).all(),
      env.DB.prepare(`SELECT * FROM audit_events WHERE owner_id=? ORDER BY id`).bind(owner.id).all(),
    ]);
    Object.assign(payload, { beds: beds.results, tenancies: tenancies.results, charges: charges.results, payments: payments.results, bookings: bookings.results, expenses: expenses.results, workOrders: workOrders.results, documentMetadata: documents.results, auditEvents: auditEvents.results });
  }
  const body = JSON.stringify(payload, null, 2);
  return new Response(body, { headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="rentwise-export-${new Date().toISOString().slice(0, 10)}.json"`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}
