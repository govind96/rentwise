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
  `CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, property_id INTEGER NOT NULL, prospect_name TEXT NOT NULL,
    phone TEXT NOT NULL, expected_move_in TEXT NOT NULL, preferred_sharing TEXT, quoted_rent INTEGER NOT NULL DEFAULT 0,
    token_amount INTEGER NOT NULL DEFAULT 0, source TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'enquiry',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, property_id INTEGER NOT NULL, category TEXT NOT NULL, amount INTEGER NOT NULL,
    spent_on TEXT NOT NULL, vendor TEXT, reference TEXT, notes TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS work_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, property_id INTEGER NOT NULL, tenancy_id INTEGER, room_no TEXT,
    title TEXT NOT NULL, category TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'normal', status TEXT NOT NULL DEFAULT 'new',
    assignee TEXT, cost INTEGER NOT NULL DEFAULT 0, due_on TEXT, resolved_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tenancy_id INTEGER NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL,
    storage_key TEXT, original_name TEXT, content_type TEXT, size_bytes INTEGER, verification_status TEXT NOT NULL DEFAULT 'requested',
    expires_on TEXT, consent_recorded_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL, property_id INTEGER, actor TEXT NOT NULL,
    action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, summary TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notification_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, property_id INTEGER NOT NULL, tenancy_id INTEGER, channel TEXT NOT NULL,
    kind TEXT NOT NULL, recipient TEXT, status TEXT NOT NULL DEFAULT 'prepared', created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_charges_tenancy ON charges(tenancy_id, due_on)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_charges_tenancy_kind_period ON charges(tenancy_id, kind, period)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_property_status_move_in ON bookings(property_id, status, expected_move_in)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_property_spent_on ON expenses(property_id, spent_on)`,
  `CREATE INDEX IF NOT EXISTS idx_work_orders_property_status ON work_orders(property_id, status, priority)`,
  `CREATE INDEX IF NOT EXISTS idx_documents_tenancy_status ON documents(tenancy_id, verification_status)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_owner_created ON audit_events(owner_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id)`,
];

export async function ensureAppSchema() {
  if (!env.DB) throw new Error('Database unavailable');
  for (const statement of ensureStatements) await env.DB.prepare(statement).run();
  await ensureColumns('properties', {
    city: 'TEXT', property_type: 'TEXT', audience: 'TEXT', rent_due_day: 'INTEGER NOT NULL DEFAULT 5',
    grace_days: 'INTEGER NOT NULL DEFAULT 3', late_fee: 'INTEGER NOT NULL DEFAULT 0', default_rent: 'INTEGER NOT NULL DEFAULT 0',
    default_security: 'INTEGER NOT NULL DEFAULT 0', notice_days: 'INTEGER NOT NULL DEFAULT 30', agreement_required: 'INTEGER NOT NULL DEFAULT 1',
    verification_required: 'INTEGER NOT NULL DEFAULT 1', amenities_json: "TEXT NOT NULL DEFAULT '[]'", meal_plan: 'TEXT',
    electricity_plan: 'TEXT', climate_plan: 'TEXT', bathroom_plan: 'TEXT', timezone: "TEXT NOT NULL DEFAULT 'Asia/Kolkata'", updated_at: 'TEXT',
  });
  await ensureColumns('payments', {
    status: "TEXT NOT NULL DEFAULT 'confirmed'", idempotency_key: 'TEXT', receipt_number: 'TEXT', voided_at: 'TEXT',
  });
  await ensureColumns('beds', { floor_no: 'TEXT' });
  await ensureColumns('tenancies', {
    email: 'TEXT', occupation: 'TEXT', hometown: 'TEXT', emergency_name: 'TEXT', emergency_phone: 'TEXT',
    notice_given_on: 'TEXT', planned_exit_on: 'TEXT', actual_exit_on: 'TEXT', deposit_refunded: 'INTEGER NOT NULL DEFAULT 0', updated_at: 'TEXT',
  });
  await ensureColumns('charges', { description: 'TEXT', created_at: 'TEXT' });
  await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL').run();
  await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_receipt_number ON payments(receipt_number) WHERE receipt_number IS NOT NULL').run();
}

async function ensureColumns(table: string, wanted: Record<string, string>) {
  const rows = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  const existing = new Set(rows.results.map((row) => row.name));
  for (const [column, definition] of Object.entries(wanted)) {
    if (!existing.has(column)) await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

export function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

function addMonths(period: string, count: number) {
  const [year, month] = period.split('-').map(Number);
  const total = year * 12 + (month - 1) + count;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

type TenancySeed = { id: number; allotment_date: string; monthly_rent: number; security_amount: number; first_month_rent: number; rent_due_day?: number };

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
  const dueDay = String(Math.min(28, Math.max(1, tenancy.rent_due_day ?? 5))).padStart(2, '0');
  while (period <= now && guard < 240) {
    statements.push(db.prepare(`INSERT OR IGNORE INTO charges (tenancy_id, kind, period, amount, due_on, status)
      VALUES (?, 'monthly_rent', ?, ?, ?, 'due')`).bind(tenancy.id, period, tenancy.monthly_rent, `${period}-${dueDay}`));
    period = addMonths(period, 1);
    guard += 1;
  }
  await db.batch(statements);
}
