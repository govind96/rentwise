import { env } from 'cloudflare:workers';

const ensureStatements = [
  `CREATE TABLE IF NOT EXISTS owners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS beds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    room_no TEXT NOT NULL,
    bed_no TEXT NOT NULL,
    monthly_rent INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'vacant',
    UNIQUE(property_id, room_no, bed_no)
  )`,
  `CREATE TABLE IF NOT EXISTS tenancies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bed_id INTEGER NOT NULL,
    tenant_name TEXT NOT NULL,
    phone TEXT,
    allotment_date TEXT NOT NULL,
    monthly_rent INTEGER NOT NULL,
    security_amount INTEGER NOT NULL,
    first_month_rent INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
  )`,
  `CREATE TABLE IF NOT EXISTS charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenancy_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    period TEXT NOT NULL,
    amount INTEGER NOT NULL,
    due_on TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'due',
    UNIQUE(tenancy_id, kind, period)
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenancy_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    paid_on TEXT NOT NULL,
    mode TEXT NOT NULL,
    reference TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_charges_tenancy ON charges(tenancy_id, due_on)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_charges_tenancy_kind_period ON charges(tenancy_id, kind, period)`,
];

export async function ensureAppSchema() {
  if (!env.DB) throw new Error('Database unavailable');
  for (const statement of ensureStatements) await env.DB.prepare(statement).run();
}

export function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

function addMonths(period: string, count: number) {
  const [year, month] = period.split('-').map(Number);
  const total = year * 12 + (month - 1) + count;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

type TenancySeed = { id: number; allotment_date: string; monthly_rent: number; security_amount: number; first_month_rent: number };

// Idempotently backfills move-in charges and generates this (and past) months' rent
// for a tenancy. Monthly rent starts the month AFTER allotment — the allotment
// month is covered by its prorated first-month charge.
export async function ensureTenancyLedger(tenancy: TenancySeed) {
  const db = env.DB;
  if (!db) return;
  const start = (tenancy.allotment_date || currentPeriod()).slice(0, 7);
  const statements: D1PreparedStatement[] = [
    db.prepare(`INSERT OR IGNORE INTO charges (tenancy_id, kind, period, amount, due_on, status)
      VALUES (?, 'security', 'security', ?, ?, 'due')`).bind(tenancy.id, tenancy.security_amount, tenancy.allotment_date),
    db.prepare(`INSERT OR IGNORE INTO charges (tenancy_id, kind, period, amount, due_on, status)
      VALUES (?, 'prorated_rent', ?, ?, ?, 'due')`).bind(tenancy.id, start, tenancy.first_month_rent, tenancy.allotment_date),
  ];
  const now = currentPeriod();
  let period = addMonths(start, 1);
  let guard = 0;
  while (period <= now && guard < 24) {
    statements.push(db.prepare(`INSERT OR IGNORE INTO charges (tenancy_id, kind, period, amount, due_on, status)
      VALUES (?, 'monthly_rent', ?, ?, ?, 'due')`).bind(tenancy.id, period, tenancy.monthly_rent, `${period}-05`));
    period = addMonths(period, 1);
    guard += 1;
  }
  await db.batch(statements);
}
