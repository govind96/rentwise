'use client';

import { useEffect, useRef, useState } from 'react';
import { NAV_ICONS, NavIcon, type View } from '../shared';

const primary: [View, string][] = [['overview', 'Today'], ['property', 'Property'], ['tenants', 'Residents'], ['rent', 'Rent']];
const secondary: [View, string][] = [['bookings', 'Bookings & exits'], ['finance', 'Expenses'], ['documents', 'Documents'], ['maintenance', 'Repairs']];

export default function MobileNavigation({ view, onView }: { view: View; onView: (view: View) => void }) {
  const [open, setOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!nav.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const choose = (next: View) => { setOpen(false); onView(next); };
  return <nav ref={nav} className="mobile-nav bottom-dock" aria-label="Mobile workspace" onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); nav.current?.querySelector<HTMLButtonElement>('[aria-controls]')?.focus(); } }}>
    {primary.map(([id, label]) => <button type="button" key={id} aria-current={view === id ? 'page' : undefined} className={view === id ? 'active' : ''} onClick={() => choose(id)}><NavIcon paths={NAV_ICONS[id]} /><span>{label}</span></button>)}
    <button type="button" className={secondary.some(([id]) => id === view) ? 'active' : ''} aria-expanded={open} aria-controls="mobile-more" onClick={() => setOpen(!open)}><span className="more-symbol" aria-hidden="true">•••</span><span>More</span></button>
    {open && <div id="mobile-more" className="mobile-more"><p>More in your workspace</p>{secondary.map(([id, label]) => <button type="button" key={id} aria-current={view === id ? 'page' : undefined} className={view === id ? 'active' : ''} onClick={() => choose(id)}><NavIcon paths={NAV_ICONS[id]} /><span>{label}</span><span aria-hidden="true">→</span></button>)}</div>}
  </nav>;
}
