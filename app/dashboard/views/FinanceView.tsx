'use client';

import { useMemo, useState } from 'react';
import { money, type Expense } from '../shared';

export type MonthlyCollection = { month: string; amount: number };

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function labelFor(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${MONTH_NAMES[(monthNumber || 1) - 1]} ${year}`;
}

export function FinanceView({ expenses, monthlyCollections, onAdd, onDelete }: { expenses: Expense[]; monthlyCollections: MonthlyCollection[]; onAdd: () => void; onDelete: (id: number) => void }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  // Every month that has either expenses or confirmed collections, newest first.
  const months = useMemo(() => {
    const set = new Set<string>(monthlyCollections.map((row) => row.month));
    for (const item of expenses) set.add(item.date.slice(0, 7));
    set.add(thisMonth);
    return [...set].sort().reverse().slice(0, 12);
  }, [expenses, monthlyCollections, thisMonth]);
  const [month, setMonth] = useState(thisMonth);
  const activeMonth = months.includes(month) ? month : thisMonth;
  const monthExpenses = expenses.filter((item) => item.date.startsWith(activeMonth));
  const spent = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const collected = monthlyCollections.find((row) => row.month === activeMonth)?.amount ?? 0;
  const net = collected - spent;
  const byCategory = [...monthExpenses.reduce((map, item) => map.set(item.category, (map.get(item.category) ?? 0) + item.amount), new Map<Expense['category'], number>()).entries()].sort((a, b) => b[1] - a[1]);
  const monthIndex = months.indexOf(activeMonth);
  const hasEarlier = monthIndex < months.length - 1;
  const hasLater = monthIndex > 0;
  return <div className="view-stack"><section className="finance-hero"><div><p className="overline">MONTHLY OPERATING VIEW</p>
      <div className="month-stepper" role="group" aria-label="Choose month">
        <button type="button" aria-label="Earlier month" disabled={!hasEarlier} onClick={() => hasEarlier && setMonth(months[monthIndex + 1])}>←</button>
        <strong>{labelFor(activeMonth)}</strong>
        <button type="button" aria-label="Later month" disabled={!hasLater} onClick={() => hasLater && setMonth(months[monthIndex - 1])}>→</button>
      </div>
      <h2 className={net >= 0 ? '' : 'warn'}>{money.format(net)}</h2><span>estimated net cash flow{activeMonth !== thisMonth ? ' · closed month' : ''}</span></div>
    <div className="finance-kpis"><article><span>Collections</span><strong>{money.format(collected)}</strong><small>Confirmed receipts</small></article><article><span>Expenses</span><strong>{money.format(spent)}</strong><small>{monthExpenses.length} entries</small></article><article><span>Margin</span><strong>{collected ? `${Math.round(net / collected * 100)}%` : '—'}</strong><small>Before tax and accruals</small></article></div></section>
    <section className="finance-layout"><article className="surface expense-ledger"><div className="surface-head"><div><p className="overline">EXPENSE LEDGER</p><h2>Operating expenses · {labelFor(activeMonth)}</h2></div><button className="main-button" onClick={onAdd}>＋ Add expense</button></div>{monthExpenses.length ? <div className="expense-list">{monthExpenses.map((item) => <article key={item.id}><span className={`expense-icon ${item.category.toLowerCase()}`}>{item.category.slice(0, 1)}</span><div><strong>{item.note || item.category}</strong><small>{item.vendor || 'No vendor'} · {new Date(`${item.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</small></div><b>{money.format(item.amount)}</b><button className="icon-button danger" aria-label={`Delete ${item.note || item.category} expense`} title="Delete expense" onClick={() => onDelete(item.id)}>⌫</button></article>)}</div> : <div className="empty"><strong>No expenses in {labelFor(activeMonth)}</strong><span>Add utilities, food, salaries and repairs to see realistic property performance.</span></div>}</article>
      <aside className="surface category-breakdown"><div className="surface-head"><div><p className="overline">COST MIX</p><h2>{labelFor(activeMonth)}</h2></div></div>{byCategory.length ? byCategory.map(([category, amount]) => <div key={category}><p><span>{category}</span><strong>{money.format(amount)}</strong></p><i><b style={{ width: `${spent ? Math.round(amount / spent * 100) : 0}%` }} /></i></div>) : <div className="empty compact"><strong>No costs this month</strong><span>{labelFor(activeMonth)} is clear.</span></div>}<footer><p>Use this as an operational view, not statutory accounting or tax advice.</p></footer></aside>
    </section></div>;
}
