'use client';

import { FormEvent, useMemo, useState } from 'react';

export default function Onboarding({ email, onCreated }: { email: string; onCreated: (propertyId: number) => void }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [rooms, setRooms] = useState(10);
  const [bedsPerRoom, setBedsPerRoom] = useState(2);
  const [rent, setRent] = useState(3000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const totalBeds = useMemo(() => Math.max(0, rooms) * Math.max(0, bedsPerRoom), [rooms, bedsPerRoom]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, address, rooms, bedsPerRoom, rent }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; propertyId?: number };
      if (!response.ok) { setError(data.error ?? 'Could not create the property'); setBusy(false); return; }
      onCreated(Number(data.propertyId) || 0);
    } catch {
      setError('Network hiccup — try again');
      setBusy(false);
    }
  }

  return (
    <div className="onboard">
      <section className="onboard-card">
        <p className="overline">New workspace{email ? ` · ${email}` : ''}</p>
        <h1>Set up your property</h1>
        <p className="onboard-copy">Rooms, beds and rents — thirty seconds now saves your ledger forever. The copilot handles prorating and balances from here.</p>
        <form onSubmit={create}>
          <div className="form-row">
            <label>Property name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Sunshine Ladies PG" /></label>
            <label>Address or city<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Kalyan Nagar, Bengaluru" /></label>
          </div>
          <div className="form-row three">
            <label>Rooms<input type="number" min="1" max="60" required value={rooms} onChange={(event) => setRooms(Number(event.target.value))} /></label>
            <label>Beds per room<input type="number" min="1" max="8" required value={bedsPerRoom} onChange={(event) => setBedsPerRoom(Number(event.target.value))} /></label>
            <label>Rent per bed (₹)<input type="number" min="0" required value={rent} onChange={(event) => setRent(Number(event.target.value))} /></label>
          </div>
          <div className="calculation"><span>Floor plan preview</span><strong>{totalBeds} beds</strong><small>{name || 'Your property'} · {rooms || 0} rooms × {bedsPerRoom || 0} beds · ₹{rent.toLocaleString('en-IN')}/bed monthly</small></div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="main-button full" disabled={busy} type="submit">{busy ? 'Building your floor plan…' : 'Create property →'}</button>
        </form>
        <p className="auth-foot">You can adjust per-bed rents and add more beds as your property grows.</p>
      </section>
    </div>
  );
}
