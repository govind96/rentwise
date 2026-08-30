'use client';
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useEffect, useState } from 'react';
import BrandMark from '../components/BrandMark';
import ThemeToggle from '../components/ThemeToggle';
import { authFetch, getSupabaseClient } from '../lib/supabase-client';

type Portal = {
  resident: { name: string; email: string; property: string; room: string; bed: string; monthlyRent: number };
  balance: number;
  charges: Array<{ id: number; kind: string; period: string; amount: number; due_on: string; outstanding: number }>;
  payments: Array<{ id: number; amount: number; paid_on: string; mode: string; reference: string | null; receipt_number: string | null }>;
  documents: Array<{ id: number; kind: string; label: string; original_name: string | null; verification_status: string; created_at: string }>;
  maintenance: Array<{ id: number; title: string; category: string; priority: string; status: string; created_at: string }>;
};

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const label = (kind: string) => ({ monthly_rent: 'Monthly rent', prorated_rent: 'Move-in rent', security: 'Security deposit' }[kind] || kind.replaceAll('_', ' '));

export default function TenantPortal() {
  const [portal, setPortal] = useState<Portal | null>(null); const [state, setState] = useState<'loading' | 'ready' | 'signed-out' | 'error'>('loading'); const [message, setMessage] = useState('');
  async function load() {
    setState('loading'); const response = await authFetch('/api/tenant');
    if (response.status === 401) { setState('signed-out'); return; }
    if (!response.ok) { setMessage((await response.json().catch(() => ({})) as { error?: string }).error || 'We could not open your portal.'); setState('error'); return; }
    setPortal(await response.json() as Portal); setState('ready');
  }
  useEffect(() => { queueMicrotask(() => { void load(); }); }, []);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(''); const form = new FormData(event.currentTarget); const response = await authFetch('/api/tenant', { method: 'POST', body: form });
    if (!response.ok) { setMessage((await response.json().catch(() => ({})) as { error?: string }).error || 'Upload failed.'); return; }
    event.currentTarget.reset(); setMessage('Document shared with your property manager.'); void load();
  }
  async function maintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(''); const form = new FormData(event.currentTarget); const response = await authFetch('/api/tenant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) });
    if (!response.ok) { setMessage((await response.json().catch(() => ({})) as { error?: string }).error || 'Request failed.'); return; }
    event.currentTarget.reset(); setMessage('Maintenance request sent.'); void load();
  }
  async function signOut() { const client = await getSupabaseClient(); await client.auth.signOut(); window.location.assign('/'); }
  if (state === 'loading') return <main className="tenant-shell tenant-loading"><BrandMark /><span className="gate-spinner" /><p>Opening your resident portal…</p></main>;
  if (state === 'signed-out') return <main className="tenant-shell tenant-empty"><BrandMark /><p className="overline">RESIDENT ACCESS</p><h1>Your RentWise home</h1><p>Sign in with the same email your property manager added to your tenancy.</p><a className="main-button" href="/login">Sign in or create account</a><a className="quiet-button" href="/#top">Back to RentWise</a></main>;
  if (state === 'error' || !portal) return <main className="tenant-shell tenant-empty"><BrandMark /><h1>We couldn’t open your portal</h1><p>{message}</p><a className="quiet-button" href="/login">Return to sign in</a></main>;
  return <main className="tenant-shell"><header className="tenant-nav"><a href="/#top" className="land-brand"><BrandMark /><strong>RentWise</strong></a><span>Resident portal</span><ThemeToggle compact /><button className="quiet-button compact" onClick={() => void signOut()}>Sign out</button></header><section className="tenant-hero"><div><p className="overline">YOUR HOME</p><h1>Hi, {portal.resident.name.split(' ')[0]}.</h1><p>{portal.resident.property} · Room {portal.resident.room}, Bed {portal.resident.bed}</p></div><div className="tenant-balance"><span>Outstanding balance</span><strong>{inr.format(portal.balance)}</strong><small>{portal.balance ? 'Pay or share proof with your property manager.' : 'Your account is currently settled.'}</small></div></section><section className="tenant-grid"><article className="tenant-card"><p className="overline">RENT & DEPOSITS</p><h2>{inr.format(portal.resident.monthlyRent)} <small>monthly rent</small></h2><div className="tenant-list">{portal.charges.slice(0, 5).map((charge) => <div key={charge.id}><span><b>{label(charge.kind)}</b><small>Due {charge.due_on}</small></span><em className={charge.outstanding ? 'due' : 'ok'}>{charge.outstanding ? `${inr.format(charge.outstanding)} due` : 'Settled'}</em></div>) || <p>No charges yet.</p>}</div></article><article className="tenant-card"><p className="overline">RECEIPTS</p><h2>Your payment history</h2><div className="tenant-list">{portal.payments.slice(0, 5).map((payment) => <div key={payment.id}><span><b>{inr.format(payment.amount)} · {payment.mode}</b><small>{payment.paid_on}{payment.receipt_number ? ` · ${payment.receipt_number}` : ''}</small></span><em className="ok">Recorded</em></div>) || <p>No payment receipts yet.</p>}</div></article><article className="tenant-card"><p className="overline">SHARE A DOCUMENT</p><h2>Docs & payment proof</h2><p>Share a KYC file, agreement, or payment screenshot. Your manager reviews it in RentWise.</p><form className="tenant-form" onSubmit={upload}><input name="label" required placeholder="What are you sharing?" /><select name="kind" defaultValue="other"><option value="identity">Identity document</option><option value="agreement">Agreement</option><option value="payment_proof">Payment proof</option><option value="other">Other document</option></select><input name="file" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" /><button className="main-button">Upload securely</button></form></article><article className="tenant-card"><p className="overline">MAINTENANCE</p><h2>Report an issue</h2><form className="tenant-form" onSubmit={maintenance}><input name="title" required placeholder="e.g. Bathroom tap is leaking" /><select name="category" defaultValue="general"><option value="plumbing">Plumbing</option><option value="electrical">Electrical</option><option value="cleaning">Cleaning</option><option value="general">General</option></select><select name="priority" defaultValue="normal"><option value="low">Low priority</option><option value="normal">Normal priority</option><option value="urgent">Urgent</option></select><button className="main-button">Send request</button></form><div className="tenant-list compact-list">{portal.maintenance.slice(0, 3).map((item) => <div key={item.id}><span><b>{item.title}</b><small>{item.category} · {item.created_at.slice(0, 10)}</small></span><em>{item.status.replace('-', ' ')}</em></div>)}</div></article></section>{message && <p className="tenant-toast" role="status">{message}</p>}</main>;
}
