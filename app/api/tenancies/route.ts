import { env } from 'cloudflare:workers';
import { ensureAppSchema, ensureTenancyLedger } from '../../lib/ledger';
import { apiError, audit, intValue, isResponse, isoDate, phoneValue, requireOwner, textValue } from '../../lib/api';

export async function POST(request: Request) {
  const owner = await requireOwner(request, true);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const body = await request.json().catch(() => ({})) as { bedId?: number; name?: string; phone?: string; email?: string; occupation?: string; hometown?: string; emergencyName?: string; emergencyPhone?: string; allotment?: string; rent?: number; security?: number; firstMonthRent?: number };
  const bedId = Number(body.bedId);
  const name = String(body.name ?? '').trim();
  const rent = intValue(body.rent, 0, 1_000_000);
  const security = intValue(body.security, 0, 2_000_000);
  const firstMonthRent = intValue(body.firstMonthRent, 0, 1_000_000);
  const allotment = isoDate(body.allotment);
  if (!bedId || !name || !allotment) return apiError('Bed, name and valid allotment date are required');
  const bed = await env.DB.prepare(`SELECT b.id, b.status, b.property_id, p.rent_due_day FROM beds b JOIN properties p ON p.id = b.property_id
    WHERE b.id = ? AND p.owner_id = ?`).bind(bedId, owner.id).first<{ id: number; status: string; property_id: number; rent_due_day: number }>();
  if (!bed) return apiError('Bed not found', 404);
  // Claim the bed first with a conditional update. Only one concurrent allotment can win.
  const claimed = await env.DB.prepare("UPDATE beds SET status = 'occupied' WHERE id = ? AND status = 'vacant'").bind(bedId).run();
  if (!claimed.meta.changes) return apiError('That bed is no longer vacant', 409);
  const insert = await env.DB.prepare(`INSERT INTO tenancies (bed_id, tenant_name, phone, email, occupation, hometown, emergency_name, emergency_phone, allotment_date, monthly_rent, security_amount, first_month_rent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(bedId, textValue(name, 120), phoneValue(body.phone) || null, textValue(body.email, 160) || null, textValue(body.occupation, 100) || null, textValue(body.hometown, 100) || null, textValue(body.emergencyName, 120) || null, phoneValue(body.emergencyPhone) || null, allotment, rent, security, firstMonthRent).run();
  const tenancyId = insert.meta.last_row_id as number;
  await ensureTenancyLedger({ id: tenancyId, allotment_date: allotment, monthly_rent: rent, security_amount: security, first_month_rent: firstMonthRent, rent_due_day: bed.rent_due_day });
  await audit(owner, bed.property_id, 'create', 'tenancy', tenancyId, `Allotted ${textValue(name, 120)} to a bed`);
  return Response.json({ ok: true, tenancyId }, { status: 201 });
}

export async function PATCH(request: Request) {
  const owner = await requireOwner(request, true);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const body = await request.json().catch(() => ({})) as { tenancyId?: number; vacate?: boolean; name?: string; phone?: string; email?: string; occupation?: string; hometown?: string; emergencyName?: string; emergencyPhone?: string; rent?: number; security?: number };
  const tenancyId = Number(body.tenancyId);
  if (!tenancyId) return Response.json({ error: 'Tenancy is required' }, { status: 400 });

  const owned = await env.DB.prepare(`SELECT t.id, b.property_id FROM tenancies t
    JOIN beds b ON b.id = t.bed_id JOIN properties p ON p.id = b.property_id
    WHERE t.id = ? AND p.owner_id = ? AND t.status != 'closed'`).bind(tenancyId, owner.id).first<{ id: number; property_id: number }>();
  if (!owned) return apiError('Tenancy not found', 404);

  if (body.vacate) {
    const bed = await env.DB.prepare('SELECT bed_id FROM tenancies WHERE id = ?').bind(tenancyId).first<{ bed_id: number }>();
    await env.DB.batch([
      env.DB.prepare(`UPDATE tenancies SET status = 'closed', actual_exit_on = ?, updated_at = ? WHERE id = ?`).bind(new Date().toISOString().slice(0, 10), new Date().toISOString(), tenancyId),
      env.DB.prepare(`UPDATE beds SET status = 'vacant' WHERE id = ?`).bind(bed?.bed_id ?? -1),
    ]);
    await audit(owner, owned.property_id, 'checkout', 'tenancy', tenancyId, 'Closed tenancy and released bed');
    return Response.json({ ok: true, vacated: true });
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  if (body.name != null && String(body.name).trim()) { updates.push('tenant_name = ?'); values.push(String(body.name).trim()); }
  if (body.phone != null) { updates.push('phone = ?'); values.push(String(body.phone).trim() || null); }
  if (body.email != null) { updates.push('email = ?'); values.push(textValue(body.email, 160) || null); }
  if (body.occupation != null) { updates.push('occupation = ?'); values.push(textValue(body.occupation, 100) || null); }
  if (body.hometown != null) { updates.push('hometown = ?'); values.push(textValue(body.hometown, 100) || null); }
  if (body.emergencyName != null) { updates.push('emergency_name = ?'); values.push(textValue(body.emergencyName, 120) || null); }
  if (body.emergencyPhone != null) { updates.push('emergency_phone = ?'); values.push(phoneValue(body.emergencyPhone) || null); }
  if (body.rent != null && Number(body.rent) >= 0) { updates.push('monthly_rent = ?'); values.push(Math.floor(Number(body.rent))); }
  if (body.security != null && Number(body.security) >= 0) { updates.push('security_amount = ?'); values.push(Math.floor(Number(body.security))); }
  if (!updates.length) return Response.json({ error: 'Nothing to update' }, { status: 400 });
  values.push(tenancyId);
  await env.DB.prepare(`UPDATE tenancies SET ${updates.join(', ')} WHERE id = ?`).bind(...(values as (string | number)[])).run();
  await audit(owner, owned.property_id, 'update', 'tenancy', tenancyId, 'Updated resident details');
  return Response.json({ ok: true });
}
