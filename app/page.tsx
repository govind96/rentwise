'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type View = 'overview' | 'property' | 'tenants' | 'rent' | 'maintenance';
type Tenant = {
  id: number; room: string; bed: string; name: string; allotment: string;
  rent: number; security: number; firstMonthRent: number; received: number;
  status: 'paid' | 'partial'; phone?: string; profession?: string; hometown?: string;
  kyc?: 'verified' | 'pending'; agreementEnd?: string; recurringReceived?: number;
};
type WorkOrder = {
  id: number; title: string; room: string; tenant: string; category: string;
  priority: 'urgent' | 'normal' | 'low'; status: 'new' | 'in-progress' | 'resolved'; opened: string;
};

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const shortMoney = (value: number) => value >= 100000 ? `₹${(value / 100000).toFixed(1)}L` : `₹${Math.round(value / 1000)}k`;

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

const inventory = [
  ['1', ['A', 'B']], ['2', ['A', 'B']], ['3', ['A', 'B']], ['11', ['A', 'B']], ['12', ['A', 'B']], ['13', ['A', 'B']],
  ['14', ['A', 'B', 'C']], ['15', ['A', 'B']], ['21', ['A', 'B']], ['22', ['A', 'B']], ['23', ['A', 'B']], ['24', ['A', 'B', 'C']], ['25', ['A', 'B']],
] as const;

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

function dueFor(tenant: Tenant) { return tenant.security + tenant.firstMonthRent; }
function balanceFor(tenant: Tenant) { return Math.max(0, dueFor(tenant) - tenant.received); }
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

const viewCopy: Record<View, { eyebrow: string; title: string; subtitle: string }> = {
  overview: { eyebrow: 'SATURDAY, 22 AUGUST', title: 'Your property, in focus', subtitle: 'A clear daily view of occupancy, collections and owner actions at Saffron Stay.' },
  property: { eyebrow: 'PROPERTY', title: 'Rooms & occupancy', subtitle: 'See every room, bed and tenant without opening a spreadsheet.' },
  tenants: { eyebrow: 'PEOPLE', title: 'Tenant directory', subtitle: 'Complete resident records, payment standing and documents in one place.' },
  rent: { eyebrow: 'MONEY', title: 'Rent & collections', subtitle: 'Know what came in, what is pending and who needs a reminder.' },
  maintenance: { eyebrow: 'OPERATIONS', title: 'Maintenance desk', subtitle: 'Track issues from first report to completed repair.' },
};

export default function Home() {
  const [view, setView] = useState<View>('overview');
  const [tenants, setTenants] = useState(seededTenants);
  const [orders, setOrders] = useState(seededOrders);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [modal, setModal] = useState<'tenant' | 'payment' | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [draftRent, setDraftRent] = useState(3000);
  const [draftDate, setDraftDate] = useState('2026-08-22');

  useEffect(() => {
    let active = true;
    fetch('/api/state').then(async (response): Promise<{ tenants?: Tenant[]; maintenance?: WorkOrder[] } | null> => response.ok ? await response.json() as { tenants?: Tenant[]; maintenance?: WorkOrder[] } : null)
      .then((data) => { if (!active) return; if (data?.tenants?.length) setTenants(data.tenants); if (data?.maintenance?.length) setOrders(data.maintenance); })
      .catch(() => undefined);
    return () => { active = false; };
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

  const metrics = useMemo(() => {
    const expected = tenants.reduce((sum, tenant) => sum + dueFor(tenant), 0);
    const collected = tenants.reduce((sum, tenant) => sum + tenant.received, 0);
    const totalBeds = inventory.reduce((sum, [, beds]) => sum + beds.length, 0);
    const recurringExpected = tenants.filter((tenant) => tenant.allotment < '2026-08-01').reduce((sum, tenant) => sum + tenant.rent, 0);
    const recurringCollected = tenants.reduce((sum, tenant) => sum + (tenant.recurringReceived ?? ([5, 6].includes(tenant.id) ? 3500 : 0)), 0);
    return { expected, collected, pending: Math.max(0, expected - collected), totalBeds, occupied: tenants.length, recurringExpected, recurringCollected };
  }, [tenants]);

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
  async function persistState(nextTenants = tenants, nextOrders = orders) {
    try { await fetch('/api/state', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenants: nextTenants, maintenance: nextOrders }) }); }
    catch { showToast('Saved here; cloud sync will retry'); }
  }
  function addTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget); const [room, bed] = String(data.get('bed')).split('-');
    const rent = Number(data.get('rent')); const security = Number(data.get('security')); const allotment = String(data.get('allotment'));
    const next = [...tenants, { id: Math.max(...tenants.map((tenant) => tenant.id), 0) + 1, room, bed, name: String(data.get('name')), phone: String(data.get('phone')), allotment, rent, security, firstMonthRent: proratedRent(rent, allotment), received: 0, status: 'partial' as const, kyc: 'pending' as const }];
    setTenants(next); void persistState(next, orders); setModal(null); showToast('Tenant added and dues created');
  }
  function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const amount = Number(new FormData(event.currentTarget).get('amount'));
    const next = tenants.map((tenant) => tenant.id === selectedId ? { ...tenant, received: tenant.received + amount, status: tenant.received + amount >= dueFor(tenant) ? 'paid' as const : 'partial' as const } : tenant);
    setTenants(next); void persistState(next, orders); setModal(null); showToast(`${money.format(amount)} receipt recorded`);
  }
  function updateOrder(id: number) {
    const next = orders.map((order) => order.id === id ? { ...order, status: order.status === 'new' ? 'in-progress' as const : 'resolved' as const } : order);
    setOrders(next); void persistState(tenants, next); showToast('Maintenance status updated');
  }
  function openPayment(id: number) { setSelectedId(id); setModal('payment'); }
  function goTo(next: View) { setView(next); setDrawerId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  return (
    <div className="shell">
      <aside className="side">
        <button className="logo" onClick={() => goTo('overview')}><span>R</span><strong>RentWise</strong><em>OS</em></button>
        <button className="property-select" onClick={() => goTo('property')}><span className="property-thumb">SS</span><span><small>DEMO PROPERTY</small><strong>Saffron Stay PG</strong><em>Kalyan Nagar, Bengaluru</em></span><b>⌄</b></button>
        <nav aria-label="Owner workspace">
          <p>WORKSPACE</p>
          {([
            ['overview', '⌂', 'Today'], ['property', '▦', 'Property'], ['tenants', '♙', 'Tenants'], ['rent', '₹', 'Rent & payments'], ['maintenance', '◇', 'Maintenance'],
          ] as [View, string, string][]).map(([id, icon, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => goTo(id)}><i>{icon}</i><span>{label}</span>{id === 'rent' && <b>{tenants.filter((tenant) => balanceFor(tenant) > 0).length}</b>}{id === 'maintenance' && <b>{orders.filter((order) => order.status !== 'resolved').length}</b>}</button>)}
        </nav>
        <div className="side-bottom"><div className="owner-chip"><span>SK</span><div><strong>Sample owner</strong><small>Demo workspace</small></div><b>•••</b></div><p className="no-login">Public demo · No login required</p></div>
      </aside>

      <div className="workspace">
        <div className="mobile-topbar"><button className="mobile-brand" onClick={() => goTo('overview')}><span>R</span><strong>RentWise</strong></button><button className="mobile-lookup" onClick={() => { setFilter('all'); goTo('tenants'); }}><span>⌕</span><em>Search tenant or room</em></button><button className="mobile-create" aria-label="Create new allotment" onClick={() => setModal('tenant')}>＋</button></div>
        <div className="mobile-nav">{(['overview', 'property', 'tenants', 'rent', 'maintenance'] as View[]).map((item) => <button key={item} className={view === item ? 'active' : ''} onClick={() => goTo(item)}>{item === 'overview' ? 'Today' : item}</button>)}</div>
        <header className="page-head">
          <div><p className="overline">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
          <div className="head-actions"><span className="live-state"><i /> Live</span><button className="quiet-button" onClick={() => { setView('tenants'); setFilter('pending'); }}>⌕ Find tenant</button><button className="main-button" onClick={() => setModal('tenant')}>＋ New allotment</button></div>
        </header>

        {view === 'overview' && <button className="command-trigger" onClick={() => setAssistantOpen(true)}><span>✦</span><div><strong>Ask RentWise</strong><em>“Who should I follow up with today?”</em></div><kbd>Ctrl K</kbd></button>}

        {view === 'overview' && <Overview tenants={tenants} orders={orders} metrics={metrics} availableBeds={availableBeds.length} onView={goTo} onTenant={setDrawerId} onPayment={openPayment} />}
        {view === 'property' && <PropertyView tenants={tenants} onTenant={setDrawerId} onAdd={() => setModal('tenant')} />}
        {view === 'tenants' && <TenantsView tenants={filteredTenants} query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} onTenant={setDrawerId} onPayment={openPayment} />}
        {view === 'rent' && <RentView tenants={tenants} metrics={metrics} onTenant={setDrawerId} onPayment={openPayment} />}
        {view === 'maintenance' && <MaintenanceView orders={orders} onUpdate={updateOrder} />}
      </div>

      {drawerTenant && <TenantDrawer tenant={drawerTenant} onClose={() => setDrawerId(null)} onPayment={() => openPayment(drawerTenant.id)} />}
      {modal === 'tenant' && <AddTenantModal availableBeds={availableBeds} draftDate={draftDate} draftRent={draftRent} onDate={setDraftDate} onRent={setDraftRent} onClose={() => setModal(null)} onSubmit={addTenant} />}
      {modal === 'payment' && selectedTenant && <PaymentModal tenant={selectedTenant} onClose={() => setModal(null)} onSubmit={recordPayment} />}
      {assistantOpen && <AssistantModal tenants={tenants} orders={orders} metrics={metrics} availableBeds={availableBeds.length} onClose={() => setAssistantOpen(false)} onView={(next) => { setAssistantOpen(false); goTo(next); }} />}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </div>
  );
}

function AssistantModal({ tenants, orders, metrics, availableBeds, onClose, onView }: { tenants: Tenant[]; orders: WorkOrder[]; metrics: ReturnType<typeof summaryShape>; availableBeds: number; onClose: () => void; onView: (view: View) => void }) {
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const pending = [...tenants].filter((tenant) => balanceFor(tenant) > 0).sort((a, b) => balanceFor(b) - balanceFor(a));
  function ask(value: string) {
    const question = value.toLowerCase(); setPrompt(value);
    if (question.includes('due') || question.includes('follow')) setAnswer(`${pending.slice(0, 3).map((tenant) => `${tenant.name} (${money.format(balanceFor(tenant))})`).join(', ')} are your highest-priority payment follow-ups. Together they represent ${money.format(pending.slice(0, 3).reduce((sum, tenant) => sum + balanceFor(tenant), 0))}.`);
    else if (question.includes('vacant') || question.includes('bed')) setAnswer(`${availableBeds} beds are currently ready to allot. Open Property to see their room and bed numbers.`);
    else if (question.includes('maintenance') || question.includes('repair')) setAnswer(`${orders.filter((order) => order.status !== 'resolved').length} work orders are open. ${orders.filter((order) => order.priority === 'urgent' && order.status !== 'resolved').length} is urgent and should be reviewed today.`);
    else setAnswer(`Saffron Stay is ${Math.round(tenants.length / metrics.totalBeds * 100)}% occupied. You have collected ${money.format(metrics.collected)}, with ${money.format(metrics.pending)} still outstanding across ${pending.length} tenants.`);
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (prompt.trim()) ask(prompt.trim()); }
  return <div className="modal-layer assistant-layer" onMouseDown={onClose}><section className="assistant-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div className="assistant-brand"><span>✦</span><div><strong>Ask RentWise</strong><small>Answers from your live workspace</small></div></div><button onClick={onClose}>×</button></header><form onSubmit={submit}><input autoFocus value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask about rent, tenants, rooms or maintenance…" /><button type="submit">Ask →</button></form>{answer ? <div className="assistant-answer"><span>✦</span><div><p>{answer}</p><div><button onClick={() => onView('rent')}>Open rent</button><button onClick={() => onView('property')}>View property</button></div></div></div> : <div className="suggestion-list"><p>Try asking</p>{['Who has the highest dues?', 'How many beds are vacant?', 'What maintenance needs attention?', 'Give me a portfolio summary'].map((item) => <button key={item} onClick={() => ask(item)}><span>{item}</span><b>↗</b></button>)}</div>}<footer><span>Workspace intelligence</span><em>Uses current RentWise records</em></footer></section></div>;
}

function Overview({ tenants, orders, metrics, availableBeds, onView, onTenant, onPayment }: { tenants: Tenant[]; orders: WorkOrder[]; metrics: ReturnType<typeof summaryShape>; availableBeds: number; onView: (view: View) => void; onTenant: (id: number) => void; onPayment: (id: number) => void }) {
  const pending = [...tenants].filter((tenant) => balanceFor(tenant) > 0).sort((a, b) => balanceFor(b) - balanceFor(a));
  const collectionPercent = Math.round((metrics.collected / metrics.expected) * 100);
  const collectionTrend = [18, 28, 39, 47, 59, 72, collectionPercent];
  const concentratedDue = pending.slice(0, 2).reduce((sum, tenant) => sum + balanceFor(tenant), 0);
  return <div className="view-stack">
    <section className="stat-row">
      <article className="stat-card feature"><div className="stat-top"><span className="stat-icon green">₹</span><em>August</em></div><p>Rent & deposits collected</p><strong>{money.format(metrics.collected)}</strong><div className="meter"><i style={{ width: `${collectionPercent}%` }} /></div><small><b>{collectionPercent}%</b> of {money.format(metrics.expected)} receivable</small></article>
      <article className="stat-card"><div className="stat-top"><span className="stat-icon orange">!</span><em className="attention">Needs attention</em></div><p>Outstanding balance</p><strong>{money.format(metrics.pending)}</strong><button onClick={() => onView('rent')}>{pending.length} tenants to follow up <span>→</span></button></article>
      <article className="stat-card"><div className="stat-top"><span className="stat-icon purple">▦</span><em>Saffron Stay</em></div><p>Current occupancy</p><strong>{metrics.occupied}<small> / {metrics.totalBeds} beds</small></strong><button onClick={() => onView('property')}>{availableBeds} beds are ready <span>→</span></button></article>
      <article className="stat-card"><div className="stat-top"><span className="stat-icon blue">◇</span><em>This week</em></div><p>Open maintenance</p><strong>{orders.filter((order) => order.status !== 'resolved').length}</strong><button onClick={() => onView('maintenance')}>1 urgent request <span>→</span></button></article>
    </section>

    <section className="intelligence-row">
      <article className="ai-brief">
        <div className="ai-orb"><i /><i /><i /></div>
        <div className="brief-copy"><p className="overline">OWNER BRIEF</p><h2>A healthier week starts with three clear actions.</h2><p><strong>{money.format(concentratedDue)}</strong> is concentrated across the two largest balances, <strong>{availableBeds} beds</strong> are ready to allot, and one urgent repair needs review.</p></div>
        <button onClick={() => onView('rent')}>See action plan <span>↗</span></button>
      </article>
      <article className="trend-card">
        <div className="trend-head"><div><span>Collection momentum</span><strong>+18.4%</strong></div><em>Last 7 days</em></div>
        <div className="trend-chart" aria-label="Seven day collection trend">{collectionTrend.map((value, index) => <i key={index} style={{ height: `${Math.max(14, value)}%` }}><b /></i>)}</div>
        <div className="trend-labels"><span>16 Aug</span><span>Today</span></div>
      </article>
    </section>

    <section className="overview-main">
      <article className="surface attention-list"><div className="surface-head"><div><p className="overline">TODAY’S PRIORITIES</p><h2>What needs you</h2></div><span>{pending.length + 1} open items</span></div>
        <div className="priority-item urgent"><span className="priority-mark">!</span><div><strong>Water issue in Room 12</strong><p>Reported by Navya this morning · Plumbing</p></div><button onClick={() => onView('maintenance')}>Review</button></div>
        {pending.slice(0, 4).map((tenant, index) => <div className="priority-item" key={tenant.id}><span className={index < 2 ? 'priority-mark money' : 'priority-mark doc'}>{index < 2 ? '₹' : '○'}</span><div><strong>{index < 2 ? `${money.format(balanceFor(tenant))} pending from ${tenant.name}` : `${tenant.name} needs document review`}</strong><p>Room {tenant.room} · Bed {tenant.bed} {index < 2 ? '· Part payment received' : '· KYC incomplete'}</p></div><button onClick={() => index < 2 ? onPayment(tenant.id) : onTenant(tenant.id)}>{index < 2 ? 'Record' : 'Open'}</button></div>)}
      </article>

      <article className="surface collection-card"><div className="surface-head"><div><p className="overline">AUGUST COLLECTION</p><h2>Money in, clearly</h2></div><button className="link-button" onClick={() => onView('rent')}>Full ledger →</button></div>
        <div className="collection-visual"><div className="ring" style={{ '--progress': `${collectionPercent}%` } as React.CSSProperties}><div><strong>{collectionPercent}%</strong><span>received</span></div></div><div className="money-lines"><div><span>Received</span><strong className="positive">{money.format(metrics.collected)}</strong></div><div><span>Still due</span><strong>{money.format(metrics.pending)}</strong></div><div><span>Recurring rent</span><strong>{money.format(metrics.recurringCollected)} <small>/ {money.format(metrics.recurringExpected)}</small></strong></div></div></div>
        <div className="insight"><span>↗</span><p><strong>Collections are healthy.</strong> Recurring August rent is fully collected; remaining dues are from new allotments.</p></div>
      </article>
    </section>

    <section className="overview-lower">
      <article className="surface occupancy"><div className="surface-head"><div><p className="overline">OCCUPANCY</p><h2>Rooms at a glance</h2></div><button className="link-button" onClick={() => onView('property')}>All rooms →</button></div><div className="mini-rooms">{inventory.map(([room, beds]) => { const used = beds.filter((bed) => tenants.some((tenant) => tenant.room === room && tenant.bed === bed)).length; return <div key={room} className={used === beds.length ? 'mini-room full' : 'mini-room'}><div><strong>{room}</strong><span>{used}/{beds.length}</span></div><div>{beds.map((bed) => <i key={bed} className={tenants.some((tenant) => tenant.room === room && tenant.bed === bed) ? 'used' : ''}>{bed}</i>)}</div></div>; })}</div></article>
      <article className="surface activity"><div className="surface-head"><div><p className="overline">RECENT ACTIVITY</p><h2>Latest at Saffron Stay</h2></div></div><div className="timeline"><div><i className="pay">₹</i><p><strong>Payment recorded</strong><span>₹1,000 from Meera Kumari</span></p><time>9:08 AM</time></div><div><i className="move">↳</i><p><strong>New allotment</strong><span>Kabita moved into Room 23 · B</span></p><time>Yesterday</time></div><div><i className="fix">◇</i><p><strong>Repair assigned</strong><span>Room 21 fan · Ramesh Electric</span></p><time>Yesterday</time></div></div></article>
    </section>
  </div>;
}

function summaryShape() { return { expected: 0, collected: 0, pending: 0, totalBeds: 0, occupied: 0, recurringExpected: 0, recurringCollected: 0 }; }

function PropertyView({ tenants, onTenant, onAdd }: { tenants: Tenant[]; onTenant: (id: number) => void; onAdd: () => void }) {
  return <div className="view-stack"><section className="property-hero"><div><span className="property-badge">SS</span><div><p className="overline">DEMO PG PROPERTY</p><h2>Saffron Stay PG</h2><p>Women’s co-living · Kalyan Nagar, Bengaluru</p></div></div><div className="property-facts"><div><span>13</span><small>Rooms</small></div><div><span>28</span><small>Beds</small></div><div><span>{tenants.length}</span><small>Residents</small></div><div><span>{Math.round(tenants.length / 28 * 100)}%</span><small>Occupied</small></div></div><button className="quiet-button">Property details</button></section>
    <section className="surface"><div className="surface-head room-heading"><div><p className="overline">FLOOR PLAN</p><h2>Room inventory</h2></div><div className="room-legend"><span><i className="legend-dot occupied" />Occupied</span><span><i className="legend-dot" />Vacant</span></div></div><div className="room-cards">{inventory.map(([room, beds]) => { const roomTenants = tenants.filter((tenant) => tenant.room === room); const monthly = roomTenants[0]?.rent ?? ([1,2,3].includes(Number(room)) ? 2000 : 3000); return <article className="room-detail" key={room}><div className="room-title"><span>ROOM</span><strong>{room}</strong><em>{roomTenants.length === beds.length ? 'Full' : `${beds.length - roomTenants.length} open`}</em></div><div className="bed-list">{beds.map((bed) => { const tenant = roomTenants.find((item) => item.bed === bed); return <button key={bed} className={tenant ? 'occupied' : ''} onClick={() => tenant ? onTenant(tenant.id) : onAdd()}><i>{bed}</i><span>{tenant ? tenant.name.split(' ')[0] : 'Vacant'}</span><b>{tenant ? 'View' : 'Allot'}</b></button>; })}</div><footer><span>Monthly rent</span><strong>{money.format(monthly)} <small>/ bed</small></strong></footer></article>; })}</div></section></div>;
}

function TenantsView({ tenants, query, filter, onQuery, onFilter, onTenant, onPayment }: { tenants: Tenant[]; query: string; filter: 'all' | 'pending' | 'paid'; onQuery: (value: string) => void; onFilter: (value: 'all' | 'pending' | 'paid') => void; onTenant: (id: number) => void; onPayment: (id: number) => void }) {
  return <div className="view-stack"><section className="tenant-summary"><div><span>18</span><p>Active tenants<small>Across 10 occupied rooms</small></p></div><div><span>11</span><p>Documents verified<small>7 need review</small></p></div><div><span>7</span><p>Balances clear<small>11 need follow-up</small></p></div></section>
    <section className="surface directory"><div className="directory-tools"><label className="search-box">⌕<input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search name, room or phone" /></label><div className="segmented">{(['all','pending','paid'] as const).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => onFilter(item)}>{item === 'all' ? 'All tenants' : item === 'pending' ? 'Payment due' : 'Paid'}</button>)}</div><button className="quiet-button">⇩ Export</button></div>
      <div className="data-table"><table><thead><tr><th>Tenant</th><th>Room & bed</th><th>Contact</th><th>Monthly rent</th><th>Documents</th><th>Balance</th><th>Status</th><th /></tr></thead><tbody>{tenants.map((tenant) => { const profile = profileFor(tenant); const balance = balanceFor(tenant); return <tr key={tenant.id} onClick={() => onTenant(tenant.id)}><td><div className="person"><span>{tenant.name.split(' ').map((part) => part[0]).join('').slice(0,2)}</span><p><strong>{tenant.name}</strong><small>Since {new Date(`${tenant.allotment}T00:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</small></p></div></td><td><strong>Room {tenant.room}</strong><small className="subcell">Bed {tenant.bed}</small></td><td>{profile.phone}<small className="subcell">{profile.hometown}</small></td><td><strong>{money.format(tenant.rent)}</strong><small className="subcell">Due 1st monthly</small></td><td><span className={`document ${profile.kyc}`}>{profile.kyc === 'verified' ? '✓ Verified' : '○ Pending'}</span></td><td className={balance ? 'due-text' : 'clear-text'}><strong>{balance ? money.format(balance) : 'Clear'}</strong></td><td><span className={`pill ${balance ? 'part' : 'settled'}`}>{balance ? 'Part paid' : 'Paid'}</span></td><td><button className="row-menu" onClick={(event) => { event.stopPropagation(); balance ? onPayment(tenant.id) : onTenant(tenant.id); }}>{balance ? 'Record' : '•••'}</button></td></tr>; })}</tbody></table>{tenants.length === 0 && <div className="empty"><strong>No matching tenants</strong><span>Try a different name, room or filter.</span></div>}</div>
    </section></div>;
}

function RentView({ tenants, metrics, onTenant, onPayment }: { tenants: Tenant[]; metrics: ReturnType<typeof summaryShape>; onTenant: (id: number) => void; onPayment: (id: number) => void }) {
  const pending = tenants.filter((tenant) => balanceFor(tenant) > 0).sort((a,b) => balanceFor(b) - balanceFor(a)); const percent = Math.round(metrics.collected / metrics.expected * 100);
  return <div className="view-stack"><section className="rent-hero"><div><p className="overline">AUGUST 2026</p><h2>{money.format(metrics.collected)}</h2><span>collected of {money.format(metrics.expected)}</span><div className="wide-meter"><i style={{width:`${percent}%`}} /></div></div><div className="rent-split"><article><span>First month + deposits</span><strong>{money.format(metrics.collected)}</strong><small>{percent}% received</small></article><article><span>Recurring August rent</span><strong>{money.format(metrics.recurringCollected)}</strong><small className="good">✓ Fully collected</small></article><article><span>Outstanding</span><strong className="warn">{money.format(metrics.pending)}</strong><small>{pending.length} tenants</small></article></div></section>
    <section className="rent-layout"><article className="surface dues"><div className="surface-head"><div><p className="overline">FOLLOW-UP QUEUE</p><h2>Outstanding dues</h2></div><span>{pending.length} tenants</span></div><div className="due-list">{pending.map((tenant) => <div key={tenant.id}><button className="due-person" onClick={() => onTenant(tenant.id)}><span>{tenant.name.slice(0,1)}</span><p><strong>{tenant.name}</strong><small>Room {tenant.room} · Bed {tenant.bed}</small></p></button><div className="due-amount"><strong>{money.format(balanceFor(tenant))}</strong><small>of {money.format(dueFor(tenant))}</small></div><button className="record-button" onClick={() => onPayment(tenant.id)}>Record payment</button></div>)}</div></article>
      <aside className="rent-side"><article className="surface breakdown"><div className="surface-head"><div><p className="overline">RECEIVABLES</p><h2>What makes up August</h2></div></div><div><span>Security deposits</span><strong>{money.format(tenants.reduce((sum,tenant)=>sum+tenant.security,0))}</strong></div><div><span>Prorated first rent</span><strong>{money.format(tenants.reduce((sum,tenant)=>sum+tenant.firstMonthRent,0))}</strong></div><div><span>Recurring rent</span><strong>{money.format(metrics.recurringExpected)}</strong></div><footer><span>Total tracked</span><strong>{money.format(metrics.expected + metrics.recurringExpected)}</strong></footer></article><article className="rent-note"><span>₹</span><p><strong>Made for split payments.</strong> Record any number of receipts against one tenant; RentWise keeps the remaining balance clear.</p></article></aside>
    </section></div>;
}

function MaintenanceView({ orders, onUpdate }: { orders: WorkOrder[]; onUpdate: (id: number) => void }) {
  return <div className="view-stack"><section className="maintenance-stats"><article><span className="urgent-dot" /><div><strong>{orders.filter((order)=>order.priority==='urgent'&&order.status!=='resolved').length}</strong><p>Urgent<small>Requires action today</small></p></div></article><article><span className="progress-dot" /><div><strong>{orders.filter((order)=>order.status==='in-progress').length}</strong><p>In progress<small>Vendor or staff assigned</small></p></div></article><article><span className="resolved-dot" /><div><strong>{orders.filter((order)=>order.status==='resolved').length}</strong><p>Resolved<small>Closed this month</small></p></div></article></section>
    <section className="surface work-orders"><div className="surface-head"><div><p className="overline">OPEN REQUESTS</p><h2>Work orders</h2></div><button className="main-button">＋ New request</button></div>{orders.map((order)=><article key={order.id}><span className={`order-icon ${order.priority}`}>{order.category==='Plumbing'?'≋':order.category==='Electrical'?'ϟ':'⌁'}</span><div className="order-copy"><div><strong>{order.title}</strong><span className={`priority ${order.priority}`}>{order.priority}</span></div><p>Room {order.room} · {order.tenant}</p><small>{order.category} · Opened {order.opened}</small></div><div className="order-status"><span className={order.status}>{order.status.replace('-',' ')}</span><button onClick={()=>onUpdate(order.id)}>{order.status==='new'?'Start work':order.status==='in-progress'?'Mark resolved':'View'} →</button></div></article>)}</section></div>;
}

function TenantDrawer({ tenant, onClose, onPayment }: { tenant: Tenant; onClose: () => void; onPayment: () => void }) {
  const profile = profileFor(tenant); const balance = balanceFor(tenant); const history = paymentHistory[tenant.id] ?? [{ amount: tenant.received, date: 'August', mode: 'UPI', note: 'Payment received' }];
  return <div className="drawer-layer" onMouseDown={onClose}><aside className="drawer" onMouseDown={(event)=>event.stopPropagation()}><header><button onClick={onClose}>×</button><p className="overline">TENANT PROFILE</p><div className="drawer-person"><span>{tenant.name.split(' ').map((part)=>part[0]).join('').slice(0,2)}</span><div><h2>{tenant.name}</h2><p>Room {tenant.room} · Bed {tenant.bed}</p></div></div><div className="drawer-actions"><button className="main-button" onClick={onPayment}>₹ Record payment</button><button className="quiet-button">Message</button></div></header><div className="drawer-body"><section className="profile-grid"><div><span>Phone</span><strong>{profile.phone}</strong></div><div><span>Occupation</span><strong>{profile.profession}</strong></div><div><span>Hometown</span><strong>{profile.hometown}</strong></div><div><span>Allotted</span><strong>{new Date(`${tenant.allotment}T00:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</strong></div></section><section className="drawer-section"><div className="section-title"><h3>Rent standing</h3><span className={`pill ${balance?'part':'settled'}`}>{balance?'Balance due':'All clear'}</span></div><div className="rent-standing"><div><span>Monthly rent</span><strong>{money.format(tenant.rent)}</strong></div><div><span>Security deposit</span><strong>{money.format(tenant.security)}</strong></div><div className={balance?'highlight':''}><span>Current balance</span><strong>{balance?money.format(balance):'₹0'}</strong></div></div></section><section className="drawer-section"><div className="section-title"><h3>Documents</h3></div><div className="docs"><div><i>⌑</i><p><strong>Identity & address proof</strong><span>{profile.kyc==='verified'?'Verified and on file':'Needs verification'}</span></p><b className={profile.kyc}>{profile.kyc==='verified'?'✓':'!'}</b></div><div><i>≡</i><p><strong>Rental agreement</strong><span>Valid until {profile.agreementEnd}</span></p><b className="verified">✓</b></div></div></section><section className="drawer-section"><div className="section-title"><h3>Recent receipts</h3><button>View all</button></div><div className="receipts">{history.map((item,index)=><div key={`${item.date}-${index}`}><i>₹</i><p><strong>{money.format(item.amount)}</strong><span>{item.note} · {item.mode}</span></p><time>{item.date}</time></div>)}</div></section></div></aside></div>;
}

function AddTenantModal({ availableBeds, draftDate, draftRent, onDate, onRent, onClose, onSubmit }: { availableBeds: {room:string;bed:string}[]; draftDate:string; draftRent:number; onDate:(value:string)=>void; onRent:(value:number)=>void; onClose:()=>void; onSubmit:(event:FormEvent<HTMLFormElement>)=>void }) {
  return <div className="modal-layer" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" onMouseDown={(event)=>event.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><p className="overline">NEW ALLOTMENT</p><h2>Move a tenant in</h2><p className="modal-copy">Create their record, assign a bed and calculate the exact first-month amount.</p><form onSubmit={onSubmit}><label>Full name<input name="name" required placeholder="Tenant’s name" /></label><label>Phone number<input name="phone" placeholder="Optional for now" /></label><div className="form-row"><label>Vacant bed<select name="bed" required>{availableBeds.map(({room,bed})=><option key={`${room}-${bed}`} value={`${room}-${bed}`}>Room {room} · Bed {bed}</option>)}</select></label><label>Allotment date<input name="allotment" type="date" value={draftDate} onChange={(event)=>onDate(event.target.value)} required /></label></div><div className="form-row"><label>Monthly rent<input name="rent" type="number" min="0" value={draftRent} onChange={(event)=>onRent(Number(event.target.value))} required /></label><label>Security deposit<input name="security" type="number" min="0" defaultValue="3000" required /></label></div><div className="calculation"><span>First-month rent</span><strong>{money.format(proratedRent(draftRent,draftDate))}</strong><small>Calculated for the remaining days, including the move-in date.</small></div><button className="main-button full" type="submit">Create allotment</button></form></section></div>;
}

function PaymentModal({ tenant, onClose, onSubmit }: { tenant: Tenant; onClose:()=>void; onSubmit:(event:FormEvent<HTMLFormElement>)=>void }) {
  return <div className="modal-layer" onMouseDown={onClose}><section className="modal payment-modal" role="dialog" aria-modal="true" onMouseDown={(event)=>event.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><p className="overline">RECORD RECEIPT</p><h2>{tenant.name}</h2><p className="modal-copy">Room {tenant.room} · Bed {tenant.bed} · <b>{money.format(balanceFor(tenant))}</b> outstanding</p><form onSubmit={onSubmit}><label>Amount received<input name="amount" type="number" min="1" max={balanceFor(tenant)} defaultValue={balanceFor(tenant)} required /></label><div className="form-row"><label>Received on<input name="date" type="date" defaultValue="2026-08-22" required /></label><label>Payment mode<select name="mode" defaultValue="UPI"><option>UPI</option><option>Cash</option><option>Bank transfer</option></select></label></div><label>Reference or note<input name="reference" placeholder="Optional UTR or note" /></label><button className="main-button full" type="submit">Save receipt</button></form></section></div>;
}
