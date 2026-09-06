'use client';
import OccupancyMap from '../components/OccupancyMap';

import { balanceFor, money, type ActivityEvent, type RoomInventory, type Summary, type Tenant, type View, type WorkOrder } from '../shared';

export function Overview({ propertyName, demo, tenants, orders, metrics, inventory, availableBeds, activity, onView, onTenant, onPayment }: { propertyName: string; demo: boolean; tenants: Tenant[]; orders: WorkOrder[]; metrics: Summary; inventory: RoomInventory; availableBeds: number; activity: ActivityEvent[]; onView: (view: View) => void; onTenant: (id: number) => void; onPayment: (id: number) => void }) {
  const pending = [...tenants].filter((tenant) => balanceFor(tenant) > 0).sort((a, b) => balanceFor(b) - balanceFor(a));
  const collectionPercent = metrics.expected ? Math.round((metrics.collected / metrics.expected) * 100) : 0;
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
        <div className="ai-signal"><span>✓</span><strong>Workspace snapshot</strong></div>
        <div className="brief-copy"><p className="overline">RENTWISE CHECK-IN</p>
          <h2>{pending.length || urgentCount || topOrder ? 'Here’s what needs your attention today.' : 'You’re on top of things — enjoy the calm.'}</h2>
          <p>{pending.length ? <><strong>{money.format(concentratedDue)}</strong> is concentrated across the two largest balances, </> : 'Every balance is clear. '}<strong>{availableBeds} beds</strong> are ready to allot{topOrder ? ', and one repair needs review' : ''}.</p>
        </div>
        <button onClick={() => onView(pending.length ? 'rent' : 'property')}>{pending.length ? 'Walk me through it' : 'See vacant beds'} <span>↗</span></button>
      </article>
      <article className="trend-card">
        <div className="trend-head"><div><span>Collection status</span><strong>{metrics.expected ? `${Math.round(metrics.collected / metrics.expected * 100)}%` : '—'}</strong></div><em>This month</em></div>
        <p className="trend-empty">{metrics.expected ? `${money.format(metrics.collected)} recorded against ${money.format(metrics.expected)} due.` : 'Your collection history will appear after the first receipt.'}</p>
      </article>
    </section>

    <section className="overview-columns">
      <div className="overview-column">
        <article className="surface attention-list"><div className="surface-head"><div><p className="overline">TODAY’S PRIORITIES</p><h2>What needs you</h2></div><span>{pending.length + (topOrder ? 1 : 0)} open items</span></div>
          {topOrder && <div className="priority-item urgent"><span className="priority-mark">!</span><div><strong>{topOrder.title} · Room {topOrder.room}</strong><p>Reported by {topOrder.tenant} · {topOrder.category}</p></div><button onClick={() => onView('maintenance')}>Review</button></div>}
          {!topOrder && !pending.length && <div className="empty"><strong>All clear</strong><span>No open priorities — enjoy the calm.</span></div>}
          {pending.slice(0, topOrder ? 4 : 5).map((tenant, index) => <div className="priority-item" key={tenant.id}><span className={index < 2 ? 'priority-mark money' : 'priority-mark doc'}>{index < 2 ? '₹' : '○'}</span><div><strong>{index < 2 ? `${money.format(balanceFor(tenant))} pending from ${tenant.name}` : `${tenant.name} needs document review`}</strong><p>Room {tenant.room} · Bed {tenant.bed} {index < 2 ? '· Part payment received' : '· KYC incomplete'}</p></div><button onClick={() => index < 2 ? onPayment(tenant.id) : onTenant(tenant.id)}>{index < 2 ? 'Record' : 'Open'}</button></div>)}
        </article>
        <OccupancyMap inventory={inventory} tenants={tenants} onTenant={onTenant} onAdd={() => onView('property')} />
      </div>

      <div className="overview-column">
        <article className="surface collection-card"><div className="surface-head"><div><p className="overline">{demo ? 'DEMO COLLECTION' : 'THIS MONTH’S COLLECTION'}</p><h2>Collection pulse</h2></div><button className="link-button" onClick={() => onView('rent')}>Open ledger <span>→</span></button></div>
          <div className="collection-hero"><div className="ring" style={{ '--progress': `${collectionPercent}%` } as React.CSSProperties}><div><strong>{collectionPercent}%</strong><span>received</span></div></div><div className="collection-total"><span>Collected so far</span><strong>{money.format(metrics.collected)}</strong><small>of {money.format(metrics.expected)} tracked</small></div></div>
          <div className="collection-progress"><div><span>Month progress</span><strong>{collectionPercent}% received</strong></div><div className="wide-meter" aria-label={`${collectionPercent}% of receivables collected`}><i style={{ width: `${collectionPercent}%` }} /></div></div>
          <div className="collection-breakdown"><div><span>Still to collect</span><strong>{money.format(metrics.pending)}</strong><small>{pending.length} residents need a follow-up</small></div><div><span>This month’s rent</span><strong>{money.format(metrics.recurringCollected)}</strong><small>of {money.format(metrics.recurringExpected)} billed</small></div></div>
          <div className="insight"><span>↗</span><p><strong>Follow-up is focused.</strong> {pending.length || 'No'} residents account for {money.format(metrics.pending)} still to collect this month.</p></div>
        </article>
        <article className="surface activity"><div className="surface-head"><div><p className="overline">RECENT ACTIVITY</p><h2>Latest at {propertyName}</h2></div></div>{activity.length ? <div className="timeline">{activity.map((event, index) => <div key={index}><i className={event.action === 'create' ? 'pay' : event.action === 'delete' || event.action === 'void' ? 'fix' : 'move'}>{event.action === 'create' ? '₹' : event.action === 'delete' || event.action === 'void' ? '×' : '↳'}</i><p><strong>{event.summary}</strong><span>{event.entityType.replace('_', ' ')}</span></p><time>{new Date(event.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time></div>)}</div> : demo ? <div className="timeline"><div><i className="pay">₹</i><p><strong>Payment recorded</strong><span>₹1,000 from Meera Kumari</span></p><time>9:08 AM</time></div><div><i className="move">↳</i><p><strong>New allotment</strong><span>Kabita moved into Room 23 · B</span></p><time>Yesterday</time></div><div><i className="fix">◇</i><p><strong>Repair assigned</strong><span>Room 21 fan · Ramesh Electric</span></p><time>Yesterday</time></div></div> : <div className="empty"><strong>Fresh workspace</strong><span>Activity appears as you allot beds and record receipts.</span></div>}</article>
      </div>
    </section>
  </div>;
}
