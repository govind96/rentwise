import { env } from 'cloudflare:workers';
import { getSessionOwner } from '../../lib/auth';
import { currentPeriod, ensureAppSchema, ensureTenancyLedger } from '../../lib/ledger';
import { apiError, audit, intValue, isResponse, requireOwner, textValue } from '../../lib/api';

type PropertyRow = { id: number; name: string; address: string | null; city: string | null; property_type: string | null; audience: string | null; rent_due_day: number; grace_days: number; late_fee: number; default_rent: number; default_security: number; notice_days: number; agreement_required: number; verification_required: number; amenities_json: string; meal_plan: string | null; electricity_plan: string | null; climate_plan: string | null; bathroom_plan: string | null };
type BedRow = { id: number; room_no: string; bed_no: string; monthly_rent: number; status: string };
type TenancyRow = {
  id: number; bed_id: number; tenant_name: string; phone: string | null; allotment_date: string;
  monthly_rent: number; security_amount: number; first_month_rent: number; room_no: string; bed_no: string; rent_due_day: number;
};
type ChargeRow = { tenancy_id: number; kind: string; period: string; amount: number; due_on: string };
type PaymentRow = { id: number; tenancy_id: number; amount: number; paid_on: string; mode: string; reference: string | null; receipt_number: string | null };

export async function GET(request: Request) {
  if (!env.DB) return Response.json({ error: 'Database unavailable' }, { status: 500 });
  const ownerId = await getSessionOwner(request);
  if (!ownerId) return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  await ensureAppSchema();
  const url = new URL(request.url);
  const wanted = Number(url.searchParams.get('propertyId')) || null;

  const propertyRows = await env.DB.prepare(`SELECT id, name, address, city, property_type, audience, rent_due_day, grace_days,
      late_fee, default_rent, default_security, notice_days, agreement_required, verification_required, amenities_json,
      meal_plan, electricity_plan, climate_plan, bathroom_plan
    FROM properties WHERE owner_id = ? ORDER BY id ASC`)
    .bind(ownerId).all<PropertyRow>();
  const properties = propertyRows.results.map((row) => ({
    id: row.id, name: row.name, address: row.address ?? '', city: row.city ?? '', type: row.property_type ?? 'PG / Paying guest',
    audience: row.audience ?? 'Women', rentDueDay: row.rent_due_day, graceDays: row.grace_days, lateFee: row.late_fee,
    defaultRent: row.default_rent, defaultSecurity: row.default_security, noticeDays: row.notice_days,
    agreementRequired: Boolean(row.agreement_required), verificationRequired: Boolean(row.verification_required),
    amenities: JSON.parse(row.amenities_json || '[]') as string[], mealPlan: row.meal_plan ?? 'Not included',
    electricityPlan: row.electricity_plan ?? 'Included', climatePlan: row.climate_plan ?? 'Non-AC', bathroomPlan: row.bathroom_plan ?? 'Shared',
  }));
  if (!properties.length) {
    return Response.json({ properties: [], property: null, beds: [], tenants: [] });
  }
  const active = properties.find((item) => item.id === wanted) ?? properties[0];

  // Backfill/generate the ledger for every active tenancy of the active property.
  const tenancies = await env.DB.prepare(`SELECT t.id, t.allotment_date, t.monthly_rent, t.security_amount, t.first_month_rent,
      t.tenant_name, t.phone, b.room_no, b.bed_no, b.id AS bed_id, p.rent_due_day
    FROM tenancies t JOIN beds b ON b.id = t.bed_id JOIN properties p ON p.id = b.property_id
    WHERE b.property_id = ? AND t.status = 'active'
    ORDER BY CAST(b.room_no AS INTEGER), b.bed_no`).bind(active.id).all<TenancyRow>();
  for (const tenancy of tenancies.results) await ensureTenancyLedger(tenancy);

  const beds = await env.DB.prepare('SELECT id, room_no, bed_no, monthly_rent, status FROM beds WHERE property_id = ? ORDER BY CAST(room_no AS INTEGER), bed_no')
    .bind(active.id).all<BedRow>();

  const chargeRows = await env.DB.prepare(`SELECT c.tenancy_id, c.kind, c.period, c.amount, c.due_on
    FROM charges c JOIN tenancies t ON t.id = c.tenancy_id JOIN beds b ON b.id = t.bed_id
    WHERE b.property_id = ? AND t.status = 'active'
    ORDER BY c.due_on ASC, c.id ASC`).bind(active.id).all<ChargeRow>();
  const paymentRows = await env.DB.prepare(`SELECT p.id, p.tenancy_id, p.amount, p.paid_on, p.mode, p.reference, p.receipt_number
    FROM payments p JOIN tenancies t ON t.id = p.tenancy_id JOIN beds b ON b.id = t.bed_id
    WHERE b.property_id = ? AND p.status = 'confirmed' ORDER BY p.paid_on DESC, p.id DESC`).bind(active.id).all<PaymentRow>();

  const chargesByTenancy = new Map<number, ChargeRow[]>();
  for (const charge of chargeRows.results) {
    chargesByTenancy.set(charge.tenancy_id, [...(chargesByTenancy.get(charge.tenancy_id) ?? []), charge]);
  }
  const paymentsByTenancy = new Map<number, PaymentRow[]>();
  const receivedByTenancy = new Map<number, number>();
  for (const payment of paymentRows.results) {
    paymentsByTenancy.set(payment.tenancy_id, [...(paymentsByTenancy.get(payment.tenancy_id) ?? []), payment]);
    receivedByTenancy.set(payment.tenancy_id, (receivedByTenancy.get(payment.tenancy_id) ?? 0) + payment.amount);
  }

  const now = currentPeriod();
  const tenants = tenancies.results.map((row) => {
    const received = receivedByTenancy.get(row.id) ?? 0;
    let credits = received;
    let chargesTotal = 0;
    let monthly: { period: string; expected: number; paid: number; status: 'paid' | 'partial' | 'due' | 'na' } | null = null;
    let latestMonthly: { period: string; expected: number; paid: number; status: 'paid' | 'partial' | 'due' } | null = null;
    const chargesSummary: { label: string; period: string; amount: number; status: string }[] = [];
    for (const charge of chargesByTenancy.get(row.id) ?? []) {
      const applied = Math.min(Math.max(credits, 0), charge.amount);
      credits -= applied;
      chargesTotal += charge.amount;
      const status = applied >= charge.amount ? 'paid' : applied > 0 ? 'partial' : 'due';
      if (charge.kind === 'monthly_rent') {
        const entry = { period: charge.period, expected: charge.amount, paid: applied, status: status as 'paid' | 'partial' | 'due' };
        if (charge.period === now) monthly = entry;
        if (!latestMonthly || charge.period > latestMonthly.period) latestMonthly = entry;
      }
      chargesSummary.push({
        label: charge.kind === 'security' ? 'Security deposit' : charge.kind === 'prorated_rent' ? 'First month (prorated)' : `Rent · ${charge.period}`,
        period: charge.period, amount: charge.amount, status,
      });
    }
    if (!monthly) monthly = latestMonthly ? { ...latestMonthly, status: latestMonthly.status as 'paid' | 'partial' | 'due' } : null;
    return {
      id: row.id, bedId: row.bed_id, name: row.tenant_name, phone: row.phone, allotment: row.allotment_date,
      room: row.room_no, bed: row.bed_no, rent: row.monthly_rent, security: row.security_amount,
      firstMonthRent: row.first_month_rent, received, chargesTotal,
      balance: Math.max(0, chargesTotal - Math.min(received, chargesTotal)),
      monthly, chargesSummary,
      payments: (paymentsByTenancy.get(row.id) ?? []).slice(0, 8).map((payment) => ({
        id: payment.id, amount: payment.amount, date: payment.paid_on, mode: payment.mode,
        note: payment.reference || 'Payment received', receiptNumber: payment.receipt_number,
      })),
    };
  });

  const [bookingRows, expenseRows, orderRows, documentRows, noticeRows] = await Promise.all([
    env.DB.prepare(`SELECT id, prospect_name, phone, expected_move_in, preferred_sharing, quoted_rent, token_amount, source, status
      FROM bookings WHERE property_id = ? ORDER BY expected_move_in, id DESC`).bind(active.id).all<Record<string, string | number | null>>(),
    env.DB.prepare(`SELECT id, category, amount, spent_on, vendor, notes FROM expenses WHERE property_id = ? ORDER BY spent_on DESC, id DESC`)
      .bind(active.id).all<Record<string, string | number | null>>(),
    env.DB.prepare(`SELECT id, title, room_no, category, priority, status, created_at, tenancy_id FROM work_orders
      WHERE property_id = ? AND status != 'cancelled' ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, id DESC`)
      .bind(active.id).all<Record<string, string | number | null>>(),
    env.DB.prepare(`SELECT d.id, d.tenancy_id, d.kind, d.label, d.original_name, d.content_type, d.size_bytes, d.verification_status, d.expires_on
      FROM documents d JOIN tenancies t ON t.id = d.tenancy_id JOIN beds b ON b.id = t.bed_id WHERE b.property_id = ? ORDER BY d.id DESC`)
      .bind(active.id).all<Record<string, string | number | null>>(),
    env.DB.prepare(`SELECT t.id, t.tenant_name, b.room_no, t.notice_given_on, t.planned_exit_on, t.deposit_refunded
      FROM tenancies t JOIN beds b ON b.id = t.bed_id WHERE b.property_id = ? AND t.status = 'notice' ORDER BY t.planned_exit_on`)
      .bind(active.id).all<Record<string, string | number | null>>(),
  ]);

  return Response.json({
    properties, property: active,
    beds: beds.results.map((bed) => ({ id: bed.id, room: bed.room_no, bed: bed.bed_no, rent: bed.monthly_rent, status: bed.status })), tenants,
    bookings: bookingRows.results.map((row) => ({ id: row.id, name: row.prospect_name, phone: row.phone, moveIn: row.expected_move_in, sharing: row.preferred_sharing, quotedRent: row.quoted_rent, token: row.token_amount, source: row.source, status: String(row.status).replace('_', '-') })),
    expenses: expenseRows.results.map((row) => ({ id: row.id, category: String(row.category).replace(/^./, (char) => char.toUpperCase()), amount: row.amount, date: row.spent_on, vendor: row.vendor ?? '', note: row.notes ?? '' })),
    orders: orderRows.results.map((row) => ({ id: row.id, title: row.title, room: row.room_no ?? '', tenant: row.tenancy_id ? 'Resident reported' : 'Owner reported', category: row.category, priority: row.priority, status: String(row.status).replace('_', '-'), opened: row.created_at ? new Date(String(row.created_at)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '' })),
    documents: documentRows.results.map((row) => ({ id: row.id, tenancyId: row.tenancy_id, kind: row.kind, label: row.label, originalName: row.original_name, contentType: row.content_type, sizeBytes: row.size_bytes, status: row.verification_status, expiresOn: row.expires_on })),
    exitNotices: noticeRows.results.map((row) => ({ id: row.id, tenantId: row.id, tenantName: row.tenant_name, room: row.room_no, givenOn: row.notice_given_on, vacateOn: row.planned_exit_on, depositStatus: Number(row.deposit_refunded) ? 'refunded' : 'review', status: 'open' })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const owner = await requireOwner(request, true);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const name = textValue(body.name, 120);
  const address = textValue(body.address, 300);
  const rent = intValue(body.rent ?? body.defaultRent, 0, 1_000_000);
  const roomOccupancies = Array.isArray(body.roomOccupancies)
    ? body.roomOccupancies.slice(0, 100).map((value) => intValue(value, 1, 12))
    : Array.from({ length: intValue(body.rooms, 1, 100) }, () => intValue(body.bedsPerRoom, 1, 12));
  if (!name || !roomOccupancies.length) return apiError('Property name and at least one room are required');
  const now = new Date().toISOString();
  const amenities = Array.isArray(body.amenities) ? body.amenities.map((value) => textValue(value, 60)).filter(Boolean).slice(0, 30) : [];
  const result = await env.DB.prepare(`INSERT INTO properties (
      owner_id, name, address, city, property_type, audience, rent_due_day, grace_days, late_fee, default_rent,
      default_security, notice_days, agreement_required, verification_required, amenities_json, meal_plan,
      electricity_plan, climate_plan, bathroom_plan, timezone, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Asia/Kolkata', ?, ?)`)
    .bind(owner.id, name, address || null, textValue(body.city, 100) || null, textValue(body.type, 80) || null,
      textValue(body.audience, 40) || null, intValue(body.rentDueDay, 1, 28), intValue(body.graceDays, 0, 15),
      intValue(body.lateFee, 0, 100_000), rent, intValue(body.security, 0, 2_000_000), intValue(body.noticeDays, 0, 180),
      body.agreementRequired === false ? 0 : 1, body.verificationRequired === false ? 0 : 1, JSON.stringify(amenities),
      textValue(body.mealPlan, 80) || null, textValue(body.electricityPlan, 80) || null, textValue(body.climatePlan, 80) || null,
      textValue(body.bathroomPlan, 80) || null, now, now)
    .run();
  const propertyId = result.meta.last_row_id as number;
  const statements: D1PreparedStatement[] = [];
  const startingRoom = intValue(body.startingRoom, 1, 9999);
  for (let room = 0; room < roomOccupancies.length; room += 1) {
    for (let bed = 0; bed < roomOccupancies[room]; bed += 1) {
      statements.push(env.DB.prepare('INSERT INTO beds (property_id, room_no, bed_no, monthly_rent) VALUES (?, ?, ?, ?)')
        .bind(propertyId, String(startingRoom + room), String.fromCharCode(65 + bed), rent));
    }
  }
  for (let index = 0; index < statements.length; index += 80) await env.DB.batch(statements.slice(index, index + 80));
  await audit(owner, propertyId, 'create', 'property', propertyId, `Created ${name} with ${roomOccupancies.length} rooms and ${statements.length} beds`);
  return Response.json({ ok: true, propertyId, beds: statements.length }, { status: 201 });
}

export async function PATCH(request: Request) {
  const owner = await requireOwner(request, true);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const body = await request.json().catch(() => ({})) as { propertyId?: number; name?: string; address?: string };
  const propertyId = Number(body.propertyId);
  const name = textValue(body.name, 120);
  if (!propertyId || !name) return apiError('Property and a name are required');
  const owned = await env.DB.prepare('SELECT id FROM properties WHERE id = ? AND owner_id = ?').bind(propertyId, owner.id).first<{ id: number }>();
  if (!owned) return apiError('Property not found', 404);
  await env.DB.prepare('UPDATE properties SET name = ?, address = ?, updated_at = ? WHERE id = ?')
    .bind(name, textValue(body.address, 300) || null, new Date().toISOString(), propertyId)
    .run();
  await audit(owner, propertyId, 'update', 'property', propertyId, `Updated ${name}`);
  return Response.json({ ok: true });
}
