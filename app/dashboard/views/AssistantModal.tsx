'use client';

import { FormEvent, useState } from 'react';
import { balanceFor, money, type Summary, type Tenant, type View, type WorkOrder } from '../shared';

export function AssistantModal({ tenants, orders, metrics, availableBeds, propertyName, onClose, onView, onPay }: { tenants: Tenant[]; orders: WorkOrder[]; metrics: Summary; availableBeds: number; propertyName: string; onClose: () => void; onView: (view: View) => void; onPay: (id: number) => void }) {
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
  return <div className="modal-layer assistant-layer" onMouseDown={onClose}><section className="assistant-modal" role="dialog" aria-modal="true" aria-label="Ask RentWise" onMouseDown={(event) => event.stopPropagation()}><header><div className="assistant-brand"><span>✦</span><div><strong>Ask RentWise</strong><small>Quick answers from your records</small></div></div><button aria-label="Close" onClick={onClose}>×</button></header><form onSubmit={submit}><input autoFocus value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask about rent, tenants, rooms or maintenance…" /><button type="submit" aria-label="Ask">→</button></form>{answer ? <div className="assistant-answer"><span>✦</span><div><p>{answer}</p>{answerKind === 'dues' && pending.length > 0 && <div className="answer-rows">{pending.slice(0, 3).map((tenant) => <div key={tenant.id} className="answer-row"><p><strong>{tenant.name}</strong><span>Room {tenant.room} · Bed {tenant.bed}</span></p><b>{money.format(balanceFor(tenant))}</b><button onClick={() => onPay(tenant.id)}>Record</button></div>)}</div>}<div><button onClick={() => onView('rent')}>Open rent</button><button onClick={() => onView('property')}>View property</button></div></div></div> : <div className="suggestion-list"><p>Try asking</p>{['Who has the highest dues?', 'How many beds are vacant?', 'What maintenance needs attention?', 'Give me a portfolio summary'].map((item) => <button key={item} onClick={() => ask(item)}><span>{item}</span><b>↗</b></button>)}</div>}<footer><span>Quick answers</span><em>Drawn from your current records</em></footer></section></div>;
}
