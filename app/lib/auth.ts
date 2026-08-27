import { env } from 'cloudflare:workers';

export type OwnerContext = {
  id: number;
  platformUserId: string;
  email: string;
  name: string;
};

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

/** Resolve the Sites-authenticated visitor and lazily provision their owner row. */
export async function getOwnerContext(request: Request): Promise<OwnerContext | null> {
  if (!env.DB) return null;
  const platformUserId = request.headers.get('oai-authenticated-user-id')?.trim() ?? '';
  const email = request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase() ?? '';
  if (!platformUserId || !email || email.length > 254) return null;

  await ensureOwnerIdentitySchema();
  const now = new Date().toISOString();
  const name = decodeDisplayName(request);
  await env.DB.prepare(`INSERT INTO owners (platform_user_id, email, display_name, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      platform_user_id = COALESCE(owners.platform_user_id, excluded.platform_user_id),
      display_name = CASE WHEN excluded.display_name != '' THEN excluded.display_name ELSE owners.display_name END,
      last_seen_at = excluded.last_seen_at`)
    .bind(platformUserId, email, name || null, now, now).run();
  const owner = await env.DB.prepare(`SELECT id, email, COALESCE(display_name, '') AS display_name
    FROM owners WHERE platform_user_id = ? OR email = ? ORDER BY platform_user_id = ? DESC LIMIT 1`)
    .bind(platformUserId, email, platformUserId).first<{ id: number; email: string; display_name: string }>();
  return owner ? { id: owner.id, platformUserId, email: owner.email, name: owner.display_name || name } : null;
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
