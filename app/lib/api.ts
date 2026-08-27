import { env } from 'cloudflare:workers';
import { getOwnerContext, mutationAllowed, type OwnerContext } from './auth';

export const noStore = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: noStore });
}

export async function requireOwner(request: Request, mutation = false): Promise<OwnerContext | Response> {
  if (!env.DB) return apiError('Database unavailable', 503);
  if (mutation && !mutationAllowed(request)) return apiError('Cross-site request blocked', 403);
  const owner = await getOwnerContext(request);
  return owner ?? apiError('Sign in is required', 401);
}

export function isResponse(value: OwnerContext | Response): value is Response {
  return value instanceof Response;
}

export function textValue(value: unknown, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function intValue(value: unknown, min = 0, max = 10_000_000) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min;
}

export function isoDate(value: unknown) {
  const date = textValue(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ? date : '';
}

export function phoneValue(value: unknown) {
  const digits = textValue(value, 24).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? digits : '';
}

export async function ownedProperty(ownerId: number, propertyId: number) {
  return env.DB.prepare('SELECT id FROM properties WHERE id = ? AND owner_id = ?').bind(propertyId, ownerId).first<{ id: number }>();
}

export async function audit(owner: OwnerContext, propertyId: number | null, action: string, entityType: string, entityId: string | number | null, summary: string) {
  await env.DB.prepare(`INSERT INTO audit_events (owner_id, property_id, actor, action, entity_type, entity_id, summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(owner.id, propertyId, owner.email, action, entityType, entityId == null ? null : String(entityId), summary.slice(0, 500), new Date().toISOString()).run();
}

export function receiptNumber(paymentId: number, paidOn: string) {
  return `RW-${paidOn.replaceAll('-', '')}-${String(paymentId).padStart(6, '0')}`;
}
