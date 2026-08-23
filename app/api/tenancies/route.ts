import { env } from 'cloudflare:workers';
import { getSessionOwner } from '../../lib/auth';
import { ensureAppSchema, ensureTenancyLedger } from '../../lib/ledger';

export async function POST(request: Request) {
  if (!env.DB) return Response.json({ error: 'Database unavailable' }, { status: 500 });
  const ownerId = await getSessionOwner(request);
  if (!ownerId) return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  await ensureAppSchema();
  const body = await request.json().catch(() => ({})) as { bedId?: number; name?: string; phone?: string; allotment?: string; rent?: number; security?: number; firstMonthRent?: number };
  const bedId = Number(body.bedId);
  const name = String(body.name ?? '').trim();
  const rent = Math.max(0, Math.floor(Number(body.rent) || 0));
  const security = Math.max(0, Math.floor(Number(body.security) || 0));
  const firstMonthRent = Math.max(0, Math.floor(Number(body.firstMonthRent) || 0));
  const allotment = String(body.allotment ?? '').trim();
  if (!bedId || !name || !allotment) return Response.json({ error: 'Bed, name and allotment date are required' }, { status: 400 });
  const bed = await env.DB.prepare(`SELECT b.id, b.status FROM beds b JOIN properties p ON p.id = b.property_id
    WHERE b.id = ? AND p.owner_id = ?`).bind(bedId, ownerId).first<{ id: number; status: string }>();
  if (!bed) return Response.json({ error: 'Bed not found' }, { status: 404 });
  if (bed.status !== 'vacant') return Response.json({ error: 'That bed is already occupied' }, { status: 409 });
  const insert = env.DB.prepare(`INSERT INTO tenancies (bed_id, tenant_name, phone, allotment_date, monthly_rent, security_amount, first_month_rent)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(bedId, name, String(body.phone ?? '').trim() || null, allotment, rent, security, firstMonthRent);
  const results = await env.DB.batch([
    insert,
    env.DB.prepare(`UPDATE beds SET status = 'occupied' WHERE id = ?`).bind(bedId),
  ]);
  const tenancyId = results[0].meta.last_row_id as number;
  await ensureTenancyLedger({ id: tenancyId, allotment_date: allotment, monthly_rent: rent, security_amount: security, first_month_rent: firstMonthRent });
  return Response.json({ ok: true, tenancyId });
}

export async function PATCH(request: Request) {
  if (!env.DB) return Response.json({ error: 'Database unavailable' }, { status: 500 });
  const ownerId = await getSessionOwner(request);
  if (!ownerId) return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  await ensureAppSchema();
  const body = await request.json().catch(() => ({})) as { tenancyId?: number; vacate?: boolean; name?: string; phone?: string; rent?: number; security?: number };
  const tenancyId = Number(body.tenancyId);
  if (!tenancyId) return Response.json({ error: 'Tenancy is required' }, { status: 400 });

  const owned = await env.DB.prepare(`SELECT t.id FROM tenancies t
    JOIN beds b ON b.id = t.bed_id JOIN properties p ON p.id = b.property_id
    WHERE t.id = ? AND p.owner_id = ? AND t.status = 'active'`).bind(tenancyId, ownerId).first<{ id: number }>();
  if (!owned) return Response.json({ error: 'Tenancy not found' }, { status: 404 });

  if (body.vacate) {
    const bed = await env.DB.prepare('SELECT bed_id FROM tenancies WHERE id = ?').bind(tenancyId).first<{ bed_id: number }>();
    await env.DB.batch([
      env.DB.prepare(`UPDATE tenancies SET status = 'closed' WHERE id = ?`).bind(tenancyId),
      env.DB.prepare(`UPDATE beds SET status = 'vacant' WHERE id = ?`).bind(bed?.bed_id ?? -1),
    ]);
    return Response.json({ ok: true, vacated: true });
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  if (body.name != null && String(body.name).trim()) { updates.push('tenant_name = ?'); values.push(String(body.name).trim()); }
  if (body.phone != null) { updates.push('phone = ?'); values.push(String(body.phone).trim() || null); }
  if (body.rent != null && Number(body.rent) >= 0) { updates.push('monthly_rent = ?'); values.push(Math.floor(Number(body.rent))); }
  if (body.security != null && Number(body.security) >= 0) { updates.push('security_amount = ?'); values.push(Math.floor(Number(body.security))); }
  if (!updates.length) return Response.json({ error: 'Nothing to update' }, { status: 400 });
  values.push(tenancyId);
  await env.DB.prepare(`UPDATE tenancies SET ${updates.join(', ')} WHERE id = ?`).bind(...(values as (string | number)[])).run();
  return Response.json({ ok: true });
}
