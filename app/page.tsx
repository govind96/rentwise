'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Tenant = {
  id: number;
  room: string;
  bed: string;
  name: string;
  allotment: string;
  rent: number;
  security: number;
  firstMonthRent: number;
  received: number;
  status: 'paid' | 'partial';
};

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const seededTenants: Tenant[] = [
  { id: 1, room: '1', bed: 'A', name: 'Mahi Kumari', allotment: '2026-08-04', rent: 2000, security: 2000, firstMonthRent: 1806, received: 3806, status: 'paid' },
  { id: 2, room: '1', bed: 'B', name: 'Muskan Kumari', allotment: '2026-08-04', rent: 2000, security: 2000, firstMonthRent: 1806, received: 3806, status: 'paid' },
  { id: 3, room: '2', bed: 'A', name: 'Arya Kumari', allotment: '2026-08-12', rent: 2000, security: 2000, firstMonthRent: 1290, received: 3290, status: 'paid' },
  { id: 4, room: '11', bed: 'A', name: 'Aditi Prajapati', allotment: '2026-08-09', rent: 3500, security: 3500, firstMonthRent: 2597, received: 6066, status: 'partial' },
  { id: 5, room: '12', bed: 'A', name: 'Navya Kumari', allotment: '2026-07-15', rent: 3500, security: 3500, firstMonthRent: 1919, received: 5250, status: 'partial' },
  { id: 6, room: '12', bed: 'B', name: 'Pragya Kumari', allotment: '2026-07-15', rent: 3500, security: 3500, firstMonthRent: 1919, received: 5250, status: 'partial' },
  { id: 7, room: '14', bed: 'A', name: 'Shristi Kumari', allotment: '2026-08-09', rent: 3000, security: 3000, firstMonthRent: 2226, received: 1000, status: 'partial' },
  { id: 8, room: '14', bed: 'B', name: 'Kajal Kumari', allotment: '2026-08-09', rent: 3000, security: 3000, firstMonthRent: 2226, received: 5225, status: 'partial' },
  { id: 9, room: '15', bed: 'A', name: 'Ankita Kumari', allotment: '2026-08-01', rent: 3000, security: 3000, firstMonthRent: 3000, received: 6000, status: 'paid' },
  { id: 10, room: '15', bed: 'B', name: 'Roshni Kumari', allotment: '2026-08-01', rent: 3000, security: 3000, firstMonthRent: 3000, received: 6000, status: 'paid' },
  { id: 11, room: '21', bed: 'A', name: 'Sakshi Singh', allotment: '2026-08-15', rent: 3500, security: 3500, firstMonthRent: 1919, received: 1750, status: 'partial' },
  { id: 12, room: '21', bed: 'B', name: 'Nimmy Jaiswal', allotment: '2026-08-15', rent: 3500, security: 3500, firstMonthRent: 1919, received: 1750, status: 'partial' },
  { id: 13, room: '22', bed: 'A', name: 'Ananya Shree', allotment: '2026-08-01', rent: 3500, security: 3500, firstMonthRent: 3500, received: 7000, status: 'paid' },
  { id: 14, room: '22', bed: 'B', name: 'Shalini Raj', allotment: '2026-08-01', rent: 3500, security: 3500, firstMonthRent: 3500, received: 7000, status: 'paid' },
  { id: 15, room: '23', bed: 'A', name: 'Pooja Kumari', allotment: '2026-08-22', rent: 3000, security: 3000, firstMonthRent: 968, received: 1000, status: 'partial' },
  { id: 16, room: '23', bed: 'B', name: 'Kabita Kumari', allotment: '2026-08-22', rent: 3000, security: 3000, firstMonthRent: 968, received: 1000, status: 'partial' },
  { id: 17, room: '25', bed: 'A', name: 'Sweety Kumari', allotment: '2026-08-03', rent: 3000, security: 3000, firstMonthRent: 2806, received: 5800, status: 'partial' },
  { id: 18, room: '25', bed: 'B', name: 'Meera Kumari', allotment: '2026-08-22', rent: 3000, security: 3000, firstMonthRent: 968, received: 1000, status: 'partial' },
];

const inventory = [
  ['1', ['A', 'B']], ['2', ['A', 'B']], ['3', ['A', 'B']], ['11', ['A', 'B']],
  ['12', ['A', 'B']], ['13', ['A', 'B']], ['14', ['A', 'B', 'C']], ['15', ['A', 'B']],
  ['21', ['A', 'B']], ['22', ['A', 'B']], ['23', ['A', 'B']], ['24', ['A', 'B', 'C']], ['25', ['A', 'B']],
] as const;

function dueFor(tenant: Tenant) { return tenant.security + tenant.firstMonthRent; }
function balanceFor(tenant: Tenant) { return Math.max(0, dueFor(tenant) - tenant.received); }
function proratedRent(monthlyRent: number, allotment: string) {
  if (!allotment) return 0;
  const date = new Date(`${allotment}T00:00:00`);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Math.round((monthlyRent * (daysInMonth - date.getDate() + 1)) / daysInMonth);
}

export default function Home() {
  const [tenants, setTenants] = useState(seededTenants);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [modal, setModal] = useState<'tenant' | 'payment' | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [draftRent, setDraftRent] = useState(3000);
  const [draftDate, setDraftDate] = useState('2026-08-22');

  useEffect(() => {
    let active = true;
    fetch('/api/state')
      .then(async (response): Promise<{ tenants?: Tenant[] } | null> => response.ok ? await response.json() as { tenants?: Tenant[] } : null)
      .then((data) => {
        if (!active) return;
        if (data?.tenants?.length) setTenants(data.tenants);
        else void persistState(seededTenants);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const metrics = useMemo(() => {
    const expected = tenants.reduce((sum, tenant) => sum + dueFor(tenant), 0);
    const collected = tenants.reduce((sum, tenant) => sum + tenant.received, 0);
    const totalBeds = inventory.reduce((sum, [, beds]) => sum + beds.length, 0);
    return { expected, collected, pending: Math.max(0, expected - collected), totalBeds, occupied: tenants.length };
  }, [tenants]);

  const filteredTenants = tenants.filter((tenant) => {
    const matchesQuery = `${tenant.name} ${tenant.room} ${tenant.bed}`.toLowerCase().includes(query.toLowerCase());
    const balance = balanceFor(tenant);
    return matchesQuery && (filter === 'all' || (filter === 'pending' ? balance > 0 : balance === 0));
  });
  const selectedTenant = tenants.find((tenant) => tenant.id === selectedId) ?? null;
  const availableBeds = inventory.flatMap(([room, beds]) => beds
    .filter((bed) => !tenants.some((tenant) => tenant.room === room && tenant.bed === bed))
    .map((bed) => ({ room, bed })));

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }
  async function persistState(nextTenants: Tenant[]) {
    try {
      await fetch('/api/state', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenants: nextTenants }) });
    } catch {
      showToast('Saved for this session; cloud sync will retry later');
    }
  }
  function addTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const [room, bed] = String(data.get('bed')).split('-');
    const rent = Number(data.get('rent'));
    const security = Number(data.get('security'));
    const allotment = String(data.get('allotment'));
    const next = [...tenants, { id: Math.max(...tenants.map((t) => t.id), 0) + 1, room, bed, name: String(data.get('name')), allotment, rent, security, firstMonthRent: proratedRent(rent, allotment), received: 0, status: 'partial' as const }];
    setTenants(next);
    void persistState(next);
    setModal(null);
    showToast('Tenant added and first-month dues created');
  }
  function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(new FormData(event.currentTarget).get('amount'));
    const next = tenants.map((tenant) => tenant.id === selectedId ? { ...tenant, received: tenant.received + amount, status: tenant.received + amount >= dueFor(tenant) ? 'paid' as const : 'partial' as const } : tenant);
    setTenants(next);
    void persistState(next);
    setModal(null);
    showToast(`${money.format(amount)} payment recorded`);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">R</span><span>RentWise</span></div>
        <div className="property-switcher"><small>PROPERTY</small><strong>Villa 26</strong><span>Sunshine Layout, Bengaluru</span></div>
        <nav aria-label="Primary navigation">
          <button className="nav-item active"><span>⌂</span> Overview</button>
          <button className="nav-item"><span>▦</span> Rooms & beds</button>
          <button className="nav-item"><span>♙</span> Tenants</button>
          <button className="nav-item"><span>₹</span> Collections <b>{tenants.filter((t) => balanceFor(t) > 0).length}</b></button>
          <button className="nav-item"><span>↗</span> Reports</button>
        </nav>
        <div className="sidebar-note"><span>Phase 1</span><strong>Owner operations</strong><p>Inventory, tenants and rent collections in one place.</p></div>
        <button className="profile"><span className="avatar">GK</span><span><strong>Govind Kumar</strong><small>Property owner</small></span><span>⋯</span></button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><p className="eyebrow">SATURDAY, 22 AUGUST</p><h1>Good morning, Govind</h1><p>Here’s what needs your attention at Villa 26.</p></div>
          <div className="top-actions"><button className="icon-button" aria-label="Notifications">◴<span /></button><button className="primary" onClick={() => setModal('tenant')}>＋ Add tenant</button></div>
        </header>

        <section className="metrics" aria-label="Property summary">
          <article><div className="metric-icon teal">₹</div><div><span>Collected this month</span><strong>{money.format(metrics.collected)}</strong><small>{Math.round((metrics.collected / metrics.expected) * 100)}% of first-month dues</small></div><div className="progress"><i style={{ width: `${Math.min(100, (metrics.collected / metrics.expected) * 100)}%` }} /></div></article>
          <article><div className="metric-icon coral">!</div><div><span>Outstanding</span><strong>{money.format(metrics.pending)}</strong><small>{tenants.filter((t) => balanceFor(t) > 0).length} tenants pending</small></div><button className="text-action" onClick={() => setFilter('pending')}>View dues →</button></article>
          <article><div className="metric-icon violet">▦</div><div><span>Occupancy</span><strong>{metrics.occupied} <em>/ {metrics.totalBeds} beds</em></strong><small>{Math.round((metrics.occupied / metrics.totalBeds) * 100)}% occupied</small></div><div className="progress violet-bar"><i style={{ width: `${(metrics.occupied / metrics.totalBeds) * 100}%` }} /></div></article>
          <article><div className="metric-icon amber">⌁</div><div><span>Vacant beds</span><strong>{metrics.totalBeds - metrics.occupied}</strong><small>Across {new Set(availableBeds.map((bed) => bed.room)).size} rooms</small></div><button className="text-action" onClick={() => setModal('tenant')}>Allot a bed →</button></article>
        </section>

        <section className="dashboard-grid">
          <article className="panel collection-panel">
            <div className="panel-head"><div><p className="eyebrow">COLLECTIONS</p><h2>First month + security</h2></div><div className="legend"><span><i className="dot teal-dot" />Received</span><span><i className="dot pale-dot" />Pending</span></div></div>
            <div className="collection-chart"><div className="donut" style={{ '--percentage': `${Math.round((metrics.collected / metrics.expected) * 100)}%` } as React.CSSProperties}><div><strong>{Math.round((metrics.collected / metrics.expected) * 100)}%</strong><span>collected</span></div></div><div className="collection-breakdown"><div><span>Total receivable</span><strong>{money.format(metrics.expected)}</strong></div><div><span>Amount received</span><strong className="green-text">{money.format(metrics.collected)}</strong></div><div><span>Balance pending</span><strong className="orange-text">{money.format(metrics.pending)}</strong></div></div></div>
          </article>

          <article className="panel inventory-panel">
            <div className="panel-head"><div><p className="eyebrow">INVENTORY</p><h2>Rooms at a glance</h2></div><button className="text-action">Manage rooms →</button></div>
            <div className="room-grid">{inventory.map(([room, beds]) => { const occupied = beds.filter((bed) => tenants.some((tenant) => tenant.room === room && tenant.bed === bed)).length; return <div className={occupied === beds.length ? 'room-card full' : 'room-card'} key={room}><strong>{room}</strong><div>{beds.map((bed) => <i key={bed} className={tenants.some((tenant) => tenant.room === room && tenant.bed === bed) ? 'occupied' : ''}>{bed}</i>)}</div><span>{occupied}/{beds.length}</span></div>; })}</div>
            <div className="inventory-key"><span><i className="bed-dot occupied" />Occupied</span><span><i className="bed-dot" />Vacant</span></div>
          </article>
        </section>

        <section className="panel tenant-panel">
          <div className="tenant-head"><div><p className="eyebrow">TENANT LEDGER</p><h2>August allotments & collections</h2></div><div className="tenant-tools"><label className="search">⌕<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tenant or room" aria-label="Search tenant or room" /></label><div className="filter-group">{(['all', 'pending', 'paid'] as const).map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : value === 'pending' ? 'Pending' : 'Paid'}</button>)}</div></div></div>
          <div className="table-wrap"><table><thead><tr><th>Tenant</th><th>Bed</th><th>Allotted</th><th>Monthly rent</th><th>First-month due</th><th>Received</th><th>Balance</th><th>Status</th><th /></tr></thead><tbody>{filteredTenants.map((tenant) => { const balance = balanceFor(tenant); return <tr key={tenant.id}><td><div className="tenant-name"><span>{tenant.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><strong>{tenant.name}</strong></div></td><td><b>R{tenant.room} · {tenant.bed}</b></td><td>{new Date(`${tenant.allotment}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td><td>{money.format(tenant.rent)}</td><td><strong>{money.format(dueFor(tenant))}</strong><small className="cell-note">₹{tenant.security.toLocaleString('en-IN')} deposit + ₹{tenant.firstMonthRent.toLocaleString('en-IN')} rent</small></td><td>{money.format(tenant.received)}</td><td className={balance ? 'balance-due' : 'balance-clear'}>{balance ? money.format(balance) : 'Clear'}</td><td><span className={balance ? 'status pending' : 'status paid'}>{balance ? 'Part paid' : 'Paid'}</span></td><td><button className="row-action" aria-label={`Record payment for ${tenant.name}`} onClick={() => { setSelectedId(tenant.id); setModal('payment'); }}>•••</button></td></tr>; })}</tbody></table>{filteredTenants.length === 0 && <div className="empty-state"><strong>No tenants found</strong><span>Try a different search or filter.</span></div>}</div>
        </section>
      </main>

      {modal === 'tenant' && <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="add-title" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}>×</button><p className="eyebrow">NEW ALLOTMENT</p><h2 id="add-title">Add a tenant</h2><p className="modal-subtitle">Assign a vacant bed and calculate the first month automatically.</p><form onSubmit={addTenant}><label>Tenant name<input name="name" required placeholder="Full name" /></label><div className="form-row"><label>Vacant bed<select name="bed" required>{availableBeds.map(({ room, bed }) => <option key={`${room}-${bed}`} value={`${room}-${bed}`}>Room {room} · Bed {bed}</option>)}</select></label><label>Allotment date<input name="allotment" type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} required /></label></div><div className="form-row"><label>Monthly rent<input name="rent" type="number" min="0" value={draftRent} onChange={(e) => setDraftRent(Number(e.target.value))} required /></label><label>Security deposit<input name="security" type="number" min="0" defaultValue="3000" required /></label></div><div className="calculation"><div><span>Prorated rent</span><strong>{money.format(proratedRent(draftRent, draftDate))}</strong></div><small>Inclusive of allotment day · {new Date(`${draftDate}T00:00:00`).getDate()}–31 August</small></div><button className="primary submit" type="submit">Create allotment</button></form></section></div>}
      {modal === 'payment' && selectedTenant && <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}><section className="modal compact" role="dialog" aria-modal="true" aria-labelledby="payment-title" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}>×</button><p className="eyebrow">RECORD RECEIPT</p><h2 id="payment-title">{selectedTenant.name}</h2><p className="modal-subtitle">Room {selectedTenant.room}, Bed {selectedTenant.bed} · {money.format(balanceFor(selectedTenant))} pending</p><form onSubmit={recordPayment}><label>Amount received<input name="amount" type="number" min="1" max={balanceFor(selectedTenant)} defaultValue={balanceFor(selectedTenant)} required /></label><div className="form-row"><label>Date<input name="date" type="date" defaultValue="2026-08-22" required /></label><label>Payment mode<select name="mode" defaultValue="UPI"><option>UPI</option><option>Cash</option><option>Bank transfer</option></select></label></div><label>Reference / note<input name="reference" placeholder="Optional UTR or note" /></label><button className="primary submit" type="submit">Save payment</button></form></section></div>}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </div>
  );
}
