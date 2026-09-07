'use client';
/* eslint-disable @next/next/no-html-link-for-pages */

/* Owner workspace orchestration: state, auth bootstrap, mutations and view routing.
   Section UI lives in views/, shared types and helpers in shared.tsx. */
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import BrandMark from '../components/BrandMark';
import ErrorBoundary from '../components/ErrorBoundary';
import ThemeToggle from '../components/ThemeToggle';
import MobileNavigation from './components/MobileNavigation';
import { authFetch } from '../lib/supabase-client';
import PropertyOnboarding, { PropertyDraft, PropertyPreset, roomOccupancies } from './onboarding';
import {
  apiRequest, balanceFor, ConfirmDialog, dueFor, heroExamples, isPortfolioProperty, money, timeOfDay,
  NAV_ICONS, NavIcon, PORTFOLIO_STORAGE_KEY, proratedRent, profileFor, propertyInitials,
  seededBookings, seededExpenses, seededInventory, seededMonthlyCollections, seededNotices, seededOrders, seededProperty, seededSubmissions, seededTenants,
  todayISO, viewCopy,
  type ActivityEvent, type Booking, type ExitNotice, type Expense, type MonthlyCollection, type PaymentSubmission, type PropertyInfo, type PortfolioProperty,
  type RealBed, type Receipt, type ResidentInvite, type RoomInventory, type Tenant, type TenantDocument,
  type View, type WorkOrder,
} from './shared';
import { AssistantModal } from './views/AssistantModal';
import { BookingsView } from './views/BookingsView';
import { DocumentsView, PaymentProofQueue } from './views/DocumentsView';
import { FinanceView } from './views/FinanceView';
import { MaintenanceView } from './views/MaintenanceView';
import { Overview } from './views/Overview';
import { PropertyView } from './views/PropertyView';
import { RentView } from './views/RentView';
import { TenantsView } from './views/TenantsView';
import { TenantDrawer } from './views/TenantDrawer';
import { AddTenantModal, BookingModal, DocumentUploadModal, ExpenseModal, ExitNoticeModal, MaintenanceModal, PaymentModal, PropertyEditModal, ResidentInviteModal } from './views/modals';

export default function DashboardPage() {
  return <Workspace />;
}

function Workspace() {
  // Demo mode is a URL contract (/dashboard?demo=1): the seeded workspace is
  // bootstrapped before first paint in the rAF effect below, keeping SSR output stable.
  const [demo, setDemo] = useState(false);
  const [access, setAccess] = useState<'loading' | 'ready' | 'signed-out' | 'error'>('loading');
  const [owner, setOwner] = useState<{ name: string; email: string } | null>(null);
  const [view, setView] = useState<View>('overview');
  const [tenants, setTenants] = useState<Tenant[]>(demo ? seededTenants : []);
  const [orders, setOrders] = useState<WorkOrder[]>(demo ? seededOrders : []);
  const [bookings, setBookings] = useState<Booking[]>(demo ? seededBookings : []);
  const [expenses, setExpenses] = useState<Expense[]>(demo ? seededExpenses : []);
  const [exitNotices, setExitNotices] = useState<ExitNotice[]>(demo ? seededNotices : []);
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [monthlyCollections, setMonthlyCollections] = useState<MonthlyCollection[]>([]);
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [modal, setModal] = useState<'tenant' | 'payment' | 'maintenance' | 'booking' | 'expense' | 'notice' | 'document' | null>(null);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; confirmLabel: string; action: () => void } | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [inviteTenant, setInviteTenant] = useState<ResidentInvite | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [draftRent, setDraftRent] = useState(3000);
  const [draftDate, setDraftDate] = useState(todayISO());
  const [property, setProperty] = useState<PropertyInfo | null>(demo ? seededProperty : null);
  const [properties, setProperties] = useState<PropertyInfo[]>(demo ? [seededProperty] : []);
  const [portfolio, setPortfolio] = useState<PortfolioProperty[]>(demo ? [seededProperty] : []);
  const [activePropertyId, setActivePropertyId] = useState<number | null>(demo ? seededProperty.id : null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [propEditOpen, setPropEditOpen] = useState(false);
  const [propertyOnboardingOpen, setPropertyOnboardingOpen] = useState(false);
  const [propertyPreset, setPropertyPreset] = useState<PropertyPreset>('classic-pg');
  const [realBeds, setRealBeds] = useState<RealBed[]>([]);
  const [demoInventory, setDemoInventory] = useState<RoomInventory>(seededInventory);
  const [realHistory, setRealHistory] = useState<Record<number, Receipt[]>>({});
  const [exampleIndex, setExampleIndex] = useState(0);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const workspaceOverlayOpen = modal !== null || drawerId !== null || inviteTenant !== null || assistantOpen || propEditOpen;

  useEffect(() => {
    if (!workspaceOverlayOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [workspaceOverlayOpen]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || propertyOnboardingOpen) return;
      if (confirmState !== null) setConfirmState(null);
      else if (drawerId !== null) setDrawerId(null);
      else if (inviteTenant !== null) setInviteTenant(null);
      else if (modal !== null) setModal(null);
      else if (assistantOpen) setAssistantOpen(false);
      else if (propEditOpen) setPropEditOpen(false);
      else if (switcherOpen) setSwitcherOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [assistantOpen, confirmState, drawerId, inviteTenant, modal, propEditOpen, propertyOnboardingOpen, switcherOpen]);

  // Keep Tab focus inside whichever overlay is open, mirroring the onboarding dialog.
  useEffect(() => {
    if (!workspaceOverlayOpen && confirmState === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const container = confirmState !== null
        ? document.querySelector<HTMLElement>('.confirm-layer')
        : document.querySelector<HTMLElement>('.drawer-layer, .assistant-layer, .modal-layer');
      if (!container) return;
      const focusable = [...container.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')].filter((item) => item.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmState, workspaceOverlayOpen]);

  useEffect(() => {
    const cycle = window.setInterval(() => setExampleIndex((index) => (index + 1) % heroExamples.length), 4200);
    return () => window.clearInterval(cycle);
  }, []);

  function loadRealData(propertyId?: number | null) {
    const suffix = propertyId ? `?propertyId=${propertyId}` : '';
    authFetch(`/api/properties${suffix}`)
      .then((response) => response.ok ? response.json() as Promise<{
        properties: PropertyInfo[]; property: PropertyInfo | null; beds: RealBed[]; orders: WorkOrder[]; bookings: Booking[]; expenses: Expense[]; exitNotices: ExitNotice[]; documents: TenantDocument[]; activity?: ActivityEvent[]; monthlyCollections?: MonthlyCollection[]; submissions?: PaymentSubmission[];
        tenants: { id: number; room: string; bed: string; name: string; phone: string | null; allotment: string;
          rent: number; security: number; firstMonthRent: number; received: number; email?: string | null; occupation?: string | null; hometown?: string | null; emergencyName?: string | null; emergencyPhone?: string | null;
          chargesTotal?: number; balance?: number; monthly?: Tenant['monthly'];
          payments?: Receipt[];
        }[];
      }> : response.status === 401 ? (setAccess('signed-out'), null) : Promise.reject(new Error('Workspace could not be loaded')))
      .then((data) => {
        if (!data) return;
        setProperties(data.properties);
        if (!data.property) {
          setProperty(null); setActivePropertyId(null); setTenants([]); setOrders([]); setBookings([]); setExpenses([]); setExitNotices([]); setDocuments([]); setRealBeds([]);
          setPropertyOnboardingOpen(true); setAccess('ready'); return;
        }
        setProperties(data.properties);
        setProperty(data.property);
        setActivePropertyId(data.property.id);
        setRealBeds(data.beds);
        const history: Record<number, Receipt[]> = {};
        for (const row of data.tenants) if (row.payments?.length) history[row.id] = row.payments;
        setRealHistory(history);
        // KYC standing follows the owner's document reviews, not an assumption.
        const verifiedTenancies = new Set((data.documents ?? []).filter((doc) => doc.status === 'verified').map((doc) => doc.tenancyId));
        setTenants(data.tenants.map((row) => ({
          id: row.id, room: String(row.room), bed: String(row.bed), name: row.name, phone: row.phone ?? undefined, email: row.email ?? undefined, profession: row.occupation ?? undefined, hometown: row.hometown ?? undefined, emergencyName: row.emergencyName ?? undefined, emergencyPhone: row.emergencyPhone ?? undefined,
          allotment: row.allotment, rent: row.rent, security: row.security, firstMonthRent: row.firstMonthRent,
          received: row.received, chargesTotal: row.chargesTotal, balance: row.balance, monthly: row.monthly ?? null,
          status: (row.balance != null ? row.balance <= 0 : row.received >= row.security + row.firstMonthRent) ? 'paid' as const : 'partial' as const,
          kyc: verifiedTenancies.has(row.id) ? 'verified' as const : 'pending' as const,
        })));
        setOrders(data.orders ?? []); setBookings(data.bookings ?? []); setExpenses(data.expenses ?? []); setExitNotices(data.exitNotices ?? []); setDocuments(data.documents ?? []);
        setActivity(data.activity ?? []);
        setMonthlyCollections(data.monthlyCollections ?? []);
        setSubmissions(data.submissions ?? []);
        setAccess('ready');
      })
      .catch(() => { setAccess('error'); showToast('Could not refresh the workspace'); });
  }

  useEffect(() => {
    // Demo mode runs without an account; skip the auth bootstrap for it.
    if (new URLSearchParams(window.location.search).get('demo') === '1') return;
    authFetch('/api/auth/me', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) { setAccess(response.status === 401 ? 'signed-out' : 'error'); return; }
      const profile = await response.json() as { name?: string; email: string };
      setOwner({ name: profile.name || profile.email.split('@')[0], email: profile.email });
      loadRealData();
    }).catch(() => setAccess('error'));
  // The initial owner bootstrap intentionally runs once; refreshes are triggered after mutations.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1') {
        // Bootstrap the public demo before first paint; never resurrect prior demo state.
        window.localStorage.removeItem(PORTFOLIO_STORAGE_KEY);
        setDemo(true);
        setPortfolio([seededProperty]); setProperties([seededProperty]); setProperty(seededProperty); setActivePropertyId(seededProperty.id);
        setTenants(seededTenants); setOrders(seededOrders); setDemoInventory(seededInventory);
        setBookings(seededBookings); setExpenses(seededExpenses); setExitNotices(seededNotices); setDocuments([]);
        setMonthlyCollections(seededMonthlyCollections); setSubmissions(seededSubmissions);
        setDraftRent(seededProperty.defaultRent ?? 3000);
        setAccess('ready');
        if (params.get('newProperty') === '1') setPropertyOnboardingOpen(true);
        return;
      }
      if (!demo) {
        if (params.get('newProperty') === '1') setPropertyOnboardingOpen(true);
        return;
      }
      try {
        const saved = JSON.parse(window.localStorage.getItem(PORTFOLIO_STORAGE_KEY) ?? 'null') as { portfolio?: unknown[]; activePropertyId?: number } | null;
        const savedPortfolio = saved?.portfolio?.filter(isPortfolioProperty) ?? [];
        if (savedPortfolio.length) {
          const active = savedPortfolio.find((item) => item.id === saved?.activePropertyId) ?? savedPortfolio[0];
          setPortfolio(savedPortfolio); setProperties(savedPortfolio); setProperty(active); setActivePropertyId(active.id);
          setTenants(active.tenants); setOrders(active.orders); setDemoInventory(active.inventory);
          setBookings(active.bookings ?? []); setExpenses(active.expenses ?? []); setExitNotices(active.exitNotices ?? []);
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
  }, [demo]);

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
    if (!realBeds.length) return [];
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

  const propertyLabel = property?.name ?? 'Your property';
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
  function askConfirm(title: string, message: string, confirmLabel: string, action: () => void) {
    setConfirmState({ title, message, confirmLabel, action });
  }
  function persistState(nextTenants = tenants, nextOrders = orders, nextInventory = demoInventory) {
    const nextPortfolio = portfolio.map((item) => item.id === activePropertyId ? { ...item, tenants: nextTenants, orders: nextOrders, inventory: nextInventory, bookings, expenses, exitNotices } : item);
    setPortfolio(nextPortfolio); setProperties(nextPortfolio);
    try { window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify({ portfolio: nextPortfolio, activePropertyId })); }
    catch { showToast('This browser could not save the demo change'); }
  }
  function persistOperations(nextBookings = bookings, nextExpenses = expenses, nextNotices = exitNotices) {
    const nextPortfolio = portfolio.map((item) => item.id === activePropertyId ? { ...item, tenants, orders, inventory: demoInventory, bookings: nextBookings, expenses: nextExpenses, exitNotices: nextNotices } : item);
    setPortfolio(nextPortfolio); setProperties(nextPortfolio);
    try { window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify({ portfolio: nextPortfolio, activePropertyId })); }
    catch { showToast('This browser could not save the demo change'); }
  }

  function openPropertyOnboarding() { setSwitcherOpen(false); setPropertyPreset('classic-pg'); setPropertyOnboardingOpen(true); }
  function downloadPortfolioBackup() {
    const latestPortfolio = portfolio.map((item) => item.id === activePropertyId ? { ...item, tenants, orders, inventory: demoInventory, bookings, expenses, exitNotices } : item);
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
      setBookings(active.bookings ?? []); setExpenses(active.expenses ?? []); setExitNotices(active.exitNotices ?? []);
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
    const plannedRooms = roomOccupancies(draft);
    if (!demo) {
      setPropertyOnboardingOpen(false); showToast('Creating your property…');
      void apiRequest('/api/properties', { method: 'POST', body: JSON.stringify({ ...draft, roomOccupancies: plannedRooms }) })
        .then((result) => { const created = result as { propertyId?: number }; showToast(`${draft.name} is ready`); loadRealData(created.propertyId); })
        .catch((error: Error) => { setPropertyOnboardingOpen(true); showToast(error.message); });
      return;
    }
    const id = Math.max(...portfolio.map((item) => item.id), 0) + 1;
    const nextInventory: RoomInventory = plannedRooms.map((bedCount, roomIndex) => [String(draft.startingRoom + roomIndex), Array.from({ length: bedCount }, (_, bedIndex) => String.fromCharCode(65 + bedIndex))]);
    const currentPortfolio = portfolio.map((item) => item.id === activePropertyId ? { ...item, tenants, orders, inventory: demoInventory, bookings, expenses, exitNotices } : item);
    const created: PortfolioProperty = {
      id, name: draft.name, address: draft.address, city: draft.city, type: draft.type, audience: draft.audience,
      amenities: draft.amenities, defaultRent: draft.rent, defaultSecurity: draft.security, rentDueDay: draft.rentDueDay,
      graceDays: draft.graceDays, lateFee: draft.lateFee, floors: draft.floors, mealPlan: draft.mealPlan,
      electricityPlan: draft.electricityPlan, climatePlan: draft.climatePlan, bathroomPlan: draft.bathroomPlan,
      noticeDays: draft.noticeDays, agreementRequired: draft.agreementRequired, verificationRequired: draft.verificationRequired,
      inventory: nextInventory, tenants: [], orders: [], bookings: [], expenses: [], exitNotices: [],
    };
    const nextPortfolio = [...currentPortfolio, created];
    setPortfolio(nextPortfolio); setProperties(nextPortfolio); setProperty(created); setActivePropertyId(id);
    setTenants([]); setOrders([]); setBookings([]); setExpenses([]); setExitNotices([]); setDemoInventory(nextInventory); setDraftRent(draft.rent);
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
      const email = String(data.get('email') ?? '').trim().toLowerCase();
      if (bedRecord) void apiRequest('/api/tenancies', { method: 'POST', body: JSON.stringify({ bedId: bedRecord.id, name, phone, email, occupation: data.get('occupation'), hometown: data.get('hometown'), emergencyName: data.get('emergencyName'), emergencyPhone: data.get('emergencyPhone'), allotment, rent, security, firstMonthRent: firstMonth }) })
        .then(() => { loadRealData(activePropertyId); if (email) setInviteTenant({ name, phone, email, propertyName: property.name, room, bed }); else showToast('Add a resident email later to enable portal access'); })
        .catch((error: Error) => showToast(error.message));
      else showToast('That bed was just taken — refresh and pick another');
      return;
    }
    const next = [...tenants, { id: Math.max(...tenants.map((tenant) => tenant.id), 0) + 1, room, bed, name, phone, allotment, rent, security, firstMonthRent: firstMonth, received: 0, status: 'partial' as const, kyc: 'pending' as const }];
    setTenants(next); persistState(next, orders);
  }
  function openResidentInvite(tenant: Tenant) {
    if (!tenant.email) { showToast('Add the resident’s email first to enable portal access'); return; }
    setInviteTenant({ name: tenant.name, phone: tenant.phone, email: tenant.email, propertyName: propertyLabel, room: tenant.room, bed: tenant.bed });
  }
  function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get('amount'));
    setModal(null); showToast(`${money.format(amount)} receipt recorded`);
    if (!demo && selectedId != null) {
      const form = new FormData();
      form.set('tenancyId', String(selectedId)); form.set('amount', String(amount)); form.set('paidOn', String(data.get('date') || '')); form.set('mode', String(data.get('mode') || 'UPI')); form.set('reference', String(data.get('reference') || '')); form.set('idempotencyKey', crypto.randomUUID());
      const proof = data.get('proof'); if (proof instanceof File && proof.size) form.set('proof', proof);
      void authFetch('/api/payments', { method: 'POST', body: form }).then(async (response) => { const result = await response.json().catch(() => ({})) as { error?: string }; if (!response.ok) throw new Error(result.error || 'Could not save payment'); return result; })
        .then(() => { showToast(`${money.format(amount)} saved to your ledger`); loadRealData(activePropertyId); })
        .catch((error: Error) => showToast(error.message));
      return;
    }
    const next = tenants.map((tenant) => tenant.id === selectedId ? { ...tenant, received: tenant.received + amount, status: tenant.received + amount >= dueFor(tenant) ? 'paid' as const : 'partial' as const } : tenant);
    setTenants(next); persistState(next, orders);
  }
  function updateOrder(id: number) {
    if (!demo && activePropertyId) {
      void apiRequest('/api/operations', { method: 'PATCH', body: JSON.stringify({ action: 'work_order_status', propertyId: activePropertyId, id }) })
        .then(() => { showToast('Maintenance status updated'); loadRealData(activePropertyId); }).catch((error: Error) => showToast(error.message));
      return;
    }
    const next = orders.map((order) => order.id === id ? { ...order, status: order.status === 'new' ? 'in-progress' as const : 'resolved' as const } : order);
    setOrders(next); persistState(tenants, next); showToast('Maintenance status updated');
  }
  function cancelOrder(id: number) {
    const order = orders.find((item) => item.id === id); if (!order) return;
    askConfirm('Cancel this work order?', `"${order.title}" will be closed without resolution and removed from the open list.`, 'Cancel work order', () => {
      if (!demo && activePropertyId) {
        void apiRequest('/api/operations', { method: 'PATCH', body: JSON.stringify({ action: 'work_order_status', propertyId: activePropertyId, id, status: 'cancelled' }) })
          .then(() => { showToast('Work order cancelled'); loadRealData(activePropertyId); }).catch((error: Error) => showToast(error.message));
        return;
      }
      const next = orders.filter((item) => item.id !== id);
      setOrders(next); persistState(tenants, next); showToast('Work order cancelled');
    });
  }
  function deleteExpense(id: number) {
    const expense = expenses.find((item) => item.id === id); if (!expense) return;
    askConfirm('Delete this expense?', `${money.format(expense.amount)} · ${expense.note || expense.category} will be removed from the ledger.`, 'Delete expense', () => {
      if (!demo && activePropertyId) {
        void apiRequest('/api/operations', { method: 'PATCH', body: JSON.stringify({ action: 'expense_delete', propertyId: activePropertyId, id }) })
          .then(() => { showToast('Expense deleted'); loadRealData(activePropertyId); }).catch((error: Error) => showToast(error.message));
        return;
      }
      const next = expenses.filter((item) => item.id !== id);
      setExpenses(next); persistOperations(bookings, next, exitNotices); showToast('Expense deleted');
    });
  }
  function decideSubmission(id: number, decision: 'confirm' | 'reject') {
    const submission = submissions.find((item) => item.id === id); if (!submission) return;
    if (decision === 'reject') {
      askConfirm('Reject this payment submission?', `${money.format(submission.amount)} from ${submission.tenantName} (${submission.reference || 'no reference'}) will be marked rejected. The resident keeps their proof; nothing enters your ledger.`, 'Reject submission', () => decideSubmissionNow(id, decision, submission));
      return;
    }
    askConfirm('Confirm and issue receipt?', `${money.format(submission.amount)} from ${submission.tenantName} (${submission.mode} · ${submission.reference || 'no reference'}) will be recorded against their ledger with a numbered receipt.`, 'Confirm payment', () => decideSubmissionNow(id, decision, submission));
  }
  function decideSubmissionNow(id: number, decision: 'confirm' | 'reject', submission: PaymentSubmission) {
    if (!demo && activePropertyId) {
      void apiRequest('/api/payments', { method: 'PATCH', body: JSON.stringify({ paymentId: id, decision }) })
        .then(() => { showToast(decision === 'confirm' ? `Receipt issued for ${money.format(submission.amount)}` : 'Payment submission rejected'); loadRealData(activePropertyId); })
        .catch((error: Error) => showToast(error.message));
      return;
    }
    setSubmissions((current) => current.filter((item) => item.id !== id));
    showToast(decision === 'confirm' ? `Receipt issued for ${money.format(submission.amount)}` : 'Payment submission rejected');
  }
  function addMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!demo && activePropertyId) {
      setModal(null);
      void apiRequest('/api/operations', { method: 'POST', body: JSON.stringify({ action: 'work_order', propertyId: activePropertyId, title: data.get('title'), room: data.get('room'), category: data.get('category'), priority: data.get('priority') }) })
        .then(() => { showToast('Maintenance request created'); loadRealData(activePropertyId); }).catch((error: Error) => showToast(error.message));
      return;
    }
    const next: WorkOrder[] = [{
      id: Math.max(...orders.map((order) => order.id), 0) + 1,
      title: String(data.get('title')).trim(), room: String(data.get('room')).trim(),
      tenant: String(data.get('tenant')).trim() || 'Owner reported', category: String(data.get('category')),
      priority: String(data.get('priority')) as WorkOrder['priority'], status: 'new', opened: 'Just now',
    }, ...orders];
    setOrders(next); persistState(tenants, next); setModal(null); showToast('Maintenance request created');
  }
  function addBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!demo && activePropertyId) {
      setModal(null);
      void apiRequest('/api/operations', { method: 'POST', body: JSON.stringify({ action: 'booking', propertyId: activePropertyId, name: data.get('name'), phone: data.get('phone'), moveIn: data.get('moveIn'), sharing: data.get('sharing'), quotedRent: data.get('rent'), token: data.get('token'), source: data.get('source') }) })
        .then(() => { showToast('Booking enquiry added'); loadRealData(activePropertyId); }).catch((error: Error) => showToast(error.message));
      return;
    }
    const next: Booking[] = [{
      id: Math.max(...bookings.map((item) => item.id), 0) + 1,
      name: String(data.get('name')).trim(), phone: String(data.get('phone')).replace(/\D/g, '').slice(-10),
      moveIn: String(data.get('moveIn')), sharing: String(data.get('sharing')), quotedRent: Math.max(0, Number(data.get('rent'))),
      token: Math.max(0, Number(data.get('token'))), source: String(data.get('source')), status: 'enquiry',
    }, ...bookings];
    setBookings(next); persistOperations(next, expenses, exitNotices); setModal(null); showToast('Booking enquiry added');
  }
  function advanceBooking(id: number) {
    if (!demo && activePropertyId) {
      const booking = bookings.find((item) => item.id === id); if (!booking) return;
      const status = booking.status === 'enquiry' ? 'visit' : booking.status === 'visit' ? 'confirmed' : 'checked-in';
      void apiRequest('/api/operations', { method: 'PATCH', body: JSON.stringify({ action: 'booking_status', propertyId: activePropertyId, id, status }) })
        .then(() => { showToast('Booking status updated'); loadRealData(activePropertyId); }).catch((error: Error) => showToast(error.message));
      return;
    }
    const next = bookings.map((item) => item.id === id ? { ...item, status: (item.status === 'enquiry' ? 'visit' : item.status === 'visit' ? 'confirmed' : item.status === 'confirmed' ? 'checked-in' : item.status) as Booking['status'] } : item);
    setBookings(next); persistOperations(next, expenses, exitNotices); showToast('Booking status updated');
  }
  function cancelBooking(id: number) {
    if (!demo && activePropertyId) {
      void apiRequest('/api/operations', { method: 'PATCH', body: JSON.stringify({ action: 'booking_status', propertyId: activePropertyId, id, status: 'cancelled' }) })
        .then(() => { showToast('Booking marked cancelled'); loadRealData(activePropertyId); }).catch((error: Error) => showToast(error.message));
      return;
    }
    const next = bookings.map((item) => item.id === id ? { ...item, status: 'cancelled' as const } : item);
    setBookings(next); persistOperations(next, expenses, exitNotices); showToast('Booking marked cancelled');
  }
  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!demo && activePropertyId) {
      setModal(null);
      void apiRequest('/api/operations', { method: 'POST', body: JSON.stringify({ action: 'expense', propertyId: activePropertyId, category: data.get('category'), amount: data.get('amount'), date: data.get('date'), vendor: data.get('vendor'), note: data.get('note') }) })
        .then(() => { showToast('Expense saved'); loadRealData(activePropertyId); }).catch((error: Error) => showToast(error.message));
      return;
    }
    const next: Expense[] = [{
      id: Math.max(...expenses.map((item) => item.id), 0) + 1,
      category: String(data.get('category')) as Expense['category'], amount: Math.max(0, Number(data.get('amount'))),
      date: String(data.get('date')), vendor: String(data.get('vendor')).trim(), note: String(data.get('note')).trim(),
    }, ...expenses];
    setExpenses(next); persistOperations(bookings, next, exitNotices); setModal(null); showToast('Expense saved');
  }
  function addExitNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget); const tenantId = Number(data.get('tenant'));
    const tenant = tenants.find((item) => item.id === tenantId); if (!tenant) return;
    if (!demo && activePropertyId) {
      setModal(null);
      void apiRequest('/api/operations', { method: 'POST', body: JSON.stringify({ action: 'notice', propertyId: activePropertyId, tenancyId: tenantId, givenOn: data.get('givenOn'), vacateOn: data.get('vacateOn') }) })
        .then(() => { showToast('Exit notice scheduled'); loadRealData(activePropertyId); }).catch((error: Error) => showToast(error.message));
      return;
    }
    const next: ExitNotice[] = [{ id: Math.max(...exitNotices.map((item) => item.id), 0) + 1, tenantId, tenantName: tenant.name, room: tenant.room, givenOn: String(data.get('givenOn')), vacateOn: String(data.get('vacateOn')), depositStatus: 'review', status: 'open' }, ...exitNotices];
    setExitNotices(next); persistOperations(bookings, expenses, next); setModal(null); showToast('Exit notice scheduled');
  }
  function advanceNotice(id: number) {
    if (!demo && activePropertyId) {
      const notice = exitNotices.find((item) => item.id === id); if (!notice) return;
      if (notice.depositStatus === 'review') {
        const next = exitNotices.map((item) => item.id === id ? { ...item, depositStatus: 'ready' as const } : item);
        setExitNotices(next); showToast('Deposit is ready for final settlement'); return;
      }
      askConfirm('Complete checkout?', `This closes ${notice.tenantName}'s tenancy, marks the deposit refunded and releases Bed ${notice.room}. The ledger history stays on file.`, 'Complete checkout', () => {
        void apiRequest('/api/operations', { method: 'PATCH', body: JSON.stringify({ action: 'complete_notice', propertyId: activePropertyId, id: notice.tenantId, depositRefunded: true }) })
          .then(() => { showToast('Checkout completed'); loadRealData(activePropertyId); }).catch((error: Error) => showToast(error.message));
      });
      return;
    }
    const next = exitNotices.map((item) => item.id === id ? item.depositStatus === 'review' ? { ...item, depositStatus: 'ready' as const } : { ...item, depositStatus: 'refunded' as const, status: 'completed' as const } : item);
    setExitNotices(next); persistOperations(bookings, expenses, next); showToast('Exit checklist updated');
  }
  function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set('consent', form.get('consent') ? 'true' : 'false');
    setModal(null); showToast('Uploading document…');
    void authFetch('/api/documents', { method: 'POST', body: form }).then(async (response) => {
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      showToast('Document uploaded for review'); loadRealData(activePropertyId);
    }).catch((error: Error) => showToast(error.message));
  }
  function reviewDocument(id: number, status: 'verified' | 'rejected') {
    void apiRequest('/api/documents', { method: 'PATCH', body: JSON.stringify({ id, status }) })
      .then(() => { showToast(`Document marked ${status}`); loadRealData(activePropertyId); }).catch((error: Error) => showToast(error.message));
  }
  function deleteDocument(id: number) {
    askConfirm('Delete this document?', 'The file is removed from storage immediately. This cannot be undone.', 'Delete document', () => {
      void apiRequest('/api/documents', { method: 'DELETE', body: JSON.stringify({ id }) })
        .then(() => { showToast('Document deleted'); loadRealData(activePropertyId); }).catch((error: Error) => showToast(error.message));
    });
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
    setTenants(target.tenants); setOrders(target.orders); setBookings(target.bookings ?? []); setExpenses(target.expenses ?? []); setExitNotices(target.exitNotices ?? []); setDemoInventory(target.inventory); setDraftRent(target.defaultRent ?? 3000); setView('overview');
    try { window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify({ portfolio: nextPortfolio, activePropertyId: id })); } catch { /* Session state still works */ }
    showToast(`Switched to ${target.name}`);
  }
  function vacateTenant(id: number) {
    const tenant = tenants.find((item) => item.id === id);
    askConfirm('Close this tenancy?', `The bed${tenant ? ` in Room ${tenant.room}` : ''} becomes vacant and ${tenant?.name ?? 'the resident'} loses portal access. Every receipt stays in your ledger.`, 'Close tenancy', () => {
      void apiRequest('/api/tenancies', { method: 'PATCH', body: JSON.stringify({ tenancyId: id, vacate: true }) })
        .then(() => { setDrawerId(null); showToast('Tenancy closed — bed is vacant'); loadRealData(activePropertyId); })
        .catch((error: Error) => showToast(error.message));
    });
  }
  function updateTenant(id: number, patch: { name?: string; phone?: string; email?: string; occupation?: string; hometown?: string; emergencyName?: string; emergencyPhone?: string; rent?: number; security?: number }) {
    void apiRequest('/api/tenancies', { method: 'PATCH', body: JSON.stringify({ tenancyId: id, ...patch }) })
      .then(() => { showToast('Tenant details updated'); loadRealData(activePropertyId); })
      .catch((error: Error) => showToast(error.message));
  }
  function voidReceipt(paymentId: number) {
    askConfirm('Void this receipt?', 'The amount returns to the resident’s outstanding balance. The original record is retained for your audit trail.', 'Void receipt', () => {
      void apiRequest('/api/payments', { method: 'DELETE', body: JSON.stringify({ paymentId }) })
        .then(() => { showToast('Receipt voided'); loadRealData(activePropertyId); })
        .catch((error: Error) => showToast(error.message));
    });
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
    void apiRequest('/api/properties', { method: 'PATCH', body: JSON.stringify({ propertyId: activePropertyId, name, address }) })
      .then(() => { setPropEditOpen(false); showToast('Property updated'); loadRealData(activePropertyId); })
      .catch((error: Error) => showToast(error.message));
  }

  if (access === 'loading') return <div className="prod-auth-gate"><BrandMark /><span className="gate-spinner" /><h1>Opening your workspace</h1><p>Connecting your properties, residents and ledger…</p></div>;
  if (access === 'signed-out') return <div className="prod-auth-gate"><BrandMark /><p className="overline">OWNER ACCESS</p><h1>Sign in to RentWise</h1><p>Your property and resident data is available only in your owner account.</p><a className="main-button" href="/login">Continue to sign in →</a><a className="quiet-button" href="/tenant">I’m a resident</a><a className="quiet-button" href="/#top">Back to RentWise</a></div>;
  if (access === 'error') return <div className="prod-auth-gate"><BrandMark /><p className="overline">CONNECTION ISSUE</p><h1>We couldn’t open the workspace</h1><p>No changes were made. Check your connection and try again.</p><button className="main-button" onClick={() => window.location.reload()}>Try again</button></div>;

  return (
    <div className="shell">
      {demo && <input ref={backupInputRef} className="file-input-hidden" type="file" accept="application/json,.json" aria-label="Restore portfolio backup" onChange={(event) => void restorePortfolioBackup(event)} />}
      <aside className="side">
        <button className="logo" onClick={() => goTo('overview')}><BrandMark /><strong>RentWise</strong></button>
        <div className="prop-switch">
          <button className="property-select" aria-expanded={switcherOpen} onClick={() => properties.length > 0 ? setSwitcherOpen((open) => !open) : openPropertyOnboarding()}><span className="property-thumb">{propertyInitials(property?.name ?? 'PG')}</span><span><small>{properties.length > 1 ? `${properties.length} PROPERTIES` : 'YOUR PROPERTY'}</small><strong>{property?.name ?? 'Set up your property'}</strong><em>{property ? `${property.address}${property.city ? `, ${property.city}` : ''}` : 'Add rooms, beds and rent defaults'}</em></span><b>⌄</b></button>
          {switcherOpen && <>
            <button className="prop-backdrop" aria-label="Close property menu" onClick={() => setSwitcherOpen(false)} />
            <div className="prop-menu" role="menu">
              {properties.map((item) => <button key={item.id} role="menuitem" className={item.id === activePropertyId ? 'prop-item active' : 'prop-item'} onClick={() => switchProperty(item.id)}><span>{propertyInitials(item.name)}</span><p><strong>{item.name}</strong><small>{item.address || 'No address yet'}</small></p>{item.id === activePropertyId && <b>✓</b>}</button>)}
              <div className="prop-divider" />
              <button role="menuitem" className="prop-item add" onClick={openPropertyOnboarding}><span>＋</span><p><strong>Add another property</strong><small>Build rooms, beds and rent defaults</small></p></button>
              {!demo && <a role="menuitem" className="prop-item backup" href="/api/account/export"><span>⇩</span><p><strong>Download account export</strong><small>Properties, ledgers and audit history</small></p></a>}
              {demo && <button role="menuitem" className="prop-item backup" onClick={downloadPortfolioBackup}><span>⇩</span><p><strong>Download portfolio backup</strong><small>Keep a portable copy of this browser’s data</small></p></button>}
              {demo && <button role="menuitem" className="prop-item backup" onClick={() => { setSwitcherOpen(false); backupInputRef.current?.click(); }}><span>↥</span><p><strong>Restore portfolio backup</strong><small>Open a RentWise JSON backup on this device</small></p></button>}
            </div>
          </>}
        </div>
        <nav aria-label="Owner workspace">
          <p>WORKSPACE</p>
          {([
            ['overview', 'Today'], ['property', 'Property'], ['tenants', 'Tenants'], ['rent', 'Rent & payments'], ['bookings', 'Bookings & exits'], ['finance', 'Expenses'], ['documents', 'Documents'], ['maintenance', 'Maintenance'],
          ] as [View, string][]).map(([id, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => goTo(id)}><NavIcon paths={NAV_ICONS[id]} /><span>{label}</span>{id === 'rent' && <b>{tenants.filter((tenant) => balanceFor(tenant) > 0).length}</b>}{id === 'maintenance' && orders.length > 0 && <b>{orders.filter((order) => order.status !== 'resolved').length}</b>}</button>)}
        </nav>
        <div className="side-bottom"><ThemeToggle /><div className="owner-chip"><span>{propertyInitials(owner?.name ?? 'Owner')}</span><div><strong>{owner?.name ?? 'Property owner'}</strong><small>{properties.length} {properties.length === 1 ? 'property' : 'properties'}</small></div><b>•••</b></div><p className="no-login">Owner account · Changes saved automatically</p></div>
      </aside>

      <div className="workspace">
        <div className="mobile-topbar"><button className="mobile-brand" onClick={() => goTo('overview')}><BrandMark /><strong>RentWise</strong></button><button className="mobile-lookup" onClick={() => { setFilter('all'); goTo('tenants'); }}><span>⌕</span><em>Search tenant or room</em></button><ThemeToggle compact /><button className="mobile-create" aria-label="Create new allotment" onClick={() => setModal('tenant')}>＋</button></div>
        <div className="mobile-property-switch">
          <button className="property-select" aria-expanded={switcherOpen} onClick={() => setSwitcherOpen((open) => !open)}><span className="property-thumb">{propertyInitials(property?.name ?? 'PG')}</span><span><small>ACTIVE PROPERTY</small><strong>{property?.name ?? 'Set up your property'}</strong><em>{properties.length} {properties.length === 1 ? 'property' : 'properties'} in portfolio</em></span><b>⌄</b></button>
          {switcherOpen && <><button className="prop-backdrop" aria-label="Close property menu" onClick={() => setSwitcherOpen(false)} /><div className="prop-menu" role="menu">{properties.map((item) => <button key={item.id} role="menuitem" className={item.id === activePropertyId ? 'prop-item active' : 'prop-item'} onClick={() => switchProperty(item.id)}><span>{propertyInitials(item.name)}</span><p><strong>{item.name}</strong><small>{item.address || 'No address yet'}</small></p>{item.id === activePropertyId && <b>✓</b>}</button>)}<div className="prop-divider" /><button role="menuitem" className="prop-item add" onClick={openPropertyOnboarding}><span>＋</span><p><strong>Add another property</strong><small>Build rooms, beds and rent defaults</small></p></button>{!demo && <a role="menuitem" className="prop-item backup" href="/api/account/export"><span>⇩</span><p><strong>Download account export</strong><small>Properties, ledgers and audit history</small></p></a>}{demo && <button role="menuitem" className="prop-item backup" onClick={downloadPortfolioBackup}><span>⇩</span><p><strong>Download portfolio backup</strong><small>Keep a portable copy of this browser’s data</small></p></button>}{demo && <button role="menuitem" className="prop-item backup" onClick={() => { setSwitcherOpen(false); backupInputRef.current?.click(); }}><span>↥</span><p><strong>Restore portfolio backup</strong><small>Open a RentWise JSON backup on this device</small></p></button>}</div></>}
        </div>
        <MobileNavigation view={view} onView={goTo} />
        <main className="view-stage">
        <ErrorBoundary resetKey={view}>
        <header className="page-head">
          <div><p className="overline">{copy.eyebrow}</p><h1>{view === 'overview' ? <><em>Good {timeOfDay()}</em>{demo ? ', Govind.' : '.'}</> : copy.title}</h1><p>{copy.subtitle}</p></div>
          {view === 'overview' && <div className="head-actions"><span className="live-state"><i /> Live</span><button className="quiet-button" onClick={() => { setView('tenants'); setFilter('pending'); }}>⌕ Find tenant</button><button className="main-button" onClick={() => setModal('tenant')}>＋ New allotment</button></div>}
        </header>

        {view === 'overview' && (
          <form className="prompt-bar" onSubmit={(event) => { event.preventDefault(); setAssistantOpen(true); }}>
            <span className="prompt-orb" aria-hidden="true">✦</span>
            <input readOnly aria-label="Ask RentWise anything" placeholder={heroExamples[exampleIndex]} onFocus={(event) => { event.currentTarget.blur(); setAssistantOpen(true); }} />
            <button type="submit">Ask<i>↗</i></button>
          </form>
        )}

        {view === 'overview' && <Overview propertyName={propertyLabel} demo={demo} tenants={tenants} orders={orders} metrics={metrics} inventory={inventory} availableBeds={availableBeds.length} activity={activity} onView={goTo} onTenant={setDrawerId} onPayment={openPayment} />}
        {view === 'property' && property && <PropertyView property={property} tenants={tenants} inventory={inventory} availableCount={availableBeds.length} onTenant={setDrawerId} onAdd={() => setModal('tenant')} onEdit={() => setPropEditOpen(true)} onNewProperty={openPropertyOnboarding} />}
        {view === 'property' && !property && <div className="empty"><strong>No property yet</strong><span>Set up your rooms, beds and rent defaults to open the floor plan.</span><button className="main-button" onClick={openPropertyOnboarding}>＋ Set up your property</button></div>}
        {view === 'tenants' && <TenantsView tenants={filteredTenants} totals={{ active: tenants.length, verified: tenants.filter((tenant) => profileFor(tenant).kyc === 'verified').length, clear: tenants.filter((tenant) => balanceFor(tenant) === 0).length, rooms: new Set(tenants.map((tenant) => tenant.room)).size }} query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} onTenant={setDrawerId} onPayment={openPayment} rentDueDay={property?.rentDueDay ?? 5} />}
        {view === 'rent' && <RentView tenants={tenants} metrics={metrics} propertyName={propertyLabel} history={realHistory} submissions={submissions} onDecision={decideSubmission} onTenant={setDrawerId} onPayment={openPayment} />}
        {view === 'bookings' && <BookingsView bookings={bookings} notices={exitNotices} onAddBooking={() => setModal('booking')} onAddNotice={() => setModal('notice')} onAdvanceBooking={advanceBooking} onCancelBooking={cancelBooking} onAdvanceNotice={advanceNotice} />}
        {view === 'finance' && <FinanceView expenses={expenses} monthlyCollections={monthlyCollections} onAdd={() => setModal('expense')} onDelete={deleteExpense} />}
        {view === 'documents' && <><PaymentProofQueue tenants={tenants} documents={documents} onPayment={openPayment} onReview={reviewDocument} /><DocumentsView tenants={tenants} documents={documents} onUpload={() => setModal('document')} onReview={reviewDocument} onDelete={deleteDocument} /></>}
        {view === 'maintenance' && <MaintenanceView orders={orders} onUpdate={updateOrder} onCancel={cancelOrder} onAdd={() => setModal('maintenance')} />}
        </ErrorBoundary>
        </main>
      </div>

      {drawerTenant && <TenantDrawer key={drawerTenant.id} tenant={drawerTenant} propertyName={propertyLabel} history={realHistory[drawerTenant.id]} onClose={() => setDrawerId(null)} onPayment={() => openPayment(drawerTenant.id)} onInvite={() => openResidentInvite(drawerTenant)} onVacate={demo ? undefined : () => vacateTenant(drawerTenant.id)} onUpdate={demo ? undefined : updateTenant} onVoidReceipt={demo ? undefined : voidReceipt} />}
      {propEditOpen && property && <PropertyEditModal property={property} onClose={() => setPropEditOpen(false)} onSave={savePropertyDetails} />}
      {modal === 'tenant' && <AddTenantModal availableBeds={availableBeds} draftDate={draftDate} draftRent={draftRent} defaultSecurity={property?.defaultSecurity ?? 3000} onDate={setDraftDate} onRent={setDraftRent} onClose={() => setModal(null)} onSubmit={addTenant} />}
      {inviteTenant && <ResidentInviteModal invite={inviteTenant} onClose={() => setInviteTenant(null)} onCopied={() => showToast('Invite message copied')} />}
      {modal === 'payment' && selectedTenant && <PaymentModal tenant={selectedTenant} onClose={() => setModal(null)} onSubmit={recordPayment} />}
      {modal === 'maintenance' && <MaintenanceModal tenants={tenants} onClose={() => setModal(null)} onSubmit={addMaintenance} />}
      {modal === 'booking' && <BookingModal defaultRent={property?.defaultRent ?? 3000} onClose={() => setModal(null)} onSubmit={addBooking} />}
      {modal === 'expense' && <ExpenseModal onClose={() => setModal(null)} onSubmit={addExpense} />}
      {modal === 'notice' && <ExitNoticeModal tenants={tenants.filter((tenant) => !exitNotices.some((notice) => notice.tenantId === tenant.id && notice.status === 'open'))} noticeDays={property?.noticeDays ?? 30} onClose={() => setModal(null)} onSubmit={addExitNotice} />}
      {modal === 'document' && <DocumentUploadModal tenants={tenants} onClose={() => setModal(null)} onSubmit={uploadDocument} />}
      {propertyOnboardingOpen && <PropertyOnboarding preset={propertyPreset} existingNames={properties.map((item) => item.name)} onClose={() => setPropertyOnboardingOpen(false)} onCreated={createProperty} />}
      {assistantOpen && <AssistantModal tenants={tenants} orders={orders} metrics={metrics} availableBeds={availableBeds.length} propertyName={propertyLabel} onClose={() => setAssistantOpen(false)} onView={(next) => { setAssistantOpen(false); goTo(next); }} onPay={(id) => { setAssistantOpen(false); openPayment(id); }} />}
      {confirmState && <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </div>
  );
}
