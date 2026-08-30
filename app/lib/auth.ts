import { env } from 'cloudflare:workers';

export type OwnerContext = {
  id: number;
  platformUserId: string;
  email: string;
  name: string;
};

export type ResidentContext = {
  tenancyId: number;
  ownerId: number;
  propertyId: number;
  propertyName: string;
  tenantName: string;
  email: string;
  room: string;
  bed: string;
  monthlyRent: number;
};

type ExternalUser = { id: string; email?: string; user_metadata?: { full_name?: string; name?: string } };

function decodeDisplayName(request: Request) {
  const encoded = request.headers.get('oai-authenticated-user-full-name');
  if (!encoded || request.headers.get('oai-authenticated-user-full-name-encoding') !== 'percent-encoded-utf-8') return '';
  try { return decodeURIComponent(encoded).trim().slice(0, 120); } catch { return ''; }
}

async function ensureOwnerIdentitySchema() {
  const db = env.DB;
  if (!db) throw new Error('Database unavailable');
  await db.prepare(`CREATE TABLE IF NOT EXISTS owners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_user_id TEXT,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    created_at TEXT NOT NULL,
    last_seen_at TEXT
  )`).run();
  const columns = await db.prepare('PRAGMA table_info(owners)').all<{ name: string }>();
  const names = new Set(columns.results.map((column) => column.name));
  if (!names.has('platform_user_id')) await db.prepare('ALTER TABLE owners ADD COLUMN platform_user_id TEXT').run();
  if (!names.has('display_name')) await db.prepare('ALTER TABLE owners ADD COLUMN display_name TEXT').run();
  if (!names.has('last_seen_at')) await db.prepare('ALTER TABLE owners ADD COLUMN last_seen_at TEXT').run();
  await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_platform_user_id ON owners(platform_user_id) WHERE platform_user_id IS NOT NULL').run();
}

/** Resolve either a Sites identity or a verified Supabase session. */
export async function getAuthenticatedIdentity(request: Request): Promise<{ platformUserId: string; email: string; name: string } | null> {
  let platformUserId = request.headers.get('oai-authenticated-user-id')?.trim() ?? '';
  let email = request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase() ?? '';
  let name = decodeDisplayName(request);
  if (!platformUserId || !email) {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    const authUrl = env.SUPABASE_URL?.replace(/\/$/, ''); const key = env.SUPABASE_PUBLISHABLE_KEY;
    if (!token || !authUrl || !key) return null;
    const response = await fetch(`${authUrl}/auth/v1/user`, { headers: { authorization: `Bearer ${token}`, apikey: key } });
    if (!response.ok) return null;
    const user = await response.json() as ExternalUser;
    if (!user.id || !user.email) return null;
    platformUserId = `supabase:${user.id}`; email = user.email.trim().toLowerCase(); name = String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim().slice(0, 120);
  }
  if (!platformUserId || !email || email.length > 254) return null;
  return { platformUserId, email, name };
}

/** Resolve an existing owner account. New accounts are never provisioned by a sign-in. */
export async function getOwnerContext(request: Request): Promise<OwnerContext | null> {
  if (!env.DB) return null;
  const identity = await getAuthenticatedIdentity(request);
  if (!identity) return null;
  const { platformUserId, email, name } = identity;

  await ensureOwnerIdentitySchema();
  const now = new Date().toISOString();
  const owner = await env.DB.prepare(`SELECT id, email, COALESCE(display_name, '') AS display_name
    FROM owners WHERE platform_user_id = ? OR email = ? ORDER BY platform_user_id = ? DESC LIMIT 1`)
    .bind(platformUserId, email, platformUserId).first<{ id: number; email: string; display_name: string }>();
  if (!owner) return null;
  await env.DB.prepare(`UPDATE owners SET platform_user_id = ?, display_name = CASE WHEN ? != '' THEN ? ELSE display_name END, last_seen_at = ? WHERE id = ?`)
    .bind(platformUserId, name, name, now, owner.id).run();
  return { id: owner.id, platformUserId, email: owner.email, name: name || owner.display_name };
}

/**
 * Resident access is granted by the owner adding the resident's email to their
 * active tenancy. This deliberately has no self-service provisioning path.
 */
export async function getResidentContext(request: Request): Promise<ResidentContext | null> {
  if (!env.DB) return null;
  const identity = await getAuthenticatedIdentity(request);
  if (!identity) return null;
  return env.DB.prepare(`SELECT t.id AS tenancy_id, p.owner_id, p.id AS property_id, p.name AS property_name,
      t.tenant_name, t.email, b.room_no, b.bed_no, t.monthly_rent
    FROM tenancies t
    JOIN beds b ON b.id = t.bed_id
    JOIN properties p ON p.id = b.property_id
    WHERE lower(t.email) = ? AND t.status IN ('active', 'notice')
    ORDER BY CASE t.status WHEN 'active' THEN 0 ELSE 1 END, t.id DESC LIMIT 1`)
    .bind(identity.email).first<{ tenancy_id: number; owner_id: number; property_id: number; property_name: string; tenant_name: string; email: string; room_no: string; bed_no: string; monthly_rent: number }>()
    .then((row) => row ? {
      tenancyId: row.tenancy_id, ownerId: row.owner_id, propertyId: row.property_id, propertyName: row.property_name,
      tenantName: row.tenant_name, email: row.email, room: row.room_no, bed: row.bed_no, monthlyRent: row.monthly_rent,
    } : null);
}

/** Backwards-compatible helper used by route handlers. */
export async function getSessionOwner(request: Request): Promise<number | null> {
  return (await getOwnerContext(request))?.id ?? null;
}

/** Reject cross-site browser mutations before touching owner data. */
export function mutationAllowed(request: Request) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
