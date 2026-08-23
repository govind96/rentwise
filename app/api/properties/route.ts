import { env } from 'cloudflare:workers';
import { getSessionOwner } from '../../lib/auth';
import { currentPeriod, ensureAppSchema, ensureTenancyLedger } from '../../lib/ledger';

type PropertyRow = { id: number; name: string; address: string | null };
type BedRow = { id: number; room_no: string; bed_no: string; monthly_rent: number; status: string };
type TenancyRow = {
  id: number; bed_id: number; tenant_name: string; phone: string | null; allotment_date: string;
  monthly_rent: number; security_amount: number; first_month_rent: number; room_no: string; bed_no: string;
};
type ChargeRow = { tenancy_id: number; kind: string; period: string; amount: number; due_on: string };
type PaymentRow = { id: number; tenancy_id: number; amount: number; paid_on: string; mode: string; reference: string | null };

export async function GET(request: Request) {
  if (!env.DB) return Response.json({ error: 'Database unavailable' }, { status: 500 });
  const ownerId = await getSessionOwner(request);
  if (!ownerId) return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  await ensureAppSchema();
  const url = new URL(request.url);
  const wanted = Number(url.searchParams.get('propertyId')) || null;

  const propertyRows = await env.DB.prepare('SELECT id, name, address FROM properties WHERE owner_id = ? ORDER BY id ASC')
    .bind(ownerId).all<PropertyRow>();
  const properties = propertyRows.results.map((row) => ({ id: row.id, name: row.name, address: row.address ?? '' }));
  if (!properties.length) {
    return Response.json({ properties: [], property: null, beds: [], tenants: [] });
  }
  const active = properties.find((item) => item.id === wanted) ?? properties[0];

  // Backfill/generate the ledger for every active tenancy of the active property.
  const tenancies = await env.DB.prepare(`SELECT t.id, t.allotment_date, t.monthly_rent, t.security_amount, t.first_month_rent,
      t.tenant_name, t.phone, b.room_no, b.bed_no, b.id AS bed_id
    FROM tenancies t JOIN beds b ON b.id = t.bed_id
    WHERE b.property_id = ? AND t.status = 'active'
    ORDER BY CAST(b.room_no AS INTEGER), b.bed_no`).bind(active.id).all<TenancyRow>();
  for (const tenancy of tenancies.results) await ensureTenancyLedger(tenancy);

  const beds = await env.DB.prepare('SELECT id, room_no, bed_no, monthly_rent, status FROM beds WHERE property_id = ? ORDER BY CAST(room_no AS INTEGER), bed_no')
    .bind(active.id).all<BedRow>();

  const chargeRows = await env.DB.prepare(`SELECT c.tenancy_id, c.kind, c.period, c.amount, c.due_on
    FROM charges c JOIN tenancies t ON t.id = c.tenancy_id JOIN beds b ON b.id = t.bed_id
    WHERE b.property_id = ? AND t.status = 'active'
    ORDER BY c.due_on ASC, c.id ASC`).bind(active.id).all<ChargeRow>();
  const paymentRows = await env.DB.prepare(`SELECT p.id, p.tenancy_id, p.amount, p.paid_on, p.mode, p.reference
    FROM payments p JOIN tenancies t ON t.id = p.tenancy_id JOIN beds b ON b.id = t.bed_id
    WHERE b.property_id = ? ORDER BY p.paid_on DESC, p.id DESC`).bind(active.id).all<PaymentRow>();

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
        id: payment.id, amount: payment.amount, date: payment.paid_on, mode: payment.mode, note: payment.reference || 'Payment received',
      })),
    };
  });

  return Response.json({ properties, property: active, beds: beds.results.map((bed) => ({ id: bed.id, room: bed.room_no, bed: bed.bed_no, rent: bed.monthly_rent, status: bed.status })), tenants });
}

export async function POST(request: Request) {
  if (!env.DB) return Response.json({ error: 'Database unavailable' }, { status: 500 });
  const ownerId = await getSessionOwner(request);
  if (!ownerId) return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  await ensureAppSchema();
  const body = await request.json().catch(() => ({})) as { name?: string; address?: string; rooms?: number; bedsPerRoom?: number; rent?: number };
  const name = String(body.name ?? '').trim();
  const address = String(body.address ?? '').trim();
  const rooms = Math.min(60, Math.max(1, Math.floor(Number(body.rooms) || 0)));
  const bedsPerRoom = Math.min(8, Math.max(1, Math.floor(Number(body.bedsPerRoom) || 0)));
  const rent = Math.max(0, Math.floor(Number(body.rent) || 0));
  if (!name || !rooms || !bedsPerRoom) return Response.json({ error: 'Name, rooms and beds per room are required' }, { status: 400 });
  const result = await env.DB.prepare('INSERT INTO properties (owner_id, name, address, created_at) VALUES (?, ?, ?, ?)')
    .bind(ownerId, name, address || null, new Date().toISOString())
    .run();
  const propertyId = result.meta.last_row_id as number;
  const statements: D1PreparedStatement[] = [];
  for (let room = 1; room <= rooms; room += 1) {
    for (let bed = 0; bed < bedsPerRoom; bed += 1) {
      statements.push(env.DB.prepare('INSERT INTO beds (property_id, room_no, bed_no, monthly_rent) VALUES (?, ?, ?, ?)')
        .bind(propertyId, String(room), String.fromCharCode(65 + bed), rent));
    }
  }
  if (statements.length) await env.DB.batch(statements);
  return Response.json({ ok: true, propertyId, beds: statements.length });
}

export async function PATCH(request: Request) {
  if (!env.DB) return Response.json({ error: 'Database unavailable' }, { status: 500 });
  const ownerId = await getSessionOwner(request);
  if (!ownerId) return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { propertyId?: number; name?: string; address?: string };
  const propertyId = Number(body.propertyId);
  const name = String(body.name ?? '').trim();
  if (!propertyId || !name) return Response.json({ error: 'Property and a name are required' }, { status: 400 });
  const owned = await env.DB.prepare('SELECT id FROM properties WHERE id = ? AND owner_id = ?').bind(propertyId, ownerId).first<{ id: number }>();
  if (!owned) return Response.json({ error: 'Property not found' }, { status: 404 });
  await env.DB.prepare('UPDATE properties SET name = ?, address = ? WHERE id = ?')
    .bind(name, String(body.address ?? '').trim() || null, propertyId)
    .run();
  return Response.json({ ok: true });
}
