'use client';

/**
 * Types, formatting helpers and demo fixtures shared by the dashboard views.
 * Workspace orchestration lives in page.tsx; each view lives in views/.
 */
import { authFetch } from '../lib/supabase-client';
import type { PropertyDraft } from './onboarding';

type View = 'overview' | 'property' | 'tenants' | 'rent' | 'bookings' | 'finance' | 'maintenance' | 'documents';
type Tenant = {
  id: number; room: string; bed: string; name: string; allotment: string;
  rent: number; security: number; firstMonthRent: number; received: number;
  status: 'paid' | 'partial'; phone?: string; profession?: string; hometown?: string;
  email?: string; emergencyName?: string; emergencyPhone?: string;
  kyc?: 'verified' | 'pending'; agreementEnd?: string; recurringReceived?: number;
  chargesTotal?: number; balance?: number;
  monthly?: { period: string; expected: number; paid: number; status: 'paid' | 'partial' | 'due' | 'na' } | null;
};
type Receipt = { id: number; amount: number; date: string; mode: string; note: string; receiptNumber?: string | null; hasProof?: boolean; proofName?: string | null };
type PropertyInfo = {
  id: number; name: string; address: string; city?: string;
  type?: PropertyDraft['type']; audience?: PropertyDraft['audience']; amenities?: string[];
  defaultRent?: number; defaultSecurity?: number; rentDueDay?: number; graceDays?: number; lateFee?: number;
  floors?: number; mealPlan?: PropertyDraft['mealPlan']; electricityPlan?: PropertyDraft['electricityPlan'];
  climatePlan?: PropertyDraft['climatePlan']; bathroomPlan?: PropertyDraft['bathroomPlan']; noticeDays?: number;
  agreementRequired?: boolean; verificationRequired?: boolean;
};
type WorkOrder = {
  id: number; title: string; room: string; tenant: string; category: string;
  priority: 'urgent' | 'normal' | 'low'; status: 'new' | 'in-progress' | 'resolved'; opened: string;
};
type Booking = {
  id: number; name: string; phone: string; moveIn: string; sharing: string;
  quotedRent: number; token: number; source: string; status: 'enquiry' | 'visit' | 'confirmed' | 'checked-in' | 'cancelled';
};
type Expense = {
  id: number; category: 'Utilities' | 'Maintenance' | 'Food' | 'Salary' | 'Supplies' | 'Tax' | 'Other';
  amount: number; date: string; vendor: string; note: string;
};
type ExitNotice = {
  id: number; tenantId: number; tenantName: string; room: string; givenOn: string; vacateOn: string;
  depositStatus: 'review' | 'ready' | 'refunded'; status: 'open' | 'completed';
};
type TenantDocument = {
  id: number; tenancyId: number; kind: string; label: string; originalName?: string | null;
  contentType?: string | null; sizeBytes?: number | null; status: 'requested' | 'uploaded' | 'verified' | 'rejected' | 'expired'; expiresOn?: string | null;
};
type ResidentInvite = { name: string; phone?: string; email: string; propertyName: string; room: string; bed: string };
type RealBed = { id: number; room: string; bed: string; rent: number; status: 'vacant' | 'occupied' };
type RoomInventory = [string, string[]][];
type ActivityEvent = { action: string; entityType: string; summary: string; at: string };
type PortfolioProperty = PropertyInfo & {
  inventory: RoomInventory; tenants: Tenant[]; orders: WorkOrder[];
  bookings?: Booking[]; expenses?: Expense[]; exitNotices?: ExitNotice[];
};

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const shortMoney = (value: number) => value >= 100000 ? `₹${(value / 100000).toFixed(1)}L` : `₹${Math.round(value / 1000)}k`;

async function apiRequest(url: string, init: RequestInit = {}) {
  const response = await authFetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(data.error || 'The request could not be completed');
  return data;
}

/** WhatsApp deep-link with a prefilled, friendly rent reminder — null when no usable phone. */
function waLink(tenant: Tenant, propertyName: string, balance: number): string | null {
  const digits = (tenant.phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const message = `Hi ${tenant.name.split(' ')[0]}, a gentle reminder from ${propertyName}: ${money.format(balance)} is pending for Room ${tenant.room}, Bed ${tenant.bed}. UPI works fine — thank you!`;
  return `https://wa.me/91${digits.slice(-10)}?text=${encodeURIComponent(message)}`;
}

/** Open a printable, self-contained receipt document for one payment. */
function printReceipt(tenant: Tenant, propertyName: string, receipt: Receipt, balance: number) {
  const win = window.open('', 'rentwise-receipt', 'width=760,height=900');
  if (!win) return;
  const esc = (value: string | number) => String(value).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] ?? ch));
  const rows: [string, string][] = [
    ['Receipt no', receipt.receiptNumber || 'Receipt pending'],
    ['Received from', esc(tenant.name)],
    ['Room / Bed', `Room ${esc(tenant.room)} · Bed ${esc(tenant.bed)}`],
    ['Amount received', money.format(receipt.amount)],
    ['Received on', esc(receipt.date)],
    ['Payment mode', esc(receipt.mode)],
    ...(receipt.note ? [['Reference', esc(receipt.note)] as [string, string]] : []),
    ['Ledger balance', balance > 0 ? money.format(balance) : '₹0 — Settled'],
  ];
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt · ${esc(tenant.name)}</title><style>
    body{font-family:ui-sans-serif,system-ui,'Segoe UI',Arial,sans-serif;margin:0;padding:44px;color:#141626;background:#f4f5fa}
    .sheet{max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4e6f0;border-radius:16px;padding:36px 40px}
    .brand{display:flex;align-items:center;gap:11px;font-weight:700;font-size:17px}
    .brand i{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#ea580c,#c2410c);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-size:15px}
    .brand em{margin-left:auto;font-style:normal;font:600 10px/1 ui-monospace,monospace;letter-spacing:.14em;color:#8a90ac;text-transform:uppercase}
    h1{font-size:22px;margin:24px 0 4px;letter-spacing:-.02em}
    .muted{color:#6b7190;font-size:13px;margin:0}
    table{width:100%;border-collapse:collapse;margin-top:22px}
    td{padding:11px 0;border-bottom:1px solid #eef0f7;font-size:13.5px;vertical-align:top}
    td:first-child{color:#6b7190;width:44%}
    td:last-child{font-weight:600;text-align:right}
    .foot{margin-top:26px;font-size:11px;color:#8a90ac;text-align:center}
    @media print{body{padding:0;background:#fff}.sheet{border:none}}
  </style></head><body><div class="sheet">
    <div class="brand"><i>₹</i>${esc(propertyName)}<em>Receipt</em></div>
    <h1>${money.format(receipt.amount)} received</h1>
    <p class="muted">Thank you, ${esc(tenant.name.split(' ')[0])} — this receipt confirms your payment.</p>
    <table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
    <p class="foot">Computer-generated receipt · ${esc(propertyName)} · RentWise</p>
  </div><script>window.onload=function(){window.print()}<\/script></body></html>`);
  win.document.close();
}

const NAV_ICONS: Record<View, string[]> = {
  overview: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22v-8h6v8'],
  property: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  tenants: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  rent: ['M6 3h12', 'M6 8h12', 'm6 13 8.5 8', 'M6 13h3', 'M9 13c6.667 0 6.667-10 0-10'],
  bookings: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z', 'm8 15 2 2 5-5'],
  finance: ['M3 3v18h18', 'm7 15 3-3 3 2 5-6', 'M7 7h.01'],
  documents: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8'],
  maintenance: ['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'],
};

function NavIcon({ paths }: { paths: string[] }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

// Demo fixtures keep dates relative to "today" and balances round, so the
// demo always reads like a real property mid-month.
const inDays = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

const seededTenants: Tenant[] = [
  { id: 1, room: '1', bed: 'A', name: 'Mahi Kumari', allotment: inDays(-33), rent: 2000, security: 2000, firstMonthRent: 1806, received: 3806, status: 'paid', kyc: 'verified' },
  { id: 2, room: '1', bed: 'B', name: 'Muskan Kumari', allotment: inDays(-33), rent: 2000, security: 2000, firstMonthRent: 1806, received: 3806, status: 'paid', kyc: 'verified' },
  { id: 3, room: '2', bed: 'A', name: 'Arya Kumari', allotment: inDays(-25), rent: 2000, security: 2000, firstMonthRent: 1290, received: 3290, status: 'paid', kyc: 'pending' },
  { id: 4, room: '11', bed: 'A', name: 'Aditi Prajapati', allotment: inDays(-28), rent: 3500, security: 3500, firstMonthRent: 2597, received: 3597, status: 'partial', kyc: 'verified' },
  { id: 5, room: '12', bed: 'A', name: 'Navya Kumari', allotment: inDays(-53), rent: 3500, security: 3500, firstMonthRent: 1919, received: 4419, status: 'partial', kyc: 'verified', recurringReceived: 3500 },
  { id: 6, room: '12', bed: 'B', name: 'Pragya Kumari', allotment: inDays(-53), rent: 3500, security: 3500, firstMonthRent: 1919, received: 5419, status: 'paid', kyc: 'verified' },
  { id: 7, room: '14', bed: 'A', name: 'Shristi Kumari', allotment: inDays(-28), rent: 3000, security: 3000, firstMonthRent: 2226, received: 2226, status: 'partial', kyc: 'pending' },
  { id: 8, room: '14', bed: 'B', name: 'Kajal Kumari', allotment: inDays(-28), rent: 3000, security: 3000, firstMonthRent: 2226, received: 4226, status: 'partial', kyc: 'verified' },
  { id: 9, room: '15', bed: 'A', name: 'Ankita Kumari', allotment: inDays(-36), rent: 3000, security: 3000, firstMonthRent: 3000, received: 6000, status: 'paid', kyc: 'verified' },
  { id: 10, room: '15', bed: 'B', name: 'Roshni Kumari', allotment: inDays(-36), rent: 3000, security: 3000, firstMonthRent: 3000, received: 6000, status: 'paid', kyc: 'verified' },
  { id: 11, room: '21', bed: 'A', name: 'Sakshi Singh', allotment: inDays(-22), rent: 3500, security: 3500, firstMonthRent: 1919, received: 1919, status: 'partial', kyc: 'pending' },
  { id: 12, room: '21', bed: 'B', name: 'Nimmy Jaiswal', allotment: inDays(-22), rent: 3500, security: 3500, firstMonthRent: 1919, received: 1919, status: 'partial', kyc: 'pending' },
  { id: 13, room: '22', bed: 'A', name: 'Ananya Shree', allotment: inDays(-36), rent: 3500, security: 3500, firstMonthRent: 3500, received: 7000, status: 'paid', kyc: 'verified' },
  { id: 14, room: '22', bed: 'B', name: 'Shalini Raj', allotment: inDays(-36), rent: 3500, security: 3500, firstMonthRent: 3500, received: 7000, status: 'paid', kyc: 'verified' },
  { id: 15, room: '23', bed: 'A', name: 'Pooja Kumari', allotment: inDays(-15), rent: 3000, security: 3000, firstMonthRent: 968, received: 1968, status: 'partial', kyc: 'pending' },
  { id: 16, room: '23', bed: 'B', name: 'Kabita Kumari', allotment: inDays(-15), rent: 3000, security: 3000, firstMonthRent: 968, received: 2968, status: 'partial', kyc: 'pending' },
  { id: 17, room: '25', bed: 'A', name: 'Sweety Kumari', allotment: inDays(-34), rent: 3000, security: 3000, firstMonthRent: 2806, received: 4806, status: 'partial', kyc: 'verified' },
  { id: 18, room: '25', bed: 'B', name: 'Meera Kumari', allotment: inDays(-15), rent: 3000, security: 3000, firstMonthRent: 968, received: 968, status: 'partial', kyc: 'pending' },
];

const seededOrders: WorkOrder[] = [
  { id: 1, title: 'Water pressure is low', room: '12', tenant: 'Navya Kumari', category: 'Plumbing', priority: 'urgent', status: 'new', opened: 'Today, 8:40 AM' },
  { id: 2, title: 'Ceiling fan making noise', room: '21', tenant: 'Sakshi Singh', category: 'Electrical', priority: 'normal', status: 'in-progress', opened: 'Yesterday' },
  { id: 3, title: 'Door latch needs replacement', room: '14', tenant: 'Kajal Kumari', category: 'Carpentry', priority: 'low', status: 'new', opened: '3 days ago' },
];

const seededBookings: Booking[] = [
  { id: 1, name: 'Ishita Verma', phone: '9876543281', moveIn: inDays(6), sharing: 'Double sharing', quotedRent: 3500, token: 1000, source: 'WhatsApp', status: 'confirmed' },
  { id: 2, name: 'Riya Singh', phone: '9876543282', moveIn: inDays(14), sharing: 'Triple sharing', quotedRent: 3000, token: 0, source: 'Walk-in', status: 'visit' },
];

const seededExpenses: Expense[] = [
  { id: 1, category: 'Utilities', amount: 8400, date: inDays(-19), vendor: 'BESCOM', note: 'Electricity bill' },
  { id: 2, category: 'Food', amount: 12600, date: inDays(-21), vendor: 'FreshKart Wholesale', note: 'Monthly provisions' },
  { id: 3, category: 'Maintenance', amount: 1850, date: inDays(-25), vendor: 'Local plumber', note: 'Pump and fittings' },
];

const seededNotices: ExitNotice[] = [
  { id: 1, tenantId: 6, tenantName: 'Pragya Kumari', room: '12', givenOn: inDays(-13), vacateOn: inDays(17), depositStatus: 'review', status: 'open' },
];

const seededInventory: RoomInventory = [
  ['1', ['A', 'B']], ['2', ['A', 'B']], ['3', ['A', 'B']], ['11', ['A', 'B']], ['12', ['A', 'B']], ['13', ['A', 'B']],
  ['14', ['A', 'B', 'C']], ['15', ['A', 'B']], ['21', ['A', 'B']], ['22', ['A', 'B']], ['23', ['A', 'B']], ['24', ['A', 'B', 'C']], ['25', ['A', 'B']],
];

export type MonthlyCollection = { month: string; amount: number };
export type PaymentSubmission = { id: number; tenancyId: number; tenantName: string; room: string; bed: string; amount: number; paidOn: string; mode: string; reference: string | null; proofName: string | null; at: string };
const seedMonth = (offset: number) => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };
const seededSubmissions: PaymentSubmission[] = [
  { id: 1, tenancyId: 5, tenantName: 'Navya Kumari', room: '12', bed: 'A', amount: 3500, paidOn: inDays(-2), mode: 'UPI', reference: 'UPI/439201877456', proofName: 'upi-receipt.png', at: new Date(Date.now() - 36e5 * 5).toISOString() },
];

const seededMonthlyCollections: MonthlyCollection[] = [
  { month: seedMonth(0), amount: 71337 },
  { month: seedMonth(1), amount: 62400 },
  { month: seedMonth(2), amount: 54900 },
];

const seededProperty: PortfolioProperty = {
  id: 1, name: 'Saffron Stay PG', address: 'Kalyan Nagar', city: 'Bengaluru', type: 'Paying guest', audience: 'Women',
  amenities: ['Wi-Fi', 'Meals', 'Laundry', 'Housekeeping', 'CCTV'], defaultRent: 3000, defaultSecurity: 3000,
  rentDueDay: 5, graceDays: 3, lateFee: 250, floors: 3, mealPlan: 'Included', electricityPlan: 'Metered separately',
  climatePlan: 'Mixed AC & non-AC', bathroomPlan: 'Mixed', noticeDays: 30, agreementRequired: true, verificationRequired: true,
  inventory: seededInventory, tenants: seededTenants, orders: seededOrders,
  bookings: seededBookings, expenses: seededExpenses, exitNotices: seededNotices,
};

const PORTFOLIO_STORAGE_KEY = 'rentwise-portfolio-v1';

function isPortfolioProperty(value: unknown): value is PortfolioProperty {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PortfolioProperty>;
  return typeof item.id === 'number' && typeof item.name === 'string' && typeof item.address === 'string'
    && Array.isArray(item.inventory) && item.inventory.every((room) => Array.isArray(room) && typeof room[0] === 'string' && Array.isArray(room[1]) && room[1].every((bed) => typeof bed === 'string'))
    && Array.isArray(item.tenants) && item.tenants.every((tenant) => tenant && typeof tenant === 'object' && typeof tenant.id === 'number' && typeof tenant.name === 'string' && typeof tenant.room === 'string' && typeof tenant.bed === 'string')
    && Array.isArray(item.orders) && item.orders.every((order) => order && typeof order === 'object' && typeof order.id === 'number' && typeof order.title === 'string');
}

function propertyInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PG';
}


function dueFor(tenant: Tenant) { return tenant.chargesTotal ?? (tenant.security + tenant.firstMonthRent); }
function balanceFor(tenant: Tenant) {
  if (tenant.balance != null) return tenant.balance;
  return Math.max(0, dueFor(tenant) - tenant.received);
}
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatPeriod(period: string) {
  const [year, month] = period.split('-').map(Number);
  return `${MONTH_NAMES[(month || 1) - 1]} ${year}`;
}
function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function longDate(date = new Date()) {
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}
function timeOfDay() {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}
function profileFor(tenant: Tenant) { return { profession: tenant.profession || 'Not recorded', hometown: tenant.hometown || 'Not recorded', phone: tenant.phone || 'Not recorded', kyc: tenant.kyc ?? 'pending', agreementEnd: tenant.agreementEnd || 'Not recorded' }; }
function proratedRent(monthlyRent: number, allotment: string) {
  if (!allotment) return 0;
  const date = new Date(`${allotment}T00:00:00`);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Math.round((monthlyRent * (daysInMonth - date.getDate() + 1)) / daysInMonth);
}

const heroExamples = [
  'Who needs a rent reminder?',
  'Which rooms have vacant beds?',
  'What maintenance needs attention today?',
  'How much rent is still pending?',
];

type Summary = { expected: number; collected: number; pending: number; totalBeds: number; occupied: number; recurringExpected: number; recurringCollected: number };

const viewCopy: Record<View, { eyebrow: string; title: string; subtitle: string }> = {
  overview: { eyebrow: longDate(), title: 'Welcome back.', subtitle: 'Here’s a calm, clear look at what your property needs today.' },
  property: { eyebrow: 'Property', title: 'Rooms & occupancy', subtitle: 'See every room, bed and tenant without opening a spreadsheet.' },
  tenants: { eyebrow: 'People', title: 'Tenant directory', subtitle: 'Complete resident records, payment standing and documents in one place.' },
  rent: { eyebrow: 'Money', title: 'Rent & collections', subtitle: 'Know what came in, what is pending and who needs a reminder.' },
  maintenance: { eyebrow: 'Operations', title: 'Maintenance desk', subtitle: 'Track issues from first report to completed repair.' },
  documents: { eyebrow: 'Tenant records', title: 'Documents & agreements', subtitle: 'Keep identity proofs, rental agreements and follow-ups together.' },
  bookings: { eyebrow: 'Move-ins & exits', title: 'Booking pipeline', subtitle: 'Turn enquiries into occupied beds and manage every planned checkout.' },
  finance: { eyebrow: 'Business', title: 'Expenses & profitability', subtitle: 'See the operating picture beyond collections, with clean monthly records.' },
};

export function ConfirmDialog({ state, onClose }: { state: { title: string; message: string; confirmLabel: string; action: () => void }; onClose: () => void }) {
  return <div className="modal-layer confirm-layer" onMouseDown={onClose}><section className="modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={state.title} onMouseDown={(event) => event.stopPropagation()}><p className="overline">PLEASE CONFIRM</p><h2>{state.title}</h2><p className="modal-copy">{state.message}</p><div className="confirm-actions"><button className="quiet-button" onClick={onClose}>Keep as is</button><button className="main-button" onClick={() => { onClose(); state.action(); }}>{state.confirmLabel}</button></div></section></div>;
}

export {
  apiRequest, waLink, printReceipt, NAV_ICONS, NavIcon,
  seededSubmissions, seededTenants, seededOrders, seededBookings, seededExpenses, seededNotices, seededInventory, seededProperty, seededMonthlyCollections,
  PORTFOLIO_STORAGE_KEY, isPortfolioProperty, propertyInitials, dueFor, balanceFor,
  formatPeriod, todayISO, longDate, timeOfDay, profileFor, proratedRent, heroExamples, viewCopy, money, shortMoney,
};
export type {
  View, Tenant, Receipt, PropertyInfo, WorkOrder, Booking, Expense, ExitNotice,
  TenantDocument, ResidentInvite, RealBed, RoomInventory, ActivityEvent, PortfolioProperty, Summary,
};
