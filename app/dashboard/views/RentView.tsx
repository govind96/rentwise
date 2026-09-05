'use client';

import { balanceFor, dueFor, formatPeriod, money, shortMoney, waLink, type Receipt, type Summary, type Tenant } from '../shared';

export function RentView({ tenants, metrics, propertyName, history, onTenant, onPayment }: { tenants: Tenant[]; metrics: Summary; propertyName: string; history?: Record<number, Receipt[]>; onTenant: (id: number) => void; onPayment: (id: number) => void }) {
  const pending = tenants.filter((tenant) => balanceFor(tenant) > 0).sort((a,b) => balanceFor(b) - balanceFor(a)); const percent = metrics.expected ? Math.round(metrics.collected / metrics.expected * 100) : 0;
  const rentPercent = metrics.recurringExpected ? Math.round(metrics.recurringCollected / metrics.recurringExpected * 100) : 0;
  // Deposits and prorated first month arrive up front; everything past that is rent.
  const moveInCollected = tenants.reduce((sum, tenant) => sum + Math.min(tenant.received, tenant.security + tenant.firstMonthRent), 0);
  const moveInShare = metrics.collected ? Math.round(moveInCollected / metrics.collected * 100) : 0;
  function receiptsFor(tenant: Tenant) {
    return history?.[tenant.id] ?? (tenant.received > 0 ? [{ amount: tenant.received, date: 'Recorded', mode: 'UPI', note: 'Payment received' }] : []);
  }
  function exportLedger() {
    const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const lines = ['Date,Tenant,Room,Bed,Amount,Mode,Note'];
    for (const tenant of tenants) for (const receipt of receiptsFor(tenant)) lines.push([receipt.date, tenant.name, tenant.room, tenant.bed, receipt.amount, receipt.mode, receipt.note].map(quote).join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'rentwise-ledger.csv'; link.click();
    URL.revokeObjectURL(url);
  }
  return <div className="view-stack"><section className="rent-hero"><div><p className="overline">THIS MONTH</p><h2>{money.format(metrics.collected)}</h2><span>collected of {money.format(metrics.expected)}</span><div className="wide-meter"><i style={{width:`${percent}%`}} /></div></div><div className="rent-split"><article><span>Deposits &amp; move-in</span><strong>{money.format(moveInCollected)}</strong><small>{moveInShare}% of collections</small></article><article><span>This month’s rent</span><strong>{money.format(metrics.recurringCollected)}</strong><small className={metrics.recurringExpected && rentPercent >= 100 ? 'good' : ''}>{metrics.recurringExpected ? `${rentPercent}% of ${shortMoney(metrics.recurringExpected)}` : 'No rent cycles yet'}</small></article><article><span>Outstanding</span><strong className={metrics.pending ? 'warn' : 'good'}>{money.format(metrics.pending)}</strong><small>{pending.length} tenants</small></article></div></section>
    <section className="rent-layout"><article className="surface dues"><div className="surface-head"><div><p className="overline">FOLLOW-UP QUEUE</p><h2>Outstanding dues</h2></div><div className="head-side"><span>{pending.length} tenants</span><button className="quiet-button" onClick={exportLedger}>⇩ Export ledger</button></div></div>{pending.length ? <div className="due-list">{pending.map((tenant) => { const balance = balanceFor(tenant); const remind = waLink(tenant, propertyName, balance); return <div key={tenant.id}><button className="due-person" onClick={() => onTenant(tenant.id)}><span>{tenant.name.slice(0,1)}</span><p><strong>{tenant.name}</strong><small>Room {tenant.room} · Bed {tenant.bed}{tenant.monthly && tenant.monthly.expected > 0 && tenant.monthly.status !== 'paid' ? ` · ${formatPeriod(tenant.monthly.period)} rent ${tenant.monthly.status}` : ''}</small></p></button><div className="due-amount"><strong>{money.format(balance)}</strong><small>of {money.format(dueFor(tenant))}</small></div>{remind && <a className="remind-link" href={remind} target="_blank" rel="noreferrer" aria-label={`Send ${tenant.name} a WhatsApp rent reminder`} title="WhatsApp reminder">✆</a>}<button className="record-button" onClick={() => onPayment(tenant.id)}>Record payment</button></div>; })}</div> : <div className="empty"><strong>Everyone’s settled</strong><span>No outstanding balances — the whole ledger is clear.</span></div>}</article>
      <aside className="rent-side"><article className="surface breakdown"><div className="surface-head"><div><p className="overline">RECEIVABLES</p><h2>What makes up the ledger</h2></div></div><div><span>Security deposits</span><strong>{money.format(tenants.reduce((sum,tenant)=>sum+tenant.security,0))}</strong></div><div><span>First-month (prorated)</span><strong>{money.format(tenants.reduce((sum,tenant)=>sum+tenant.firstMonthRent,0))}</strong></div><div><span>This month’s rent</span><strong>{money.format(metrics.recurringExpected)}</strong></div><footer><span>Total tracked</span><strong>{money.format(metrics.expected)}</strong></footer></article><article className="rent-note"><span>₹</span><p><strong>Made for split payments.</strong> Record any number of receipts against one tenant; RentWise applies them oldest-due-first and keeps every balance exact.</p></article></aside>
    </section></div>;
}
