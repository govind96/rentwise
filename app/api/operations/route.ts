import { env } from 'cloudflare:workers';
import { apiError, audit, intValue, isResponse, isoDate, ownedProperty, phoneValue, requireOwner, textValue } from '../../lib/api';
import { ensureAppSchema } from '../../lib/ledger';

const bookingStatuses = ['enquiry', 'visit', 'confirmed', 'checked_in', 'cancelled'];
const expenseCategories = ['utilities', 'maintenance', 'food', 'salary', 'supplies', 'tax', 'other'];

export async function POST(request: Request) {
  const owner = await requireOwner(request, true);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = textValue(body.action, 40);
  const propertyId = intValue(body.propertyId, 1);
  if (!propertyId || !(await ownedProperty(owner.id, propertyId))) return apiError('Property not found', 404);
  const now = new Date().toISOString();

  if (action === 'booking') {
    const name = textValue(body.name, 120); const phone = phoneValue(body.phone); const moveIn = isoDate(body.moveIn);
    if (!name || !phone || !moveIn) return apiError('Name, valid phone and move-in date are required');
    const result = await env.DB.prepare(`INSERT INTO bookings
      (property_id, prospect_name, phone, expected_move_in, preferred_sharing, quoted_rent, token_amount, source, notes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'enquiry', ?, ?)`)
      .bind(propertyId, name, phone, moveIn, textValue(body.sharing, 80) || null, intValue(body.quotedRent, 0, 1_000_000),
        intValue(body.token, 0, 1_000_000), textValue(body.source, 60) || null, textValue(body.notes, 500) || null, now, now).run();
    await audit(owner, propertyId, 'create', 'booking', result.meta.last_row_id as number, `Added enquiry for ${name}`);
    return Response.json({ ok: true, id: result.meta.last_row_id }, { status: 201 });
  }

  if (action === 'expense') {
    const category = textValue(body.category, 30).toLowerCase(); const amount = intValue(body.amount, 0, 10_000_000); const date = isoDate(body.date);
    if (!expenseCategories.includes(category) || !amount || !date) return apiError('Category, amount and date are required');
    const result = await env.DB.prepare(`INSERT INTO expenses (property_id, category, amount, spent_on, vendor, reference, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(propertyId, category, amount, date, textValue(body.vendor, 120) || null, textValue(body.reference, 120) || null, textValue(body.note, 500) || null, now).run();
    await audit(owner, propertyId, 'create', 'expense', result.meta.last_row_id as number, `Recorded ${category} expense of ${amount}`);
    return Response.json({ ok: true, id: result.meta.last_row_id }, { status: 201 });
  }

  if (action === 'work_order') {
    const title = textValue(body.title, 180); const room = textValue(body.room, 30);
    const priority = ['urgent', 'normal', 'low'].includes(String(body.priority)) ? String(body.priority) : 'normal';
    if (!title) return apiError('A repair description is required');
    const tenancyId = intValue(body.tenancyId, 0) || null;
    if (tenancyId) {
      const resident = await env.DB.prepare(`SELECT t.id FROM tenancies t JOIN beds b ON b.id=t.bed_id JOIN properties p ON p.id=b.property_id
        WHERE t.id=? AND p.id=? AND p.owner_id=?`).bind(tenancyId, propertyId, owner.id).first();
      if (!resident) return apiError('Resident not found', 404);
    }
    const result = await env.DB.prepare(`INSERT INTO work_orders
      (property_id, tenancy_id, room_no, title, category, priority, status, assignee, cost, due_on, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'new', ?, 0, ?, ?, ?)`)
      .bind(propertyId, tenancyId, room || null, title, textValue(body.category, 60) || 'Other', priority,
        textValue(body.assignee, 120) || null, isoDate(body.dueOn) || null, now, now).run();
    await audit(owner, propertyId, 'create', 'work_order', result.meta.last_row_id as number, title);
    return Response.json({ ok: true, id: result.meta.last_row_id }, { status: 201 });
  }

  if (action === 'notice') {
    const tenancyId = intValue(body.tenancyId, 1); const givenOn = isoDate(body.givenOn); const vacateOn = isoDate(body.vacateOn);
    if (!tenancyId || !givenOn || !vacateOn || vacateOn < givenOn) return apiError('Resident and valid notice dates are required');
    const resident = await env.DB.prepare(`SELECT t.id, t.tenant_name FROM tenancies t JOIN beds b ON b.id=t.bed_id JOIN properties p ON p.id=b.property_id
      WHERE t.id=? AND p.id=? AND p.owner_id=? AND t.status='active'`).bind(tenancyId, propertyId, owner.id).first<{ id: number; tenant_name: string }>();
    if (!resident) return apiError('Active resident not found', 404);
    await env.DB.prepare(`UPDATE tenancies SET status='notice', notice_given_on=?, planned_exit_on=?, updated_at=? WHERE id=?`)
      .bind(givenOn, vacateOn, now, tenancyId).run();
    await audit(owner, propertyId, 'notice', 'tenancy', tenancyId, `Exit planned for ${resident.tenant_name} on ${vacateOn}`);
    return Response.json({ ok: true });
  }

  if (action === 'notification') {
    const tenancyId = intValue(body.tenancyId, 0) || null;
    const kind = ['rent_reminder', 'receipt', 'document_request', 'maintenance_update', 'other'].includes(String(body.kind)) ? String(body.kind) : 'other';
    const channel = ['whatsapp', 'email', 'sms', 'manual'].includes(String(body.channel)) ? String(body.channel) : 'manual';
    await env.DB.prepare(`INSERT INTO notification_events (property_id, tenancy_id, channel, kind, recipient, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'prepared', ?)`)
      .bind(propertyId, tenancyId, channel, kind, textValue(body.recipient, 160) || null, now).run();
    return Response.json({ ok: true }, { status: 201 });
  }

  return apiError('Unknown operation');
}

export async function PATCH(request: Request) {
  const owner = await requireOwner(request, true);
  if (isResponse(owner)) return owner;
  await ensureAppSchema();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = textValue(body.action, 40); const propertyId = intValue(body.propertyId, 1); const id = intValue(body.id, 1);
  if (!propertyId || !id || !(await ownedProperty(owner.id, propertyId))) return apiError('Record not found', 404);
  const now = new Date().toISOString();

  if (action === 'booking_status') {
    const status = textValue(body.status, 20).replace('-', '_');
    if (!bookingStatuses.includes(status)) return apiError('Invalid booking status');
    const result = await env.DB.prepare(`UPDATE bookings SET status=?, updated_at=? WHERE id=? AND property_id=?`).bind(status, now, id, propertyId).run();
    if (!result.meta.changes) return apiError('Booking not found', 404);
    await audit(owner, propertyId, 'status', 'booking', id, `Booking moved to ${status}`);
    return Response.json({ ok: true });
  }

  if (action === 'work_order_status') {
    const current = await env.DB.prepare('SELECT status FROM work_orders WHERE id=? AND property_id=?').bind(id, propertyId).first<{ status: string }>();
    if (!current) return apiError('Work order not found', 404);
    const status = current.status === 'new' ? 'in_progress' : 'resolved';
    await env.DB.prepare('UPDATE work_orders SET status=?, resolved_at=?, updated_at=? WHERE id=?')
      .bind(status, status === 'resolved' ? now : null, now, id).run();
    await audit(owner, propertyId, 'status', 'work_order', id, `Work order moved to ${status}`);
    return Response.json({ ok: true });
  }

  if (action === 'complete_notice') {
    const tenancy = await env.DB.prepare(`SELECT t.bed_id FROM tenancies t JOIN beds b ON b.id=t.bed_id
      WHERE t.id=? AND b.property_id=? AND t.status='notice'`).bind(id, propertyId).first<{ bed_id: number }>();
    if (!tenancy) return apiError('Exit notice not found', 404);
    await env.DB.batch([
      env.DB.prepare(`UPDATE tenancies SET status='closed', actual_exit_on=?, deposit_refunded=?, updated_at=? WHERE id=?`)
        .bind(isoDate(body.actualExitOn) || now.slice(0, 10), body.depositRefunded ? 1 : 0, now, id),
      env.DB.prepare(`UPDATE beds SET status='vacant' WHERE id=?`).bind(tenancy.bed_id),
    ]);
    await audit(owner, propertyId, 'checkout', 'tenancy', id, 'Completed resident checkout and released bed');
    return Response.json({ ok: true });
  }

  return apiError('Unknown operation');
}
