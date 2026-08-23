'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

export type PropertyDraft = {
  name: string;
  address: string;
  city: string;
  type: 'Paying guest' | 'Hostel' | 'Co-living' | 'Independent rooms';
  audience: 'Women' | 'Men' | 'Co-living';
  rooms: number;
  bedsPerRoom: number;
  startingRoom: number;
  rent: number;
  security: number;
  rentDueDay: number;
  graceDays: number;
  lateFee: number;
  amenities: string[];
};

const amenities = ['Wi-Fi', 'Meals', 'Laundry', 'Power backup', 'Housekeeping', 'CCTV', 'Parking', 'Air conditioning'];
const steps = [
  { label: 'Basics', hint: 'Name and location' },
  { label: 'Layout', hint: 'Rooms and beds' },
  { label: 'Collection', hint: 'Rent defaults' },
  { label: 'Review', hint: 'Ready to create' },
];

export default function PropertyOnboarding({ existingNames, onClose, onCreated }: { existingNames: string[]; onClose: () => void; onCreated: (property: PropertyDraft) => void }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<PropertyDraft>({
    name: '', address: '', city: '', type: 'Paying guest', audience: 'Women',
    rooms: 10, bedsPerRoom: 2, startingRoom: 1, rent: 3000, security: 3000,
    rentDueDay: 5, graceDays: 3, lateFee: 250, amenities: ['Wi-Fi', 'Housekeeping', 'CCTV'],
  });
  const totalBeds = draft.rooms * draft.bedsPerRoom;
  const roomPreview = useMemo(() => Array.from({ length: Math.min(draft.rooms, 6) }, (_, index) => draft.startingRoom + index), [draft.rooms, draft.startingRoom]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  function update<K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function toggleAmenity(value: string) {
    update('amenities', draft.amenities.includes(value) ? draft.amenities.filter((item) => item !== value) : [...draft.amenities, value]);
  }

  function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 0) {
      if (!draft.name.trim() || !draft.address.trim() || !draft.city.trim()) return setError('Add a property name, address and city to continue.');
      if (existingNames.some((name) => name.toLowerCase() === draft.name.trim().toLowerCase())) return setError('A property with this name already exists.');
    }
    if (step === 1 && (!draft.rooms || !draft.bedsPerRoom)) return setError('Add at least one room and one bed per room.');
    if (step === 2 && draft.rent <= 0) return setError('Add the default monthly rent to continue.');
    if (step < steps.length - 1) setStep((current) => current + 1);
    else onCreated({ ...draft, name: draft.name.trim(), address: draft.address.trim(), city: draft.city.trim() });
  }

  return (
    <div className="modal-layer onboarding-layer" onMouseDown={onClose}>
      <section className="property-onboarding" role="dialog" aria-modal="true" aria-label="Add a new property" onMouseDown={(event) => event.stopPropagation()}>
        <aside className="onboarding-rail">
          <button className="onboarding-brand" type="button" onClick={onClose}><span>R</span><strong>RentWise</strong></button>
          <div>
            <p className="overline">PROPERTY SETUP</p>
            <h2>Build the operating system for your property.</h2>
            <p>We’ll create every room and bed, then apply your collection defaults. Tenants can be added right after.</p>
          </div>
          <ol>
            {steps.map((item, index) => <li key={item.label} className={index === step ? 'active' : index < step ? 'done' : ''}><span>{index < step ? '✓' : index + 1}</span><p><strong>{item.label}</strong><small>{item.hint}</small></p></li>)}
          </ol>
          <p className="onboarding-save">No account needed · Saved in this browser</p>
        </aside>

        <div className="onboarding-main">
          <button className="onboarding-close" type="button" aria-label="Close property setup" onClick={onClose}>×</button>
          <div className="mobile-step"><span>Step {step + 1} of {steps.length}</span><strong>{steps[step].label}</strong><i><b style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></i></div>
          <form onSubmit={advance}>
            {step === 0 && <div className="onboarding-step">
              <header><p className="overline">THE BASICS</p><h1>Tell us about the property.</h1><span>This is how it will appear across your dashboard, receipts and tenant communication.</span></header>
              <label>Property name<input autoFocus required value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Sunshine Ladies PG" /></label>
              <div className="form-row"><label>Property type<select value={draft.type} onChange={(event) => update('type', event.target.value as PropertyDraft['type'])}><option>Paying guest</option><option>Hostel</option><option>Co-living</option><option>Independent rooms</option></select></label><label>Occupancy type<select value={draft.audience} onChange={(event) => update('audience', event.target.value as PropertyDraft['audience'])}><option>Women</option><option>Men</option><option>Co-living</option></select></label></div>
              <label>Street address<input required value={draft.address} onChange={(event) => update('address', event.target.value)} placeholder="Building, street and locality" /></label>
              <label>City<input required value={draft.city} onChange={(event) => update('city', event.target.value)} placeholder="e.g. Bengaluru" /></label>
            </div>}

            {step === 1 && <div className="onboarding-step">
              <header><p className="overline">ROOM PLAN</p><h1>Create the room and bed inventory.</h1><span>Start with a standard layout. You can allot tenants and adjust individual rents afterward.</span></header>
              <div className="form-row three"><label>Number of rooms<input type="number" min="1" max="80" required value={draft.rooms} onChange={(event) => update('rooms', Math.max(1, Number(event.target.value)))} /></label><label>Beds per room<input type="number" min="1" max="8" required value={draft.bedsPerRoom} onChange={(event) => update('bedsPerRoom', Math.max(1, Number(event.target.value)))} /></label><label>First room number<input type="number" min="1" max="999" required value={draft.startingRoom} onChange={(event) => update('startingRoom', Math.max(1, Number(event.target.value)))} /></label></div>
              <div className="layout-preview"><div><span>Floor plan preview</span><strong>{draft.rooms} rooms · {totalBeds} beds</strong></div><div className="preview-rooms">{roomPreview.map((room) => <article key={room}><span>Room {room}</span><p>{Array.from({ length: draft.bedsPerRoom }, (_, index) => <i key={index}>{String.fromCharCode(65 + index)}</i>)}</p></article>)}{draft.rooms > 6 && <article className="more"><strong>+{draft.rooms - 6}</strong><span>more rooms</span></article>}</div></div>
              <fieldset><legend>Included amenities <small>Optional</small></legend><div className="amenity-grid">{amenities.map((item) => <button key={item} type="button" className={draft.amenities.includes(item) ? 'selected' : ''} onClick={() => toggleAmenity(item)}><i>{draft.amenities.includes(item) ? '✓' : '+'}</i>{item}</button>)}</div></fieldset>
            </div>}

            {step === 2 && <div className="onboarding-step">
              <header><p className="overline">COLLECTION RULES</p><h1>Set sensible rent defaults.</h1><span>These become the starting values for new allotments and can still be changed tenant by tenant.</span></header>
              <div className="form-row"><label>Monthly rent per bed (₹)<input autoFocus type="number" min="1" required value={draft.rent} onChange={(event) => update('rent', Math.max(0, Number(event.target.value)))} /></label><label>Default security deposit (₹)<input type="number" min="0" required value={draft.security} onChange={(event) => update('security', Math.max(0, Number(event.target.value)))} /></label></div>
              <div className="form-row three"><label>Rent due day<input type="number" min="1" max="28" required value={draft.rentDueDay} onChange={(event) => update('rentDueDay', Math.min(28, Math.max(1, Number(event.target.value))))} /></label><label>Grace period<input type="number" min="0" max="15" required value={draft.graceDays} onChange={(event) => update('graceDays', Math.min(15, Math.max(0, Number(event.target.value))))} /></label><label>Late fee (₹)<input type="number" min="0" required value={draft.lateFee} onChange={(event) => update('lateFee', Math.max(0, Number(event.target.value)))} /></label></div>
              <div className="collection-preview"><span>Monthly collection potential</span><strong>₹{(draft.rent * totalBeds).toLocaleString('en-IN')}</strong><p>If all {totalBeds} beds are occupied · rent due on day {draft.rentDueDay}{draft.graceDays ? ` · ${draft.graceDays}-day grace period` : ''}</p></div>
              <p className="setup-note"><i>✦</i><span><strong>Prorating is automatic.</strong> When you allot a tenant, RentWise calculates the exact first-month amount from their move-in date.</span></p>
            </div>}

            {step === 3 && <div className="onboarding-step review-step">
              <header><p className="overline">READY TO CREATE</p><h1>Your property workspace is ready.</h1><span>Review the defaults below. You can edit the property and allot the first tenant immediately after creating it.</span></header>
              <div className="review-property"><span>{draft.name.slice(0, 2).toUpperCase() || 'PG'}</span><div><strong>{draft.name || 'Your property'}</strong><p>{draft.address}, {draft.city}</p><small>{draft.audience} · {draft.type}</small></div></div>
              <div className="review-grid"><article><span>Inventory</span><strong>{draft.rooms} rooms</strong><small>{totalBeds} rentable beds</small></article><article><span>Rent default</span><strong>₹{draft.rent.toLocaleString('en-IN')}</strong><small>per bed monthly</small></article><article><span>Deposit</span><strong>₹{draft.security.toLocaleString('en-IN')}</strong><small>default per tenant</small></article><article><span>Collection</span><strong>Due day {draft.rentDueDay}</strong><small>{draft.graceDays}-day grace · ₹{draft.lateFee.toLocaleString('en-IN')} late fee</small></article></div>
              <div className="review-amenities"><span>Amenities</span><p>{draft.amenities.length ? draft.amenities.map((item) => <i key={item}>{item}</i>) : <em>None selected</em>}</p></div>
              <div className="after-create"><p className="overline">WHAT HAPPENS NEXT</p><div><span>1</span><p><strong>Rooms and beds are created</strong><small>Your property opens with a clean, vacant floor plan.</small></p></div><div><span>2</span><p><strong>Allot your first tenant</strong><small>Rent and deposit defaults are already filled in.</small></p></div></div>
            </div>}

            {error && <p className="auth-error" role="alert">{error}</p>}
            <footer className="onboarding-actions"><button type="button" className="quiet-button" onClick={() => step ? setStep((current) => current - 1) : onClose()}>{step ? '← Back' : 'Cancel'}</button><button type="submit" className="main-button">{step === steps.length - 1 ? `Create ${draft.name || 'property'} →` : 'Continue →'}</button></footer>
          </form>
        </div>
      </section>
    </div>
  );
}
