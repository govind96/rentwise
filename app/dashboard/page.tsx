'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import BrandMark from '../components/BrandMark';
import ThemeToggle from '../components/ThemeToggle';
import PropertyOnboarding, { PropertyDraft, PropertyPreset, roomOccupancies } from './onboarding';

type View = 'overview' | 'property' | 'tenants' | 'rent' | 'maintenance' | 'documents';
type Tenant = {
  id: number; room: string; bed: string; name: string; allotment: string;
  rent: number; security: number; firstMonthRent: number; received: number;
  status: 'paid' | 'partial'; phone?: string; profession?: string; hometown?: string;
  kyc?: 'verified' | 'pending'; agreementEnd?: string; recurringReceived?: number;
  chargesTotal?: number; balance?: number;
  monthly?: { period: string; expected: number; paid: number; status: 'paid' | 'partial' | 'due' | 'na' } | null;
};
type Receipt = { id: number; amount: number; date: string; mode: string; note: string };
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
type RealBed = { id: number; room: string; bed: string; rent: number; status: 'vacant' | 'occupied' };
type RoomInventory = [string, string[]][];
type PortfolioProperty = PropertyInfo & { inventory: RoomInventory; tenants: Tenant[]; orders: WorkOrder[] };

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const shortMoney = (value: number) => value >= 100000 ? `₹${(value / 100000).toFixed(1)}L` : `₹${Math.round(value / 1000)}k`;

const NAV_ICONS: Record<View, string[]> = {
  overview: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22v-8h6v8'],
  property: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  tenants: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  rent: ['M6 3h12', 'M6 8h12', 'm6 13 8.5 8', 'M6 13h3', 'M9 13c6.667 0 6.667-10 0-10'],
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

const seededTenants: Tenant[] = [
  { id: 1, room: '1', bed: 'A', name: 'Mahi Kumari', allotment: '2026-08-04', rent: 2000, security: 2000, firstMonthRent: 1806, received: 3806, status: 'paid', kyc: 'verified' },
  { id: 2, room: '1', bed: 'B', name: 'Muskan Kumari', allotment: '2026-08-04', rent: 2000, security: 2000, firstMonthRent: 1806, received: 3806, status: 'paid', kyc: 'verified' },
  { id: 3, room: '2', bed: 'A', name: 'Arya Kumari', allotment: '2026-08-12', rent: 2000, security: 2000, firstMonthRent: 1290, received: 3290, status: 'paid', kyc: 'pending' },
  { id: 4, room: '11', bed: 'A', name: 'Aditi Prajapati', allotment: '2026-08-09', rent: 3500, security: 3500, firstMonthRent: 2597, received: 6066, status: 'partial', kyc: 'verified' },
  { id: 5, room: '12', bed: 'A', name: 'Navya Kumari', allotment: '2026-07-15', rent: 3500, security: 3500, firstMonthRent: 1919, received: 5250, status: 'partial', kyc: 'verified', recurringReceived: 3500 },
  { id: 6, room: '12', bed: 'B', name: 'Pragya Kumari', allotment: '2026-07-15', rent: 3500, security: 3500, firstMonthRent: 1919, received: 5250, status: 'partial', kyc: 'verified', recurringReceived: 3500 },
  { id: 7, room: '14', bed: 'A', name: 'Shristi Kumari', allotment: '2026-08-09', rent: 3000, security: 3000, firstMonthRent: 2226, received: 1000, status: 'partial', kyc: 'pending' },
  { id: 8, room: '14', bed: 'B', name: 'Kajal Kumari', allotment: '2026-08-09', rent: 3000, security: 3000, firstMonthRent: 2226, received: 5225, status: 'partial', kyc: 'verified' },
  { id: 9, room: '15', bed: 'A', name: 'Ankita Kumari', allotment: '2026-08-01', rent: 3000, security: 3000, firstMonthRent: 3000, received: 6000, status: 'paid', kyc: 'verified' },
  { id: 10, room: '15', bed: 'B', name: 'Roshni Kumari', allotment: '2026-08-01', rent: 3000, security: 3000, firstMonthRent: 3000, received: 6000, status: 'paid', kyc: 'verified' },
  { id: 11, room: '21', bed: 'A', name: 'Sakshi Singh', allotment: '2026-08-15', rent: 3500, security: 3500, firstMonthRent: 1919, received: 1750, status: 'partial', kyc: 'pending' },
  { id: 12, room: '21', bed: 'B', name: 'Nimmy Jaiswal', allotment: '2026-08-15', rent: 3500, security: 3500, firstMonthRent: 1919, received: 1750, status: 'partial', kyc: 'pending' },
  { id: 13, room: '22', bed: 'A', name: 'Ananya Shree', allotment: '2026-08-01', rent: 3500, security: 3500, firstMonthRent: 3500, received: 7000, status: 'paid', kyc: 'verified' },
  { id: 14, room: '22', bed: 'B', name: 'Shalini Raj', allotment: '2026-08-01', rent: 3500, security: 3500, firstMonthRent: 3500, received: 7000, status: 'paid', kyc: 'verified' },
  { id: 15, room: '23', bed: 'A', name: 'Pooja Kumari', allotment: '2026-08-22', rent: 3000, security: 3000, firstMonthRent: 968, received: 1000, status: 'partial', kyc: 'pending' },
  { id: 16, room: '23', bed: 'B', name: 'Kabita Kumari', allotment: '2026-08-22', rent: 3000, security: 3000, firstMonthRent: 968, received: 1000, status: 'partial', kyc: 'pending' },
  { id: 17, room: '25', bed: 'A', name: 'Sweety Kumari', allotment: '2026-08-03', rent: 3000, security: 3000, firstMonthRent: 2806, received: 5800, status: 'partial', kyc: 'verified' },
  { id: 18, room: '25', bed: 'B', name: 'Meera Kumari', allotment: '2026-08-22', rent: 3000, security: 3000, firstMonthRent: 968, received: 1000, status: 'partial', kyc: 'pending' },
];

const seededOrders: WorkOrder[] = [
  { id: 1, title: 'Water pressure is low', room: '12', tenant: 'Navya Kumari', category: 'Plumbing', priority: 'urgent', status: 'new', opened: 'Today, 8:40 AM' },
  { id: 2, title: 'Ceiling fan making noise', room: '21', tenant: 'Sakshi Singh', category: 'Electrical', priority: 'normal', status: 'in-progress', opened: 'Yesterday' },
  { id: 3, title: 'Door latch needs replacement', room: '14', tenant: 'Kajal Kumari', category: 'Carpentry', priority: 'low', status: 'new', opened: '20 Aug' },
];

const seededInventory: RoomInventory = [
  ['1', ['A', 'B']], ['2', ['A', 'B']], ['3', ['A', 'B']], ['11', ['A', 'B']], ['12', ['A', 'B']], ['13', ['A', 'B']],
  ['14', ['A', 'B', 'C']], ['15', ['A', 'B']], ['21', ['A', 'B']], ['22', ['A', 'B']], ['23', ['A', 'B']], ['24', ['A', 'B', 'C']], ['25', ['A', 'B']],
];

const seededProperty: PortfolioProperty = {
  id: 1, name: 'Saffron Stay PG', address: 'Kalyan Nagar', city: 'Bengaluru', type: 'Paying guest', audience: 'Women',
  amenities: ['Wi-Fi', 'Meals', 'Laundry', 'Housekeeping', 'CCTV'], defaultRent: 3000, defaultSecurity: 3000,
  rentDueDay: 5, graceDays: 3, lateFee: 250, floors: 3, mealPlan: 'Included', electricityPlan: 'Metered separately',
  climatePlan: 'Mixed AC & non-AC', bathroomPlan: 'Mixed', noticeDays: 30, agreementRequired: true, verificationRequired: true,
  inventory: seededInventory, tenants: seededTenants, orders: seededOrders,
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

const profileData = [
  ['Student', 'Patna'], ['Designer', 'Ranchi'], ['Student', 'Gaya'], ['Analyst', 'Bhopal'], ['Student', 'Lucknow'], ['Teacher', 'Prayagraj'],
  ['Student', 'Jaipur'], ['Support executive', 'Delhi'], ['Developer', 'Raipur'], ['Student', 'Dhanbad'], ['Analyst', 'Varanasi'], ['Student', 'Kolkata'],
  ['Consultant', 'Pune'], ['Designer', 'Indore'], ['Student', 'Kanpur'], ['Student', 'Jamshedpur'], ['Executive', 'Patna'], ['Student', 'Ranchi'],
];

const paymentHistory: Record<number, { amount: number; date: string; mode: string; note: string }[]> = {
  1: [{ amount: 90, date: '09 Aug', mode: 'UPI', note: 'Balance settled' }, { amount: 1716, date: '05 Aug', mode: 'UPI', note: 'First-month rent' }, { amount: 2000, date: '03 Aug', mode: 'UPI', note: 'Security deposit' }],
  4: [{ amount: 6066, date: '09 Aug', mode: 'UPI', note: 'Security + rent' }],
  7: [{ amount: 1000, date: '06 Aug', mode: 'UPI', note: 'Part payment' }],
  11: [{ amount: 1750, date: '05 Aug', mode: 'UPI', note: 'Part payment' }],
};

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
function profileFor(tenant: Tenant) {
  const fallback = profileData[(tenant.id - 1) % profileData.length];
  return {
    profession: tenant.profession ?? fallback[0], hometown: tenant.hometown ?? fallback[1],
    phone: tenant.phone ?? `+91 9${tenant.id % 2 ? '8' : '7'}••• ••${String(400 + tenant.id).padStart(3, '0')}`,
    kyc: tenant.kyc ?? (tenant.id % 4 === 0 ? 'pending' : 'verified'),
    agreementEnd: tenant.agreementEnd ?? '31 Jul 2027',
  };
}
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
const sixDaysAgoLabel = (() => {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
})();

const viewCopy: Record<View, { eyebrow: string; title: string; subtitle: string }> = {
  overview: { eyebrow: longDate(), title: 'Welcome back.', subtitle: 'Here’s a calm, clear look at what your property needs today.' },
  property: { eyebrow: 'Property', title: 'Rooms & occupancy', subtitle: 'See every room, bed and tenant without opening a spreadsheet.' },
  tenants: { eyebrow: 'People', title: 'Tenant directory', subtitle: 'Complete resident records, payment standing and documents in one place.' },
  rent: { eyebrow: 'Money', title: 'Rent & collections', subtitle: 'Know what came in, what is pending and who needs a reminder.' },
  maintenance: { eyebrow: 'Operations', title: 'Maintenance desk', subtitle: 'Track issues from first report to completed repair.' },
  documents: { eyebrow: 'Tenant records', title: 'Documents & agreements', subtitle: 'Keep identity proofs, rental agreements and follow-ups together.' },
};

export default function DashboardPage() {
  return <Workspace />;
}

function Workspace() {
  const demo = true;
  const [view, setView] = useState<View>('overview');
  const [tenants, setTenants] = useState<Tenant[]>(demo ? seededTenants : []);
  const [orders, setOrders] = useState<WorkOrder[]>(demo ? seededOrders : []);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [modal, setModal] = useState<'tenant' | 'payment' | 'maintenance' | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [draftRent, setDraftRent] = useState(3000);
  const [draftDate, setDraftDate] = useState(todayISO());
  const [property, setProperty] = useState<PropertyInfo | null>(seededProperty);
  const [properties, setProperties] = useState<PropertyInfo[]>([seededProperty]);
  const [portfolio, setPortfolio] = useState<PortfolioProperty[]>([seededProperty]);
  const [activePropertyId, setActivePropertyId] = useState<number | null>(seededProperty.id);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [propEditOpen, setPropEditOpen] = useState(false);
  const [propertyOnboardingOpen, setPropertyOnboardingOpen] = useState(false);
  const [propertyPreset, setPropertyPreset] = useState<PropertyPreset>('classic-pg');
  const [realBeds, setRealBeds] = useState<RealBed[]>([]);
  const [demoInventory, setDemoInventory] = useState<RoomInventory>(seededInventory);
  const [realHistory, setRealHistory] = useState<Record<number, Receipt[]>>({});
  const [exampleIndex, setExampleIndex] = useState(0);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const workspaceOverlayOpen = modal !== null || drawerId !== null || assistantOpen || propEditOpen;

  useEffect(() => {
    if (!workspaceOverlayOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [workspaceOverlayOpen]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || propertyOnboardingOpen) return;
      if (drawerId !== null) setDrawerId(null);
      else if (modal !== null) setModal(null);
      else if (assistantOpen) setAssistantOpen(false);
      else if (propEditOpen) setPropEditOpen(false);
      else if (switcherOpen) setSwitcherOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [assistantOpen, drawerId, modal, propEditOpen, propertyOnboardingOpen, switcherOpen]);

  useEffect(() => {
    const cycle = window.setInterval(() => setExampleIndex((index) => (index + 1) % heroExamples.length), 4200);
    return () => window.clearInterval(cycle);
  }, []);

  function loadRealData(propertyId?: number | null) {
    const suffix = propertyId ? `?propertyId=${propertyId}` : '';
    fetch(`/api/properties${suffix}`)
      .then((response) => response.ok ? response.json() as Promise<{
        properties: PropertyInfo[]; property: PropertyInfo | null; beds: RealBed[];
        tenants: { id: number; room: string; bed: string; name: string; phone: string | null; allotment: string;
          rent: number; security: number; firstMonthRent: number; received: number;
          chargesTotal?: number; balance?: number; monthly?: Tenant['monthly'];
          payments?: { id: number; amount: number; date: string; mode: string; note: string }[];
        }[];
      }> : null)
      .then((data) => {
        if (!data) return;
        if (!data.property) return;
        setProperties(data.properties);
        setProperty(data.property);
        setActivePropertyId(data.property.id);
        setRealBeds(data.beds);
        const history: Record<number, Receipt[]> = {};
        for (const row of data.tenants) if (row.payments?.length) history[row.id] = row.payments;
        setRealHistory(history);
        setTenants(data.tenants.map((row) => ({
          id: row.id, room: String(row.room), bed: String(row.bed), name: row.name, phone: row.phone ?? undefined,
          allotment: row.allotment, rent: row.rent, security: row.security, firstMonthRent: row.firstMonthRent,
          received: row.received, chargesTotal: row.chargesTotal, balance: row.balance, monthly: row.monthly ?? null,
          status: (row.balance != null ? row.balance <= 0 : row.received >= row.security + row.firstMonthRent) ? 'paid' as const : 'partial' as const,
          kyc: 'pending' as const,
        })));
        setOrders([]);
      })
      .catch(() => showToast('Could not refresh the workspace'));
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(PORTFOLIO_STORAGE_KEY) ?? 'null') as { portfolio?: unknown[]; activePropertyId?: number } | null;
        const savedPortfolio = saved?.portfolio?.filter(isPortfolioProperty) ?? [];
        if (savedPortfolio.length) {
          const active = savedPortfolio.find((item) => item.id === saved?.activePropertyId) ?? savedPortfolio[0];
          setPortfolio(savedPortfolio); setProperties(savedPortfolio); setProperty(active); setActivePropertyId(active.id);
          setTenants(active.tenants); setOrders(active.orders); setDemoInventory(active.inventory);
          setDraftRent(active.defaultRent ?? 3000);
        }
        const params = new URLSearchParams(window.location.search);
        if (params.get('newProperty') === '1') {
          const requestedPreset = params.get('preset');
          setPropertyPreset(requestedPreset === 'student-hostel' || requestedPreset === 'co-living' ? requestedPreset : 'classic-pg');
          setPropertyOnboardingOpen(true);
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch {
        window.localStorage.removeItem(PORTFOLIO_STORAGE_KEY);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setAssistantOpen(true);
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  const inventory: RoomInventory = useMemo(() => {
    if (demo) return demoInventory;
    if (!realBeds.length) return seededInventory;
    const groups = new Map<string, string[]>();
    for (const bed of realBeds) groups.set(bed.room, [...(groups.get(bed.room) ?? []), bed.bed]);
    return [...groups.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [demo, demoInventory, realBeds]);

  const metrics = useMemo(() => {
    const expected = tenants.reduce((sum, tenant) => sum + dueFor(tenant), 0);
    const collected = tenants.reduce((sum, tenant) => sum + Math.min(tenant.received, dueFor(tenant)), 0);
    const totalBeds = inventory.reduce((sum, [, beds]) => sum + beds.length, 0);
    const recurringExpected = tenants.reduce((sum, tenant) => sum + (tenant.monthly ? tenant.monthly.expected : demo && tenant.allotment < '2026-08-01' ? tenant.rent : 0), 0);
    const recurringCollected = tenants.reduce((sum, tenant) => sum + (tenant.monthly ? Math.min(tenant.monthly.paid, tenant.monthly.expected) : demo ? (tenant.recurringReceived ?? ([5, 6].includes(tenant.id) ? 3500 : 0)) : 0), 0);
    return { expected, collected, pending: Math.max(0, expected - collected), totalBeds, occupied: tenants.length, recurringExpected, recurringCollected };
  }, [tenants, inventory, demo]);

  const propertyLabel = property?.name ?? 'Saffron Stay PG';
  const availableBeds = inventory.flatMap(([room, beds]) => beds.filter((bed) => !tenants.some((tenant) => tenant.room === room && tenant.bed === bed)).map((bed) => ({ room, bed })));
  const filteredTenants = tenants.filter((tenant) => {
    const profile = profileFor(tenant);
    const matches = `${tenant.name} ${tenant.room} ${tenant.bed} ${profile.phone}`.toLowerCase().includes(query.toLowerCase());
    const balance = balanceFor(tenant);
    return matches && (filter === 'all' || (filter === 'pending' ? balance > 0 : balance === 0));
  });
  const drawerTenant = tenants.find((tenant) => tenant.id === drawerId) ?? null;
  const selectedTenant = tenants.find((tenant) => tenant.id === selectedId) ?? null;
  const copy = viewCopy[view];

  function showToast(message: string) { setToast(message); window.setTimeout(() => setToast(''), 2600); }
  function persistState(nextTenants = tenants, nextOrders = orders, nextInventory = demoInventory) {
    const nextPortfolio = portfolio.map((item) => item.id === activePropertyId ? { ...item, tenants: nextTenants, orders: nextOrders, inventory: nextInventory } : item);
    setPortfolio(nextPortfolio); setProperties(nextPortfolio);
    try { window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify({ portfolio: nextPortfolio, activePropertyId })); }
    catch { showToast('This browser could not save the demo change'); }
  }

  function openPropertyOnboarding() { setSwitcherOpen(false); setPropertyPreset('classic-pg'); setPropertyOnboardingOpen(true); }
  function downloadPortfolioBackup() {
    const latestPortfolio = portfolio.map((item) => item.id === activePropertyId ? { ...item, tenants, orders, inventory: demoInventory } : item);
    const payload = JSON.stringify({ format: 'rentwise-portfolio', version: 1, exportedAt: new Date().toISOString(), activePropertyId, portfolio: latestPortfolio }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `rentwise-backup-${todayISO()}.json`; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSwitcherOpen(false); showToast('Portfolio backup downloaded');
  }
  async function restorePortfolioBackup(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('Backup is too large');
      const data = JSON.parse(await file.text()) as { format?: string; version?: number; activePropertyId?: number; portfolio?: unknown[] };
      if (data.format !== 'rentwise-portfolio' || data.version !== 1 || !Array.isArray(data.portfolio)) throw new Error('Unknown backup format');
      const restored = data.portfolio.filter(isPortfolioProperty);
      if (!restored.length || restored.length !== data.portfolio.length) throw new Error('Incomplete backup');
      const active = restored.find((item) => item.id === data.activePropertyId) ?? restored[0];
      setPortfolio(restored); setProperties(restored); setProperty(active); setActivePropertyId(active.id);
      setTenants(active.tenants); setOrders(active.orders); setDemoInventory(active.inventory); setDraftRent(active.defaultRent ?? 3000);
      setSwitcherOpen(false); setView('overview');
      window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify({ portfolio: restored, activePropertyId: active.id }));
      showToast(`${restored.length} ${restored.length === 1 ? 'property' : 'properties'} restored from backup`);
    } catch {
      showToast('That file is not a valid RentWise backup');
    } finally {
      input.value = '';
    }
  }
  function createProperty(draft: PropertyDraft) {
    const id = Math.max(...portfolio.map((item) => item.id), 0) + 1;
    const plannedRooms = roomOccupancies(draft);
    const nextInventory: RoomInventory = plannedRooms.map((bedCount, roomIndex) => [String(draft.startingRoom + roomIndex), Array.from({ length: bedCount }, (_, bedIndex) => String.fromCharCode(65 + bedIndex))]);
    const currentPortfolio = portfolio.map((item) => item.id === activePropertyId ? { ...item, tenants, orders, inventory: demoInventory } : item);
    const created: PortfolioProperty = {
      id, name: draft.name, address: draft.address, city: draft.city, type: draft.type, audience: draft.audience,
      amenities: draft.amenities, defaultRent: draft.rent, defaultSecurity: draft.security, rentDueDay: draft.rentDueDay,
      graceDays: draft.graceDays, lateFee: draft.lateFee, floors: draft.floors, mealPlan: draft.mealPlan,
      electricityPlan: draft.electricityPlan, climatePlan: draft.climatePlan, bathroomPlan: draft.bathroomPlan,
      noticeDays: draft.noticeDays, agreementRequired: draft.agreementRequired, verificationRequired: draft.verificationRequired,
      inventory: nextInventory, tenants: [], orders: [],
    };
    const nextPortfolio = [...currentPortfolio, created];
    setPortfolio(nextPortfolio); setProperties(nextPortfolio); setProperty(created); setActivePropertyId(id);
    setTenants([]); setOrders([]); setDemoInventory(nextInventory); setDraftRent(draft.rent);
    setPropertyOnboardingOpen(false); setView('property');
    try { window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify({ portfolio: nextPortfolio, activePropertyId: id })); } catch { /* UI remains usable for this session */ }
    showToast(`${draft.name} is ready — ${plannedRooms.length} rooms and ${plannedRooms.reduce((sum, beds) => sum + beds, 0)} beds created`);
  }
  function addTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget); const [room, bed] = String(data.get('bed')).split('-');
    const rent = Number(data.get('rent')); const security = Number(data.get('security')); const allotment = String(data.get('allotment'));
    const name = String(data.get('name')).trim(); const phone = String(data.get('phone')).trim();
    const firstMonth = proratedRent(rent, allotment);
    setModal(null); showToast('Tenant added and dues created');
    if (!demo && property) {
      const bedRecord = realBeds.find((candidate) => candidate.room === room && candidate.bed === bed && candidate.status === 'vacant');
      if (bedRecord) void fetch('/api/tenancies', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bedId: bedRecord.id, name, phone, allotment, rent, security, firstMonthRent: firstMonth }) }).then(() => loadRealData(activePropertyId));
      else showToast('That bed was just taken — refresh and pick another');
      return;
    }
    const next = [...tenants, { id: Math.max(...tenants.map((tenant) => tenant.id), 0) + 1, room, bed, name, phone, allotment, rent, security, firstMonthRent: firstMonth, received: 0, status: 'partial' as const, kyc: 'pending' as const }];
    setTenants(next); persistState(next, orders);
  }
  function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get('amount'));
    setModal(null); showToast(`${money.format(amount)} receipt recorded`);
    if (!demo && selectedId != null) {
      void fetch('/api/payments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenancyId: selectedId, amount, paidOn: String(data.get('date') || ''), mode: String(data.get('mode') || 'UPI'), reference: String(data.get('reference') || '') }) })
        .then(() => { showToast(`${money.format(amount)} saved to your ledger`); loadRealData(activePropertyId); })
        .catch(() => showToast('Could not reach the server — try again'));
      return;
    }
    const next = tenants.map((tenant) => tenant.id === selectedId ? { ...tenant, received: tenant.received + amount, status: tenant.received + amount >= dueFor(tenant) ? 'paid' as const : 'partial' as const } : tenant);
    setTenants(next); persistState(next, orders);
  }
  function updateOrder(id: number) {
    const next = orders.map((order) => order.id === id ? { ...order, status: order.status === 'new' ? 'in-progress' as const : 'resolved' as const } : order);
    setOrders(next); persistState(tenants, next); showToast('Maintenance status updated');
  }
  function addMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: WorkOrder[] = [{
      id: Math.max(...orders.map((order) => order.id), 0) + 1,
      title: String(data.get('title')).trim(), room: String(data.get('room')).trim(),
      tenant: String(data.get('tenant')).trim() || 'Owner reported', category: String(data.get('category')),
      priority: String(data.get('priority')) as WorkOrder['priority'], status: 'new', opened: 'Just now',
    }, ...orders];
    setOrders(next); persistState(tenants, next); setModal(null); showToast('Maintenance request created');
  }
  function openPayment(id: number) { setSelectedId(id); setModal('payment'); }
  function goTo(next: View) { setView(next); setDrawerId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function switchProperty(id: number) {
    setSwitcherOpen(false);
    if (id === activePropertyId) return;
    if (!demo) { setActivePropertyId(id); loadRealData(id); return; }
    const nextPortfolio = portfolio.map((item) => item.id === activePropertyId ? { ...item, tenants, orders, inventory: demoInventory } : item);
    const target = nextPortfolio.find((item) => item.id === id);
    if (!target) return;
    setPortfolio(nextPortfolio); setProperties(nextPortfolio); setProperty(target); setActivePropertyId(id);
    setTenants(target.tenants); setOrders(target.orders); setDemoInventory(target.inventory); setDraftRent(target.defaultRent ?? 3000); setView('overview');
    try { window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify({ portfolio: nextPortfolio, activePropertyId: id })); } catch { /* Session state still works */ }
    showToast(`Switched to ${target.name}`);
  }
  function vacateTenant(id: number) {
    if (!window.confirm('Close this tenancy and free the bed? Their payment history stays in your ledger.')) return;
    void fetch('/api/tenancies', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenancyId: id, vacate: true }) })
      .then(() => { setDrawerId(null); showToast('Tenancy closed — bed is vacant'); loadRealData(activePropertyId); })
      .catch(() => showToast('Could not reach the server — try again'));
  }
  function updateTenant(id: number, patch: { name?: string; phone?: string; rent?: number; security?: number }) {
    void fetch('/api/tenancies', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenancyId: id, ...patch }) })
      .then(() => { showToast('Tenant details updated'); loadRealData(activePropertyId); })
      .catch(() => showToast('Could not reach the server — try again'));
  }
  function voidReceipt(paymentId: number) {
    if (!window.confirm('Void this receipt? The balance will be recalculated.')) return;
    void fetch('/api/payments', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paymentId }) })
      .then(() => { showToast('Receipt voided'); loadRealData(activePropertyId); })
      .catch(() => showToast('Could not reach the server — try again'));
  }
  function savePropertyDetails(name: string, address: string) {
    if (!activePropertyId) return;
    if (demo) {
      const nextPortfolio = portfolio.map((item) => item.id === activePropertyId ? { ...item, name, address, tenants, orders, inventory: demoInventory } : item);
      const updated = nextPortfolio.find((item) => item.id === activePropertyId) ?? null;
      setPortfolio(nextPortfolio); setProperties(nextPortfolio); setProperty(updated); setPropEditOpen(false);
      try { window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify({ portfolio: nextPortfolio, activePropertyId })); } catch { /* Session state still works */ }
      showToast('Property details updated');
      return;
    }
    void fetch('/api/properties', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ propertyId: activePropertyId, name, address }) })
      .then(() => { setPropEditOpen(false); showToast('Property updated'); loadRealData(activePropertyId); })
      .catch(() => showToast('Could not reach the server — try again'));
  }

  return (
    <div className="shell">
      <input ref={backupInputRef} className="file-input-hidden" type="file" accept="application/json,.json" aria-label="Restore portfolio backup" onChange={(event) => void restorePortfolioBackup(event)} />
      <aside className="side">
        <button className="logo" onClick={() => goTo('overview')}><BrandMark /><strong>RentWise</strong><em>OS</em></button>
        <div className="prop-switch">
          <button className="property-select" aria-expanded={switcherOpen} onClick={() => properties.length > 0 ? setSwitcherOpen((open) => !open) : openPropertyOnboarding()}><span className="property-thumb">{propertyInitials(property?.name ?? 'Saffron Stay PG')}</span><span><small>{properties.length > 1 ? `${properties.length} PROPERTIES` : 'YOUR PROPERTY'}</small><strong>{property?.name ?? 'Saffron Stay PG'}</strong><em>{property ? `${property.address}${property.city ? `, ${property.city}` : ''}` : 'Kalyan Nagar, Bengaluru'}</em></span><b>⌄</b></button>
          {switcherOpen && <>
            <button className="prop-backdrop" aria-label="Close property menu" onClick={() => setSwitcherOpen(false)} />
            <div className="prop-menu" role="menu">
              {properties.map((item) => <button key={item.id} role="menuitem" className={item.id === activePropertyId ? 'prop-item active' : 'prop-item'} onClick={() => switchProperty(item.id)}><span>{propertyInitials(item.name)}</span><p><strong>{item.name}</strong><small>{item.address || 'No address yet'}</small></p>{item.id === activePropertyId && <b>✓</b>}</button>)}
              <div className="prop-divider" />
              <button role="menuitem" className="prop-item add" onClick={openPropertyOnboarding}><span>＋</span><p><strong>Add another property</strong><small>Build rooms, beds and rent defaults</small></p></button>
              <button role="menuitem" className="prop-item backup" onClick={downloadPortfolioBackup}><span>⇩</span><p><strong>Download portfolio backup</strong><small>Keep a portable copy of this browser’s data</small></p></button>
              <button role="menuitem" className="prop-item backup" onClick={() => { setSwitcherOpen(false); backupInputRef.current?.click(); }}><span>↥</span><p><strong>Restore portfolio backup</strong><small>Open a RentWise JSON backup on this device</small></p></button>
            </div>
          </>}
        </div>
        <nav aria-label="Owner workspace">
          <p>WORKSPACE</p>
          {([
            ['overview', 'Today'], ['property', 'Property'], ['tenants', 'Tenants'], ['rent', 'Rent & payments'], ['documents', 'Documents'], ['maintenance', 'Maintenance'],
          ] as [View, string][]).map(([id, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => goTo(id)}><NavIcon paths={NAV_ICONS[id]} /><span>{label}</span>{id === 'rent' && <b>{tenants.filter((tenant) => balanceFor(tenant) > 0).length}</b>}{id === 'maintenance' && orders.length > 0 && <b>{orders.filter((order) => order.status !== 'resolved').length}</b>}</button>)}
        </nav>
        <div className="side-bottom"><ThemeToggle /><div className="owner-chip"><span>SK</span><div><strong>Sample owner</strong><small>{properties.length} {properties.length === 1 ? 'property' : 'properties'}</small></div><b>•••</b></div><p className="no-login">Public demo · Changes stay in this browser</p></div>
      </aside>

      <div className="workspace">
        <div className="mobile-topbar"><button className="mobile-brand" onClick={() => goTo('overview')}><BrandMark /><strong>RentWise</strong></button><button className="mobile-lookup" onClick={() => { setFilter('all'); goTo('tenants'); }}><span>⌕</span><em>Search tenant or room</em></button><ThemeToggle compact /><button className="mobile-create" aria-label="Create new allotment" onClick={() => setModal('tenant')}>＋</button></div>
        <div className="mobile-property-switch">
          <button className="property-select" aria-expanded={switcherOpen} onClick={() => setSwitcherOpen((open) => !open)}><span className="property-thumb">{propertyInitials(property?.name ?? 'Saffron Stay PG')}</span><span><small>ACTIVE PROPERTY</small><strong>{property?.name ?? 'Saffron Stay PG'}</strong><em>{properties.length} {properties.length === 1 ? 'property' : 'properties'} in portfolio</em></span><b>⌄</b></button>
          {switcherOpen && <><button className="prop-backdrop" aria-label="Close property menu" onClick={() => setSwitcherOpen(false)} /><div className="prop-menu" role="menu">{properties.map((item) => <button key={item.id} role="menuitem" className={item.id === activePropertyId ? 'prop-item active' : 'prop-item'} onClick={() => switchProperty(item.id)}><span>{propertyInitials(item.name)}</span><p><strong>{item.name}</strong><small>{item.address || 'No address yet'}</small></p>{item.id === activePropertyId && <b>✓</b>}</button>)}<div className="prop-divider" /><button role="menuitem" className="prop-item add" onClick={openPropertyOnboarding}><span>＋</span><p><strong>Add another property</strong><small>Build rooms, beds and rent defaults</small></p></button><button role="menuitem" className="prop-item backup" onClick={downloadPortfolioBackup}><span>⇩</span><p><strong>Download portfolio backup</strong><small>Keep a portable copy of this browser’s data</small></p></button><button role="menuitem" className="prop-item backup" onClick={() => { setSwitcherOpen(false); backupInputRef.current?.click(); }}><span>↥</span><p><strong>Restore portfolio backup</strong><small>Open a RentWise JSON backup on this device</small></p></button></div></>}
        </div>
        <div className="mobile-nav">{(['overview', 'property', 'tenants', 'rent', 'documents', 'maintenance'] as View[]).map((item) => <button key={item} className={view === item ? 'active' : ''} onClick={() => goTo(item)}>{({ overview: 'Today', property: 'Property', tenants: 'Tenants', rent: 'Rent', documents: 'Documents', maintenance: 'Repairs' } as Record<View, string>)[item]}</button>)}</div>
        <main className="view-stage" key={view}>
        <header className="page-head">
          <div><p className="overline">{copy.eyebrow}</p><h1>{view === 'overview' ? <><em>Good {timeOfDay()}</em>{demo ? ', Govind.' : '.'}</> : copy.title}</h1><p>{copy.subtitle}</p></div>
          <div className="head-actions"><span className="live-state"><i /> Live</span><button className="quiet-button" onClick={() => { setView('tenants'); setFilter('pending'); }}>⌕ Find tenant</button><button className="main-button" onClick={() => setModal('tenant')}>＋ New allotment</button></div>
        </header>

        {view === 'overview' && (
          <form className="prompt-bar" onSubmit={(event) => { event.preventDefault(); setAssistantOpen(true); }}>
            <span className="prompt-orb" aria-hidden="true">✦</span>
            <input readOnly aria-label="Ask RentWise anything" placeholder={heroExamples[exampleIndex]} onFocus={(event) => { event.currentTarget.blur(); setAssistantOpen(true); }} />
            <button type="submit">Ask<i>↗</i></button>
          </form>
        )}

        {view === 'overview' && <Overview propertyName={propertyLabel} demo={demo} tenants={tenants} orders={orders} metrics={metrics} inventory={inventory} availableBeds={availableBeds.length} onView={goTo} onTenant={setDrawerId} onPayment={openPayment} />}
        {view === 'property' && property && <PropertyView property={property} tenants={tenants} inventory={inventory} availableCount={availableBeds.length} onTenant={setDrawerId} onAdd={() => setModal('tenant')} onEdit={() => setPropEditOpen(true)} onNewProperty={openPropertyOnboarding} />}
        {view === 'tenants' && <TenantsView tenants={filteredTenants} totals={{ active: tenants.length, verified: tenants.filter((tenant) => profileFor(tenant).kyc === 'verified').length, clear: tenants.filter((tenant) => balanceFor(tenant) === 0).length, rooms: new Set(tenants.map((tenant) => tenant.room)).size }} query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} onTenant={setDrawerId} onPayment={openPayment} />}
        {view === 'rent' && <RentView tenants={tenants} metrics={metrics} onTenant={setDrawerId} onPayment={openPayment} />}
        {view === 'documents' && <DocumentsView tenants={tenants} onTenant={setDrawerId} onToast={showToast} />}
        {view === 'maintenance' && <MaintenanceView orders={orders} onUpdate={updateOrder} onAdd={() => setModal('maintenance')} />}
        </main>
      </div>

      {drawerTenant && <TenantDrawer key={drawerTenant.id} tenant={drawerTenant} propertyName={propertyLabel} history={realHistory[drawerTenant.id]} onClose={() => setDrawerId(null)} onPayment={() => openPayment(drawerTenant.id)} onVacate={demo ? undefined : () => vacateTenant(drawerTenant.id)} onUpdate={demo ? undefined : updateTenant} onVoidReceipt={demo ? undefined : voidReceipt} />}
      {propEditOpen && property && <PropertyEditModal property={property} onClose={() => setPropEditOpen(false)} onSave={savePropertyDetails} />}
      {modal === 'tenant' && <AddTenantModal availableBeds={availableBeds} draftDate={draftDate} draftRent={draftRent} defaultSecurity={property?.defaultSecurity ?? 3000} onDate={setDraftDate} onRent={setDraftRent} onClose={() => setModal(null)} onSubmit={addTenant} />}
      {modal === 'payment' && selectedTenant && <PaymentModal tenant={selectedTenant} onClose={() => setModal(null)} onSubmit={recordPayment} />}
      {modal === 'maintenance' && <MaintenanceModal tenants={tenants} onClose={() => setModal(null)} onSubmit={addMaintenance} />}
      {propertyOnboardingOpen && <PropertyOnboarding preset={propertyPreset} existingNames={properties.map((item) => item.name)} onClose={() => setPropertyOnboardingOpen(false)} onCreated={createProperty} />}
      {assistantOpen && <AssistantModal tenants={tenants} orders={orders} metrics={metrics} availableBeds={availableBeds.length} propertyName={propertyLabel} onClose={() => setAssistantOpen(false)} onView={(next) => { setAssistantOpen(false); goTo(next); }} onPay={(id) => { setAssistantOpen(false); openPayment(id); }} />}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </div>
  );
}

function AssistantModal({ tenants, orders, metrics, availableBeds, propertyName, onClose, onView, onPay }: { tenants: Tenant[]; orders: WorkOrder[]; metrics: Summary; availableBeds: number; propertyName: string; onClose: () => void; onView: (view: View) => void; onPay: (id: number) => void }) {
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerKind, setAnswerKind] = useState<'dues' | 'other'>('other');
  const pending = [...tenants].filter((tenant) => balanceFor(tenant) > 0).sort((a, b) => balanceFor(b) - balanceFor(a));
  function ask(value: string) {
    const question = value.toLowerCase(); setPrompt(value);
    if (question.includes('due') || question.includes('follow')) {
      setAnswerKind('dues');
      setAnswer(pending.length
        ? `${pending.length} residents have a combined ${money.format(metrics.pending)} outstanding. These three carry the largest balances — you can record a receipt right from here.`
        : `Every balance is clear right now. Nothing to chase — enjoy the calm.`);
    } else if (question.includes('vacant') || question.includes('bed')) {
      setAnswerKind('other');
      setAnswer(`${availableBeds} beds are currently ready to allot. Open Property to see their room and bed numbers.`);
    } else if (question.includes('maintenance') || question.includes('repair')) {
      setAnswerKind('other');
      const open = orders.filter((order) => order.status !== 'resolved').length;
      const urgent = orders.filter((order) => order.priority === 'urgent' && order.status !== 'resolved').length;
      setAnswer(open ? `${open} work orders are open. ${urgent ? `${urgent} ${urgent === 1 ? 'is' : 'are'} urgent and should be reviewed today.` : 'Nothing is flagged urgent.'}` : `The maintenance desk is quiet — no open work orders.`);
    } else {
      setAnswerKind('other');
      setAnswer(`${propertyName} is ${metrics.totalBeds ? Math.round(tenants.length / metrics.totalBeds * 100) : 0}% occupied. You have collected ${money.format(metrics.collected)}, with ${money.format(metrics.pending)} still outstanding across ${pending.length} tenants.`);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (prompt.trim()) ask(prompt.trim()); }
  return <div className="modal-layer assistant-layer" onMouseDown={onClose}><section className="assistant-modal" role="dialog" aria-modal="true" aria-label="Ask RentWise" onMouseDown={(event) => event.stopPropagation()}><header><div className="assistant-brand"><span>✦</span><div><strong>Ask RentWise</strong><small>Answers from your live workspace</small></div></div><button aria-label="Close" onClick={onClose}>×</button></header><form onSubmit={submit}><input autoFocus value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask about rent, tenants, rooms or maintenance…" /><button type="submit" aria-label="Ask">→</button></form>{answer ? <div className="assistant-answer"><span>✦</span><div><p>{answer}</p>{answerKind === 'dues' && pending.length > 0 && <div className="answer-rows">{pending.slice(0, 3).map((tenant) => <div key={tenant.id} className="answer-row"><p><strong>{tenant.name}</strong><span>Room {tenant.room} · Bed {tenant.bed}</span></p><b>{money.format(balanceFor(tenant))}</b><button onClick={() => onPay(tenant.id)}>Record</button></div>)}</div>}<div><button onClick={() => onView('rent')}>Open rent</button><button onClick={() => onView('property')}>View property</button></div></div></div> : <div className="suggestion-list"><p>Try asking</p>{['Who has the highest dues?', 'How many beds are vacant?', 'What maintenance needs attention?', 'Give me a portfolio summary'].map((item) => <button key={item} onClick={() => ask(item)}><span>{item}</span><b>↗</b></button>)}</div>}<footer><span>Workspace intelligence</span><em>Uses current RentWise records</em></footer></section></div>;
}

function Overview({ propertyName, demo, tenants, orders, metrics, inventory, availableBeds, onView, onTenant, onPayment }: { propertyName: string; demo: boolean; tenants: Tenant[]; orders: WorkOrder[]; metrics: Summary; inventory: RoomInventory; availableBeds: number; onView: (view: View) => void; onTenant: (id: number) => void; onPayment: (id: number) => void }) {
  const pending = [...tenants].filter((tenant) => balanceFor(tenant) > 0).sort((a, b) => balanceFor(b) - balanceFor(a));
  const collectionPercent = metrics.expected ? Math.round((metrics.collected / metrics.expected) * 100) : 0;
  const collectionTrend = [18, 28, 39, 47, 59, 72, collectionPercent];
  const concentratedDue = pending.slice(0, 2).reduce((sum, tenant) => sum + balanceFor(tenant), 0);
  const urgentCount = orders.filter((order) => order.priority === 'urgent' && order.status !== 'resolved').length;
  const topOrder = orders.find((order) => order.status !== 'resolved');
  return <div className="view-stack">
    <section className="stat-row">
      <article className="stat-card feature"><div className="stat-top"><span className="stat-icon green">₹</span><em>This month</em></div><p>Rent & deposits collected</p><strong>{money.format(metrics.collected)}</strong><div className="meter"><i style={{ width: `${collectionPercent}%` }} /></div><small><b>{collectionPercent}%</b> of {money.format(metrics.expected)} receivable</small></article>
      <article className="stat-card"><div className="stat-top"><span className="stat-icon orange">!</span><em className="attention">Needs attention</em></div><p>Outstanding balance</p><strong>{money.format(metrics.pending)}</strong><button onClick={() => onView('rent')}>{pending.length} tenants to follow up <span>→</span></button></article>
      <article className="stat-card"><div className="stat-top"><span className="stat-icon purple">▦</span><em>{propertyName}</em></div><p>Current occupancy</p><strong>{metrics.occupied}<small> / {metrics.totalBeds} beds</small></strong><button onClick={() => onView('property')}>{availableBeds} beds are ready <span>→</span></button></article>
      <article className="stat-card"><div className="stat-top"><span className="stat-icon blue">◇</span><em>This week</em></div><p>Open maintenance</p><strong>{orders.filter((order) => order.status !== 'resolved').length}</strong><button onClick={() => onView('maintenance')}>{urgentCount ? `${urgentCount} urgent request${urgentCount > 1 ? 's' : ''}` : 'Nothing urgent'} <span>→</span></button></article>
    </section>

    <section className="intelligence-row">
      <article className="ai-brief">
        <div className="ai-orb"><i /><i /><i /></div>
        <div className="brief-copy"><p className="overline">RENTWISE CHECK-IN</p><h2>You’re on top of things. Here are the moments worth your attention.</h2><p><strong>{money.format(concentratedDue)}</strong> is concentrated across the two largest balances{pending.length > 2 ? '' : ''}, <strong>{availableBeds} beds</strong> are ready to allot{topOrder ? `, and one repair needs review` : ''}.</p></div>
        <button onClick={() => onView('rent')}>Walk me through it <span>↗</span></button>
      </article>
      <article className="trend-card">
        <div className="trend-head"><div><span>Collection momentum</span><strong>+18.4%</strong></div><em>Last 7 days</em></div>
        <div className="trend-chart" aria-label="Seven day collection trend">{collectionTrend.map((value, index) => <i key={index} style={{ height: `${Math.max(14, value)}%` }}><b /></i>)}</div>
        <div className="trend-labels"><span>{sixDaysAgoLabel}</span><span>Today</span></div>
      </article>
    </section>

    <section className="overview-columns">
      <div className="overview-column">
        <article className="surface attention-list"><div className="surface-head"><div><p className="overline">TODAY’S PRIORITIES</p><h2>What needs you</h2></div><span>{pending.length + (topOrder ? 1 : 0)} open items</span></div>
          {topOrder && <div className="priority-item urgent"><span className="priority-mark">!</span><div><strong>{topOrder.title} · Room {topOrder.room}</strong><p>Reported by {topOrder.tenant} · {topOrder.category}</p></div><button onClick={() => onView('maintenance')}>Review</button></div>}
          {!topOrder && !pending.length && <div className="empty"><strong>All clear</strong><span>No open priorities — enjoy the calm.</span></div>}
          {pending.slice(0, topOrder ? 4 : 5).map((tenant, index) => <div className="priority-item" key={tenant.id}><span className={index < 2 ? 'priority-mark money' : 'priority-mark doc'}>{index < 2 ? '₹' : '○'}</span><div><strong>{index < 2 ? `${money.format(balanceFor(tenant))} pending from ${tenant.name}` : `${tenant.name} needs document review`}</strong><p>Room {tenant.room} · Bed {tenant.bed} {index < 2 ? '· Part payment received' : '· KYC incomplete'}</p></div><button onClick={() => index < 2 ? onPayment(tenant.id) : onTenant(tenant.id)}>{index < 2 ? 'Record' : 'Open'}</button></div>)}
        </article>
        <article className="surface occupancy"><div className="surface-head"><div><p className="overline">OCCUPANCY</p><h2>Rooms at a glance</h2></div><button className="link-button" onClick={() => onView('property')}>All rooms →</button></div><div className="mini-rooms">{inventory.map(([room, beds]) => { const used = beds.filter((bed) => tenants.some((tenant) => tenant.room === room && tenant.bed === bed)).length; return <div key={room} className={used === beds.length ? 'mini-room full' : 'mini-room'}><div><strong>{room}</strong><span>{used}/{beds.length}</span></div><div>{beds.map((bed) => <i key={bed} className={tenants.some((tenant) => tenant.room === room && tenant.bed === bed) ? 'used' : ''}>{bed}</i>)}</div></div>; })}</div></article>
      </div>

      <div className="overview-column">
        <article className="surface collection-card"><div className="surface-head"><div><p className="overline">{demo ? 'DEMO COLLECTION' : 'THIS MONTH’S COLLECTION'}</p><h2>Collection pulse</h2></div><button className="link-button" onClick={() => onView('rent')}>Open ledger <span>→</span></button></div>
          <div className="collection-hero"><div className="ring" style={{ '--progress': `${collectionPercent}%` } as React.CSSProperties}><div><strong>{collectionPercent}%</strong><span>received</span></div></div><div className="collection-total"><span>Collected so far</span><strong>{money.format(metrics.collected)}</strong><small>of {money.format(metrics.expected)} tracked</small></div></div>
          <div className="collection-progress"><div><span>Month progress</span><strong>{collectionPercent}% received</strong></div><div className="wide-meter" aria-label={`${collectionPercent}% of receivables collected`}><i style={{ width: `${collectionPercent}%` }} /></div></div>
          <div className="collection-breakdown"><div><span>Still to collect</span><strong>{money.format(metrics.pending)}</strong><small>{pending.length} residents need a follow-up</small></div><div><span>This month’s rent</span><strong>{money.format(metrics.recurringCollected)}</strong><small>of {money.format(metrics.recurringExpected)} billed</small></div></div>
          <div className="insight"><span>↗</span><p><strong>Follow-up is focused.</strong> {pending.length || 'No'} residents account for {money.format(metrics.pending)} still to collect this month.</p></div>
        </article>
        <article className="surface activity"><div className="surface-head"><div><p className="overline">RECENT ACTIVITY</p><h2>Latest at {propertyName}</h2></div></div>{demo ? <div className="timeline"><div><i className="pay">₹</i><p><strong>Payment recorded</strong><span>₹1,000 from Meera Kumari</span></p><time>9:08 AM</time></div><div><i className="move">↳</i><p><strong>New allotment</strong><span>Kabita moved into Room 23 · B</span></p><time>Yesterday</time></div><div><i className="fix">◇</i><p><strong>Repair assigned</strong><span>Room 21 fan · Ramesh Electric</span></p><time>Yesterday</time></div></div> : <div className="empty"><strong>Fresh workspace</strong><span>Activity appears as you allot beds and record receipts.</span></div>}</article>
      </div>
    </section>
  </div>;
}

function PropertyEditModal({ property, onClose, onSave }: { property: PropertyInfo; onClose: () => void; onSave: (name: string, address: string) => void }) {
  return <div className="modal-layer" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label="Edit property" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Close" onClick={onClose}>×</button><p className="overline">PROPERTY DETAILS</p><h2>Edit property</h2><p className="modal-copy">The name shows across your workspace, receipts and reminders.</p><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave(String(data.get('name')), String(data.get('address'))); }}><label>Property name<input name="name" required defaultValue={property.name} /></label><label>Address or city<input name="address" defaultValue={property.address} /></label><button className="main-button full" type="submit">Save changes</button></form></section></div>;
}

function PropertyView({ property, tenants, inventory, availableCount, onTenant, onAdd, onEdit, onNewProperty }: { property: PropertyInfo; tenants: Tenant[]; inventory: RoomInventory; availableCount: number; onTenant: (id: number) => void; onAdd: () => void; onEdit: () => void; onNewProperty: () => void }) {
  const totalBeds = inventory.reduce((sum, [, beds]) => sum + beds.length, 0);
  return <div className="view-stack"><section className="property-hero"><div><span className="property-badge">{propertyInitials(property.name)}</span><div><p className="overline">YOUR PROPERTY</p><h2>{property.name}</h2><p>{property.address}{property.city ? `, ${property.city}` : ''} · {property.audience ?? 'Co-living'} {property.type?.toLowerCase() ?? 'property'}</p></div></div><div className="property-facts"><div><span>{inventory.length}</span><small>Rooms</small></div><div><span>{totalBeds}</span><small>Beds</small></div><div><span>{tenants.length}</span><small>Residents</small></div><div><span>{totalBeds ? Math.round(tenants.length / totalBeds * 100) : 0}%</span><small>Occupied</small></div></div><div className="hero-actions"><button className="quiet-button" onClick={onEdit}>Edit</button><button className="quiet-button add-property-button" onClick={onNewProperty}>＋ New property</button><button className="main-button" onClick={onAdd}>＋ Allot bed</button></div></section>
    <section className="property-settings-strip"><div><span>Included amenities</span><p>{property.amenities?.length ? property.amenities.map((item) => <i key={item}>{item}</i>) : <i>Not configured</i>}</p></div><div><span>Collection defaults</span><strong>Due day {property.rentDueDay ?? 5} · {property.graceDays ?? 3}-day grace · {money.format(property.lateFee ?? 0)} late fee</strong></div><div><span>Operating profile</span><strong>{property.mealPlan ?? 'Meals not configured'} · {property.electricityPlan ?? 'Electricity not configured'} · {property.noticeDays ?? 30}-day notice</strong><p className="policy-mini"><i>{property.agreementRequired === false ? 'Agreement optional' : 'Agreement tracked'}</i><i>{property.verificationRequired === false ? 'Verification optional' : 'Verification tracked'}</i></p></div></section>
    <section className="surface"><div className="surface-head room-heading"><div><p className="overline">FLOOR PLAN · {property.floors ?? 1} {property.floors === 1 ? 'FLOOR' : 'FLOORS'}</p><h2>Room inventory</h2></div><div className="room-legend"><span><i className="legend-dot occupied" />Occupied</span><span><i className="legend-dot" />Vacant</span><span className="legend-count">{availableCount} ready to allot</span></div></div><div className="room-cards">{inventory.map(([room, beds]) => { const roomTenants = tenants.filter((tenant) => tenant.room === room); const monthly = roomTenants[0]?.rent ?? property.defaultRent ?? 3000; return <article className="room-detail" key={room}><div className="room-title"><span>ROOM</span><strong>{room}</strong><em>{roomTenants.length === beds.length ? 'Full' : `${beds.length - roomTenants.length} open`}</em></div><div className="bed-list">{beds.map((bed) => { const tenant = roomTenants.find((item) => item.bed === bed); return <button key={bed} className={tenant ? 'occupied' : ''} onClick={() => tenant ? onTenant(tenant.id) : onAdd()}><i>{bed}</i><span>{tenant ? tenant.name.split(' ')[0] : 'Vacant'}</span><b>{tenant ? 'View' : 'Allot'}</b></button>; })}</div><footer><span>{beds.length === 1 ? 'Single room' : `${beds.length} sharing`}</span><strong>{money.format(roomTenants[0]?.rent ?? monthly)} <small>/ bed</small></strong></footer></article>; })}</div></section></div>;
}

function TenantsView({ tenants, totals, query, filter, onQuery, onFilter, onTenant, onPayment }: { tenants: Tenant[]; totals: { active: number; verified: number; clear: number; rooms: number }; query: string; filter: 'all' | 'pending' | 'paid'; onQuery: (value: string) => void; onFilter: (value: 'all' | 'pending' | 'paid') => void; onTenant: (id: number) => void; onPayment: (id: number) => void }) {
  function exportCsv() {
    const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const header = 'Name,Room,Bed,Phone,Monthly rent,Security,First month rent,Received,Balance\n';
    const rows = tenants.map((tenant) => [tenant.name, tenant.room, tenant.bed, profileFor(tenant).phone, tenant.rent, tenant.security, tenant.firstMonthRent, tenant.received, balanceFor(tenant)].map(quote).join(','));
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'rentwise-tenants.csv'; link.click();
    URL.revokeObjectURL(url);
  }
  return <div className="view-stack"><section className="tenant-summary"><div><span>{totals.active}</span><p>Active tenants<small>Across {totals.rooms} occupied rooms</small></p></div><div><span>{totals.verified}</span><p>Documents verified<small>{totals.active - totals.verified} need review</small></p></div><div><span>{totals.clear}</span><p>Balances clear<small>{totals.active - totals.clear} need follow-up</small></p></div></section>
    <section className="surface directory"><div className="directory-tools"><label className="search-box">⌕<input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search name, room or phone" /></label><div className="segmented">{(['all','pending','paid'] as const).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => onFilter(item)}>{item === 'all' ? 'All tenants' : item === 'pending' ? 'Payment due' : 'Paid'}</button>)}</div><button className="quiet-button" onClick={exportCsv}>⇩ Export</button></div>
      <div className="data-table"><table><thead><tr><th>Tenant</th><th>Room & bed</th><th>Contact</th><th>Monthly rent</th><th>Documents</th><th>Balance</th><th>Status</th><th /></tr></thead><tbody>{tenants.map((tenant) => { const profile = profileFor(tenant); const balance = balanceFor(tenant); return <tr key={tenant.id} onClick={() => onTenant(tenant.id)}><td><div className="person"><span>{tenant.name.split(' ').map((part) => part[0]).join('').slice(0,2)}</span><p><strong>{tenant.name}</strong><small>Since {new Date(`${tenant.allotment}T00:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</small></p></div></td><td><strong>Room {tenant.room}</strong><small className="subcell">Bed {tenant.bed}</small></td><td>{profile.phone}<small className="subcell">{profile.hometown}</small></td><td><strong>{money.format(tenant.rent)}</strong><small className="subcell">Due 1st monthly</small></td><td><span className={`document ${profile.kyc}`}>{profile.kyc === 'verified' ? '✓ Verified' : '○ Pending'}</span></td><td className={balance ? 'due-text' : 'clear-text'}><strong>{balance ? money.format(balance) : 'Clear'}</strong></td><td><span className={`pill ${balance ? 'part' : 'settled'}`}>{balance ? 'Part paid' : 'Paid'}</span></td><td><button className="row-menu" onClick={(event) => { event.stopPropagation(); if (balance) onPayment(tenant.id); else onTenant(tenant.id); }}>{balance ? 'Record' : '•••'}</button></td></tr>; })}</tbody></table>{tenants.length === 0 && <div className="empty"><strong>{totals.active === 0 ? 'No tenants yet' : 'No matching tenants'}</strong><span>{totals.active === 0 ? 'Allot your first bed from the Property view.' : 'Try a different name, room or filter.'}</span></div>}</div>
    </section></div>;
}

function RentView({ tenants, metrics, onTenant, onPayment }: { tenants: Tenant[]; metrics: Summary; onTenant: (id: number) => void; onPayment: (id: number) => void }) {
  const pending = tenants.filter((tenant) => balanceFor(tenant) > 0).sort((a,b) => balanceFor(b) - balanceFor(a)); const percent = metrics.expected ? Math.round(metrics.collected / metrics.expected * 100) : 0;
  const rentPercent = metrics.recurringExpected ? Math.round(metrics.recurringCollected / metrics.recurringExpected * 100) : 0;
  return <div className="view-stack"><section className="rent-hero"><div><p className="overline">THIS MONTH</p><h2>{money.format(metrics.collected)}</h2><span>collected of {money.format(metrics.expected)}</span><div className="wide-meter"><i style={{width:`${percent}%`}} /></div></div><div className="rent-split"><article><span>Move-in money</span><strong>{money.format(Math.min(metrics.collected, metrics.expected - metrics.recurringExpected))}</strong><small>{percent}% of everything received</small></article><article><span>This month’s rent</span><strong>{money.format(metrics.recurringCollected)}</strong><small className={metrics.recurringExpected && rentPercent >= 100 ? 'good' : ''}>{metrics.recurringExpected ? `${rentPercent}% of ${shortMoney(metrics.recurringExpected)}` : 'No rent cycles yet'}</small></article><article><span>Outstanding</span><strong className={metrics.pending ? 'warn' : 'good'}>{money.format(metrics.pending)}</strong><small>{pending.length} tenants</small></article></div></section>
    <section className="rent-layout"><article className="surface dues"><div className="surface-head"><div><p className="overline">FOLLOW-UP QUEUE</p><h2>Outstanding dues</h2></div><span>{pending.length} tenants</span></div>{pending.length ? <div className="due-list">{pending.map((tenant) => <div key={tenant.id}><button className="due-person" onClick={() => onTenant(tenant.id)}><span>{tenant.name.slice(0,1)}</span><p><strong>{tenant.name}</strong><small>Room {tenant.room} · Bed {tenant.bed}{tenant.monthly && tenant.monthly.expected > 0 && tenant.monthly.status !== 'paid' ? ` · ${formatPeriod(tenant.monthly.period)} rent ${tenant.monthly.status}` : ''}</small></p></button><div className="due-amount"><strong>{money.format(balanceFor(tenant))}</strong><small>of {money.format(dueFor(tenant))}</small></div><button className="record-button" onClick={() => onPayment(tenant.id)}>Record payment</button></div>)}</div> : <div className="empty"><strong>Everyone’s settled</strong><span>No outstanding balances — the whole ledger is clear.</span></div>}</article>
      <aside className="rent-side"><article className="surface breakdown"><div className="surface-head"><div><p className="overline">RECEIVABLES</p><h2>What makes up the ledger</h2></div></div><div><span>Security deposits</span><strong>{money.format(tenants.reduce((sum,tenant)=>sum+tenant.security,0))}</strong></div><div><span>First-month (prorated)</span><strong>{money.format(tenants.reduce((sum,tenant)=>sum+tenant.firstMonthRent,0))}</strong></div><div><span>This month’s rent</span><strong>{money.format(metrics.recurringExpected)}</strong></div><footer><span>Total tracked</span><strong>{money.format(metrics.expected)}</strong></footer></article><article className="rent-note"><span>₹</span><p><strong>Made for split payments.</strong> Record any number of receipts against one tenant; RentWise applies them oldest-due-first and keeps every balance exact.</p></article></aside>
    </section></div>;
}

function DocumentsView({ tenants, onTenant, onToast }: { tenants: Tenant[]; onTenant: (id: number) => void; onToast: (message: string) => void }) {
  const pending = tenants.filter((tenant) => profileFor(tenant).kyc === 'pending');
  return <div className="view-stack"><section className="document-hero"><div><p className="overline">TENANT COMPLIANCE</p><h2>Everything you need, gently organised.</h2><p>Preview identity-proof follow-ups and agreement tracking without chasing WhatsApp threads.</p></div><button className="main-button" onClick={() => onToast('Document uploads arrive in the owner beta')}>⌑ Preview requests</button></section><section className="document-summary"><article><span>{tenants.length - pending.length}</span><p>Identity proofs verified<small>Ready and on file</small></p></article><article><span>{pending.length}</span><p>Proofs to review<small>Secure requests are in the owner beta</small></p></article><article><span>{tenants.length}</span><p>Rental agreements<small>All tracked in one place</small></p></article></section><section className="surface document-list"><div className="surface-head"><div><p className="overline">FOLLOW-UP QUEUE</p><h2>Identity proof & agreement status</h2></div><button className="quiet-button" onClick={() => onToast('Agreement generation arrives in the owner beta')}>Preview agreement</button></div>{tenants.map((tenant) => { const profile = profileFor(tenant); const needs = profile.kyc === 'pending'; return <article key={tenant.id}><button className="due-person" onClick={() => onTenant(tenant.id)}><span>{tenant.name.slice(0,1)}</span><p><strong>{tenant.name}</strong><small>Room {tenant.room} · Bed {tenant.bed}</small></p></button><div><span className={`document ${profile.kyc}`}>{needs ? 'Identity proof pending' : 'Identity proof verified'}</span><small>Agreement valid until {profile.agreementEnd}</small></div><button className="record-button" onClick={() => onToast(needs ? `Proof request previewed for ${tenant.name}` : `Document preview opened for ${tenant.name}`)}>{needs ? 'Preview request' : 'Preview files'}</button></article>; })}</section></div>;
}

function MaintenanceView({ orders, onUpdate, onAdd }: { orders: WorkOrder[]; onUpdate: (id: number) => void; onAdd: () => void }) {
  return <div className="view-stack"><section className="maintenance-stats"><article><span className="urgent-dot" /><div><strong>{orders.filter((order)=>order.priority==='urgent'&&order.status!=='resolved').length}</strong><p>Urgent<small>Requires action today</small></p></div></article><article><span className="progress-dot" /><div><strong>{orders.filter((order)=>order.status==='in-progress').length}</strong><p>In progress<small>Vendor or staff assigned</small></p></div></article><article><span className="resolved-dot" /><div><strong>{orders.filter((order)=>order.status==='resolved').length}</strong><p>Resolved<small>Closed this month</small></p></div></article></section>
    <section className="surface work-orders"><div className="surface-head"><div><p className="overline">WORK ORDERS</p><h2>Maintenance requests</h2></div><button className="main-button" onClick={onAdd}>＋ New request</button></div>{orders.length ? orders.map((order)=><article key={order.id}><span className={`order-icon ${order.priority}`}>{order.category==='Plumbing'?'≋':order.category==='Electrical'?'ϟ':'⌁'}</span><div className="order-copy"><div><strong>{order.title}</strong><span className={`priority ${order.priority}`}>{order.priority}</span></div><p>Room {order.room} · {order.tenant}</p><small>{order.category} · Opened {order.opened}</small></div><div className="order-status"><span className={order.status}>{order.status.replace('-',' ')}</span>{order.status === 'resolved' ? <em>Completed</em> : <button onClick={()=>onUpdate(order.id)}>{order.status==='new'?'Start work':'Mark resolved'} →</button>}</div></article>) : <div className="empty"><strong>A quiet desk</strong><span>No work orders yet — create one when a repair needs attention.</span></div>}</section></div>;
}

function TenantDrawer({ tenant, propertyName = 'RentWise', history, onClose, onPayment, onVacate, onUpdate, onVoidReceipt }: { tenant: Tenant; propertyName?: string; history?: Receipt[]; onClose: () => void; onPayment: () => void; onVacate?: () => void; onUpdate?: (id: number, patch: { name?: string; phone?: string; rent?: number; security?: number }) => void; onVoidReceipt?: (paymentId: number) => void }) {
  const [editing, setEditing] = useState(false);
  const profile = profileFor(tenant); const balance = balanceFor(tenant);
  const fallbackReceipts: Receipt[] = tenant.received > 0
    ? (paymentHistory[tenant.id] ?? [{ amount: tenant.received, date: 'August', mode: 'UPI', note: 'Payment received' }])
      .map((item, index) => ({ id: -(index + 1), ...item }))
    : [];
  const receipts = history ?? fallbackReceipts;
  const digits = (tenant.phone ?? '').replace(/\D/g, '');
  const whatsapp = digits.length >= 10
    ? `https://wa.me/91${digits.slice(-10)}?text=${encodeURIComponent(`Hi ${tenant.name.split(' ')[0]}, a gentle reminder from ${propertyName}: ${money.format(balance)} is pending for Room ${tenant.room}, Bed ${tenant.bed}. UPI works fine — thank you!`)}`
    : null;
  return <div className="drawer-layer" onMouseDown={onClose}><aside className="drawer" role="dialog" aria-modal="true" aria-label={`Tenant profile: ${tenant.name}`} onMouseDown={(event)=>event.stopPropagation()}><header><button aria-label="Close profile" onClick={onClose}>×</button><div className="drawer-topline"><p className="overline">TENANT PROFILE</p>{onUpdate && <button className="link-button" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancel' : '✎ Edit details'}</button>}</div><div className="drawer-person"><span>{tenant.name.split(' ').map((part)=>part[0]).join('').slice(0,2)}</span><div><h2>{tenant.name}</h2><p>Room {tenant.room} · Bed {tenant.bed}</p></div></div><div className="drawer-actions">{balance > 0 ? <button className="main-button" onClick={onPayment}>₹ Record payment</button> : <button className="main-button" disabled>✓ Balance clear</button>}{whatsapp ? <a className="quiet-button" href={whatsapp} target="_blank" rel="noreferrer">Message</a> : <button className="quiet-button" title="Add a phone number to enable WhatsApp">Message</button>}</div></header><div className="drawer-body">
    {editing && onUpdate ? (
      <form className="edit-grid" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onUpdate(tenant.id, { name: String(data.get('name')), phone: String(data.get('phone')), rent: Number(data.get('rent')), security: Number(data.get('security')) }); setEditing(false); }}>
        <label>Name<input name="name" required defaultValue={tenant.name} /></label>
        <label>Phone<input name="phone" defaultValue={tenant.phone ?? ''} placeholder="+91…" /></label>
        <div className="form-row">
          <label>Monthly rent<input name="rent" type="number" min="0" defaultValue={tenant.rent} required /></label>
          <label>Security deposit<input name="security" type="number" min="0" defaultValue={tenant.security} required /></label>
        </div>
        <div className="drawer-actions"><button className="main-button" type="submit">Save changes</button><button className="quiet-button" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
      </form>
    ) : (
      <section className="profile-grid"><div><span>Phone</span><strong>{tenant.phone ?? profile.phone}</strong></div><div><span>Occupation</span><strong>{profile.profession}</strong></div><div><span>Hometown</span><strong>{profile.hometown}</strong></div><div><span>Allotted</span><strong>{new Date(`${tenant.allotment}T00:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</strong></div></section>
    )}
    <section className="drawer-section"><div className="section-title"><h3>Rent standing</h3><span className={`pill ${balance?'part':'settled'}`}>{balance?'Balance due':'All clear'}</span></div><div className="rent-standing"><div><span>Monthly rent</span><strong>{money.format(tenant.rent)}</strong></div><div><span>Security deposit</span><strong>{money.format(tenant.security)}</strong></div><div className={balance?'highlight':''}><span>Total balance</span><strong>{balance?money.format(balance):'₹0'}</strong></div>{tenant.monthly && tenant.monthly.expected > 0 && (() => { const m = tenant.monthly!; return <div className={m.status === 'paid' ? '' : 'highlight'}><span>Rent · {formatPeriod(m.period)}</span><strong>{m.status === 'paid' ? 'Paid ✓' : m.status === 'partial' ? `${money.format(Math.max(0, m.expected - m.paid))} left` : money.format(m.expected)}</strong></div>; })()}</div></section>
    <section className="drawer-section"><div className="section-title"><h3>Documents</h3></div><div className="docs"><div><i>⌑</i><p><strong>Identity & address proof</strong><span>{profile.kyc==='verified'?'Verified and on file':'Needs verification'}</span></p><b className={profile.kyc}>{profile.kyc==='verified'?'✓':'!'}</b></div><div><i>≡</i><p><strong>Rental agreement</strong><span>Valid until {profile.agreementEnd}</span></p><b className="verified">✓</b></div></div></section>
    <section className="drawer-section"><div className="section-title"><h3>Recent receipts</h3></div>{receipts.length ? <div className="receipts">{receipts.map((item,index)=><div key={`${item.id || index}`}><i>₹</i><p><strong>{money.format(item.amount)}</strong><span>{item.note} · {item.mode}</span></p>{onVoidReceipt && item.id > 0 && <button className="receipt-void" aria-label={`Void receipt of ${money.format(item.amount)}`} title="Void receipt" onClick={() => onVoidReceipt(item.id)}>×</button>}<time>{item.date}</time></div>)}</div> : <p className="no-receipts">No receipts yet — record the first payment to start the ledger.</p>}</section>
    {onVacate && <section className="drawer-section"><div className="section-title"><h3>Tenancy</h3></div><div className="vacate-row"><p>Checked out? Closing the tenancy frees the bed and keeps every receipt on file.</p><button className="quiet-button danger" onClick={onVacate}>Vacate bed</button></div></section>}
  </div></aside></div>;
}

function AddTenantModal({ availableBeds, draftDate, draftRent, defaultSecurity, onDate, onRent, onClose, onSubmit }: { availableBeds: {room:string;bed:string}[]; draftDate:string; draftRent:number; defaultSecurity:number; onDate:(value:string)=>void; onRent:(value:number)=>void; onClose:()=>void; onSubmit:(event:FormEvent<HTMLFormElement>)=>void }) {
  return <div className="modal-layer" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label="New allotment" onMouseDown={(event)=>event.stopPropagation()}><button className="modal-close" aria-label="Close" onClick={onClose}>×</button><p className="overline">NEW ALLOTMENT</p><h2>Move a tenant in</h2><p className="modal-copy">Create their record, assign a bed and calculate the exact first-month amount.</p><form onSubmit={onSubmit}><label>Full name<input name="name" required autoFocus placeholder="Tenant’s name" /></label><label>Phone number<input name="phone" inputMode="tel" autoComplete="tel" placeholder="Optional for now" /></label><div className="form-row"><label>Vacant bed<select name="bed" required>{availableBeds.map(({room,bed})=><option key={`${room}-${bed}`} value={`${room}-${bed}`}>Room {room} · Bed {bed}</option>)}</select></label><label>Allotment date<input name="allotment" type="date" value={draftDate} onChange={(event)=>onDate(event.target.value)} required /></label></div><div className="form-row"><label>Monthly rent<input name="rent" type="number" min="1" inputMode="numeric" value={draftRent} onChange={(event)=>onRent(Number(event.target.value))} required /></label><label>Security deposit<input name="security" type="number" min="0" inputMode="numeric" defaultValue={defaultSecurity} required /></label></div><div className="calculation"><span>First-month rent</span><strong>{money.format(proratedRent(draftRent,draftDate))}</strong><small>Calculated for the remaining days, including the move-in date.</small></div>{availableBeds.length === 0 && <p className="auth-error">No vacant beds right now — add another property or adjust the room plan.</p>}<button className="main-button full" type="submit" disabled={availableBeds.length === 0}>Create allotment</button></form></section></div>;
}

function PaymentModal({ tenant, onClose, onSubmit }: { tenant: Tenant; onClose:()=>void; onSubmit:(event:FormEvent<HTMLFormElement>)=>void }) {
  return <div className="modal-layer" onMouseDown={onClose}><section className="modal payment-modal" role="dialog" aria-modal="true" aria-label="Record receipt" onMouseDown={(event)=>event.stopPropagation()}><button className="modal-close" aria-label="Close" onClick={onClose}>×</button><p className="overline">RECORD RECEIPT</p><h2>{tenant.name}</h2><p className="modal-copy">Room {tenant.room} · Bed {tenant.bed} · <b>{money.format(balanceFor(tenant))}</b> outstanding</p><form onSubmit={onSubmit}><label>Amount received<input name="amount" type="number" min="1" max={balanceFor(tenant)} defaultValue={balanceFor(tenant)} required /></label><div className="form-row"><label>Received on<input name="date" type="date" defaultValue={todayISO()} required /></label><label>Payment mode<select name="mode" defaultValue="UPI"><option>UPI</option><option>Cash</option><option>Bank transfer</option></select></label></div><label>Reference or note<input name="reference" placeholder="Optional UTR or note" /></label><button className="main-button full" type="submit">Save receipt</button></form></section></div>;
}

function MaintenanceModal({ tenants, onClose, onSubmit }: { tenants: Tenant[]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-layer" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label="New maintenance request" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Close" onClick={onClose}>×</button><p className="overline">NEW REQUEST</p><h2>Log a repair</h2><p className="modal-copy">Capture the issue now, then move it from new to resolved as work progresses.</p><form onSubmit={onSubmit}><label>What needs attention?<input name="title" required autoFocus placeholder="e.g. Bathroom tap is leaking" /></label><div className="form-row"><label>Room<input name="room" required placeholder="12" /></label><label>Reported by<select name="tenant" defaultValue=""><option value="">Owner / staff</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.name}>{tenant.name} · Room {tenant.room}</option>)}</select></label></div><div className="form-row"><label>Category<select name="category" defaultValue="Plumbing"><option>Plumbing</option><option>Electrical</option><option>Carpentry</option><option>Housekeeping</option><option>Other</option></select></label><label>Priority<select name="priority" defaultValue="normal"><option value="urgent">Urgent</option><option value="normal">Normal</option><option value="low">Low</option></select></label></div><button className="main-button full" type="submit">Create request</button></form></section></div>;
}
