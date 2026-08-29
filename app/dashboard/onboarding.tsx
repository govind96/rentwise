'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import BrandMark from '../components/BrandMark';

export type SharingPlan = { occupancy: 1 | 2 | 3 | 4 | 6; rooms: number };
export type PropertyPreset = 'classic-pg' | 'student-hostel' | 'co-living';

export type PropertyDraft = {
  name: string;
  address: string;
  city: string;
  type: 'Paying guest' | 'Hostel' | 'Co-living' | 'Independent rooms';
  audience: 'Women' | 'Men' | 'Co-living';
  layoutMode: 'Uniform rooms' | 'Mixed sharing';
  rooms: number;
  bedsPerRoom: number;
  roomMix: SharingPlan[];
  startingRoom: number;
  floors: number;
  rent: number;
  security: number;
  rentDueDay: number;
  graceDays: number;
  lateFee: number;
  amenities: string[];
  mealPlan: 'Included' | 'Optional add-on' | 'Not offered';
  electricityPlan: 'Included in rent' | 'Metered separately' | 'Fixed monthly charge';
  climatePlan: 'Non-AC' | 'AC' | 'Mixed AC & non-AC';
  bathroomPlan: 'Attached' | 'Shared' | 'Mixed';
  noticeDays: number;
  agreementRequired: boolean;
  verificationRequired: boolean;
};

export function roomOccupancies(property: Pick<PropertyDraft, 'layoutMode' | 'rooms' | 'bedsPerRoom' | 'roomMix'>) {
  if (property.layoutMode === 'Uniform rooms') return Array.from({ length: property.rooms }, () => property.bedsPerRoom);
  return property.roomMix.flatMap((plan) => Array.from({ length: plan.rooms }, () => plan.occupancy));
}

const amenities = ['Wi-Fi', 'Meals', 'Laundry', 'Power backup', 'Housekeeping', 'CCTV', 'Parking', 'Air conditioning', 'Attached bathroom', 'RO water', 'Biometric entry', 'Common kitchen'];
const steps = [
  { label: 'Basics', hint: 'Name and location' },
  { label: 'Layout', hint: 'Sharing and beds' },
  { label: 'Collection', hint: 'Rent defaults' },
  { label: 'Operations', hint: 'Services and policy' },
  { label: 'Review', hint: 'Ready to create' },
];

const baseDraft: PropertyDraft = {
  name: '', address: '', city: '', type: 'Paying guest', audience: 'Women',
  layoutMode: 'Uniform rooms', rooms: 10, bedsPerRoom: 2,
  roomMix: [{ occupancy: 1, rooms: 2 }, { occupancy: 2, rooms: 6 }, { occupancy: 3, rooms: 4 }, { occupancy: 4, rooms: 0 }, { occupancy: 6, rooms: 0 }],
  startingRoom: 1, floors: 3, rent: 3000, security: 3000,
  rentDueDay: 5, graceDays: 3, lateFee: 250, amenities: ['Wi-Fi', 'Housekeeping', 'CCTV'],
  mealPlan: 'Included', electricityPlan: 'Metered separately', climatePlan: 'Mixed AC & non-AC', bathroomPlan: 'Mixed',
  noticeDays: 30, agreementRequired: true, verificationRequired: true,
};

const presetDrafts: Record<PropertyPreset, Partial<PropertyDraft>> = {
  'classic-pg': {},
  'student-hostel': {
    type: 'Hostel', audience: 'Men', layoutMode: 'Mixed sharing', floors: 4,
    roomMix: [{ occupancy: 1, rooms: 0 }, { occupancy: 2, rooms: 0 }, { occupancy: 3, rooms: 0 }, { occupancy: 4, rooms: 6 }, { occupancy: 6, rooms: 4 }],
    rent: 6500, security: 6500, amenities: ['Wi-Fi', 'Meals', 'Laundry', 'Power backup', 'Housekeeping', 'CCTV', 'RO water'],
    mealPlan: 'Included', electricityPlan: 'Included in rent', climatePlan: 'Non-AC', bathroomPlan: 'Shared',
  },
  'co-living': {
    type: 'Co-living', audience: 'Co-living', layoutMode: 'Mixed sharing', floors: 5,
    roomMix: [{ occupancy: 1, rooms: 6 }, { occupancy: 2, rooms: 8 }, { occupancy: 3, rooms: 0 }, { occupancy: 4, rooms: 0 }, { occupancy: 6, rooms: 0 }],
    rent: 10500, security: 21000, amenities: ['Wi-Fi', 'Laundry', 'Power backup', 'Housekeeping', 'CCTV', 'Parking', 'Air conditioning', 'Attached bathroom', 'Common kitchen'],
    mealPlan: 'Optional add-on', electricityPlan: 'Metered separately', climatePlan: 'Mixed AC & non-AC', bathroomPlan: 'Attached',
  },
};

function draftForPreset(preset: PropertyPreset): PropertyDraft {
  const configured = presetDrafts[preset];
  return {
    ...baseDraft,
    ...configured,
    amenities: [...(configured.amenities ?? baseDraft.amenities)],
    roomMix: (configured.roomMix ?? baseDraft.roomMix).map((plan) => ({ ...plan })),
  };
}

function initials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PG';
}

export default function PropertyOnboarding({ existingNames, onClose, onCreated, preset = 'classic-pg' }: { existingNames: string[]; onClose: () => void; onCreated: (property: PropertyDraft) => void; preset?: PropertyPreset }) {
  const dialogRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<PropertyDraft>(() => draftForPreset(preset));
  const occupancies = useMemo(() => roomOccupancies(draft), [draft]);
  const totalRooms = occupancies.length;
  const totalBeds = occupancies.reduce((sum, occupancy) => sum + occupancy, 0);
  const roomPreview = useMemo(() => occupancies.slice(0, 6).map((beds, index) => ({ room: draft.startingRoom + index, beds })), [draft.startingRoom, occupancies]);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    const frame = window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('.onboarding-step input, .onboarding-step select, .onboarding-step h1')?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter((item) => item.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKeyDown); previouslyFocused?.focus(); };
  }, []);

  function update<K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function updateMix(index: number, rooms: number) {
    update('roomMix', draft.roomMix.map((plan, planIndex) => planIndex === index ? { ...plan, rooms: Math.min(40, Math.max(0, rooms)) } : plan));
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
    if (step === 1 && (!totalRooms || !totalBeds)) return setError('Add at least one room and one rentable bed.');
    if (step === 2 && draft.rent <= 0) return setError('Add the default monthly rent to continue.');
    if (step < steps.length - 1) setStep((current) => current + 1);
    else onCreated({ ...draft, name: draft.name.trim(), address: draft.address.trim(), city: draft.city.trim() });
  }

  return (
    <div className="modal-layer onboarding-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="property-onboarding" role="dialog" aria-modal="true" aria-labelledby="property-onboarding-title">
        <aside className="onboarding-rail">
          <button className="onboarding-brand" type="button" onClick={onClose}><BrandMark /><strong>RentWise</strong></button>
          <div><p className="overline">PROPERTY SETUP</p><h2>Set up how your property runs.</h2><p>Add its rooms, beds, services, rent defaults and resident policies.</p></div>
          <ol>{steps.map((item, index) => <li key={item.label} className={index === step ? 'active' : index < step ? 'done' : ''}><span>{index < step ? '✓' : index + 1}</span><p><strong>{item.label}</strong><small>{item.hint}</small></p></li>)}</ol>
          <p className="onboarding-save">Owner account · Changes saved automatically</p>
        </aside>

        <div ref={mainRef} className="onboarding-main">
          <button className="onboarding-close" type="button" aria-label="Close property setup" onClick={onClose}>×</button>
          <div className="mobile-step"><span>Step {step + 1} of {steps.length}</span><strong>{steps[step].label}</strong><i><b style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></i></div>
          <form onSubmit={advance}>
            {step === 0 && <div className="onboarding-step">
              <header><p className="overline">THE BASICS</p><h1 id="property-onboarding-title" tabIndex={-1}>Tell us about the property.</h1><span>This identity appears across the owner workspace, receipts and tenant communication.</span></header>
              <label>Property name<input autoFocus required value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Sunshine Ladies PG" /></label>
              <div className="form-row"><label>Property type<select value={draft.type} onChange={(event) => update('type', event.target.value as PropertyDraft['type'])}><option>Paying guest</option><option>Hostel</option><option>Co-living</option><option>Independent rooms</option></select></label><label>Occupancy type<select value={draft.audience} onChange={(event) => update('audience', event.target.value as PropertyDraft['audience'])}><option>Women</option><option>Men</option><option>Co-living</option></select></label></div>
              <label>Street address<input required value={draft.address} onChange={(event) => update('address', event.target.value)} placeholder="Building, street and locality" /></label>
              <div className="form-row"><label>City<input required value={draft.city} onChange={(event) => update('city', event.target.value)} placeholder="e.g. Bengaluru" /></label><label>Number of floors<input type="number" min="1" max="30" required value={draft.floors} onChange={(event) => update('floors', Math.min(30, Math.max(1, Number(event.target.value))))} /></label></div>
            </div>}

            {step === 1 && <div className="onboarding-step">
              <header><p className="overline">ROOM PLAN</p><h1 id="property-onboarding-title" tabIndex={-1}>Map every sharing type.</h1><span>Use one standard layout or mix single, double, triple and dorm-style rooms in the same property.</span></header>
              <div className="layout-mode" role="group" aria-label="Room layout type"><button type="button" className={draft.layoutMode === 'Uniform rooms' ? 'selected' : ''} aria-pressed={draft.layoutMode === 'Uniform rooms'} onClick={() => update('layoutMode', 'Uniform rooms')}><strong>Standard layout</strong><small>Every room has the same beds</small></button><button type="button" className={draft.layoutMode === 'Mixed sharing' ? 'selected' : ''} aria-pressed={draft.layoutMode === 'Mixed sharing'} onClick={() => update('layoutMode', 'Mixed sharing')}><strong>Mixed sharing</strong><small>Combine 1, 2, 3, 4 and 6 sharing</small></button></div>
              {draft.layoutMode === 'Uniform rooms' ? <div className="form-row three"><label>Number of rooms<input type="number" min="1" max="80" required value={draft.rooms} onChange={(event) => update('rooms', Math.min(80, Math.max(1, Number(event.target.value))))} /></label><label>Beds per room<input type="number" min="1" max="8" required value={draft.bedsPerRoom} onChange={(event) => update('bedsPerRoom', Math.min(8, Math.max(1, Number(event.target.value))))} /></label><label>First room number<input type="number" min="1" max="999" required value={draft.startingRoom} onChange={(event) => update('startingRoom', Math.max(1, Number(event.target.value)))} /></label></div> : <><div className="sharing-grid">{draft.roomMix.map((plan, index) => <label key={plan.occupancy}><span><strong>{plan.occupancy === 1 ? 'Single' : `${plan.occupancy} sharing`}</strong><small>{plan.occupancy === 6 ? 'Dorm style' : `${plan.occupancy} bed${plan.occupancy > 1 ? 's' : ''} per room`}</small></span><input aria-label={`${plan.occupancy} sharing rooms`} type="number" min="0" max="40" value={plan.rooms} onChange={(event) => updateMix(index, Number(event.target.value))} /></label>)}</div><label>First room number<input type="number" min="1" max="999" required value={draft.startingRoom} onChange={(event) => update('startingRoom', Math.max(1, Number(event.target.value)))} /></label></>}
              <div className="layout-preview"><div><span>Inventory preview · {draft.floors} floors</span><strong>{totalRooms} rooms · {totalBeds} beds</strong></div><div className="preview-rooms">{roomPreview.map(({ room, beds }) => <article key={room}><span>Room {room} · {beds === 1 ? 'single' : `${beds} sharing`}</span><p>{Array.from({ length: beds }, (_, index) => <i key={index}>{String.fromCharCode(65 + index)}</i>)}</p></article>)}{totalRooms > 6 && <article className="more"><strong>+{totalRooms - 6}</strong><span>more rooms</span></article>}</div></div>
              <fieldset><legend>Included amenities <small>Choose all that apply</small></legend><div className="amenity-grid">{amenities.map((item) => <button key={item} type="button" className={draft.amenities.includes(item) ? 'selected' : ''} aria-pressed={draft.amenities.includes(item)} onClick={() => toggleAmenity(item)}><i>{draft.amenities.includes(item) ? '✓' : '+'}</i>{item}</button>)}</div></fieldset>
            </div>}

            {step === 2 && <div className="onboarding-step">
              <header><p className="overline">COLLECTION RULES</p><h1 id="property-onboarding-title" tabIndex={-1}>Set sensible rent defaults.</h1><span>These become the starting values for new allotments and can still be changed resident by resident.</span></header>
              <div className="form-row"><label>Monthly rent per bed (₹)<input type="number" min="1" inputMode="numeric" required value={draft.rent} onChange={(event) => update('rent', Math.max(0, Number(event.target.value)))} /></label><label>Default security deposit (₹)<input type="number" min="0" inputMode="numeric" required value={draft.security} onChange={(event) => update('security', Math.max(0, Number(event.target.value)))} /></label></div>
              <div className="form-row three"><label>Rent due day<input type="number" min="1" max="28" required value={draft.rentDueDay} onChange={(event) => update('rentDueDay', Math.min(28, Math.max(1, Number(event.target.value))))} /></label><label>Grace period<input type="number" min="0" max="15" required value={draft.graceDays} onChange={(event) => update('graceDays', Math.min(15, Math.max(0, Number(event.target.value))))} /></label><label>Late fee (₹)<input type="number" min="0" inputMode="numeric" required value={draft.lateFee} onChange={(event) => update('lateFee', Math.max(0, Number(event.target.value)))} /></label></div>
              <div className="collection-preview"><span>Monthly collection potential</span><strong>₹{(draft.rent * totalBeds).toLocaleString('en-IN')}</strong><p>If all {totalBeds} beds are occupied · rent due on day {draft.rentDueDay}{draft.graceDays ? ` · ${draft.graceDays}-day grace period` : ''}</p></div>
              <p className="setup-note"><i>✦</i><span><strong>Prorating is automatic.</strong> RentWise calculates the exact first-month amount from each resident’s move-in date.</span></p>
            </div>}

            {step === 3 && <div className="onboarding-step">
              <header><p className="overline">OPERATING PROFILE</p><h1 id="property-onboarding-title" tabIndex={-1}>Capture how the PG runs.</h1><span>These defaults keep staff, tenants and future agreements aligned. They can be changed later.</span></header>
              <div className="operation-grid"><label>Meal plan<select value={draft.mealPlan} onChange={(event) => update('mealPlan', event.target.value as PropertyDraft['mealPlan'])}><option>Included</option><option>Optional add-on</option><option>Not offered</option></select></label><label>Electricity billing<select value={draft.electricityPlan} onChange={(event) => update('electricityPlan', event.target.value as PropertyDraft['electricityPlan'])}><option>Included in rent</option><option>Metered separately</option><option>Fixed monthly charge</option></select></label><label>Room climate<select value={draft.climatePlan} onChange={(event) => update('climatePlan', event.target.value as PropertyDraft['climatePlan'])}><option>Non-AC</option><option>AC</option><option>Mixed AC & non-AC</option></select></label><label>Bathrooms<select value={draft.bathroomPlan} onChange={(event) => update('bathroomPlan', event.target.value as PropertyDraft['bathroomPlan'])}><option>Attached</option><option>Shared</option><option>Mixed</option></select></label></div>
              <label>Default notice period<div className="input-suffix"><input type="number" min="0" max="180" required value={draft.noticeDays} onChange={(event) => update('noticeDays', Math.min(180, Math.max(0, Number(event.target.value))))} /><span>days</span></div></label>
              <fieldset><legend>Move-in checklist <small>Requirements vary locally</small></legend><div className="policy-checks"><button type="button" aria-pressed={draft.agreementRequired} className={draft.agreementRequired ? 'selected' : ''} onClick={() => update('agreementRequired', !draft.agreementRequired)}><i>{draft.agreementRequired ? '✓' : '+'}</i><span><strong>Rental agreement</strong><small>Track a signed agreement for each resident</small></span></button><button type="button" aria-pressed={draft.verificationRequired} className={draft.verificationRequired ? 'selected' : ''} onClick={() => update('verificationRequired', !draft.verificationRequired)}><i>{draft.verificationRequired ? '✓' : '+'}</i><span><strong>Tenant verification</strong><small>Collect ID and track local verification status</small></span></button></div></fieldset>
              <p className="setup-note neutral"><i>i</i><span><strong>Designed to stay flexible.</strong> Local registration, police-verification and safety requirements differ by state and city, so RentWise tracks your chosen process without presenting it as legal advice.</span></p>
            </div>}

            {step === 4 && <div className="onboarding-step review-step">
              <header><p className="overline">READY TO CREATE</p><h1 id="property-onboarding-title" tabIndex={-1}>Your property workspace is ready.</h1><span>Review the operating defaults below. You can allot the first resident immediately after creating it.</span></header>
              <div className="review-property"><span>{initials(draft.name)}</span><div><strong>{draft.name || 'Your property'}</strong><p>{draft.address}, {draft.city}</p><small>{draft.audience} · {draft.type}</small></div></div>
              <div className="review-grid"><article><span>Inventory</span><strong>{totalRooms} rooms</strong><small>{totalBeds} beds across {draft.floors} floors</small></article><article><span>Rent default</span><strong>₹{draft.rent.toLocaleString('en-IN')}</strong><small>per bed monthly</small></article><article><span>Deposit</span><strong>₹{draft.security.toLocaleString('en-IN')}</strong><small>default per resident</small></article><article><span>Collection</span><strong>Due day {draft.rentDueDay}</strong><small>{draft.graceDays}-day grace · ₹{draft.lateFee.toLocaleString('en-IN')} late fee</small></article></div>
              <div className="review-operations"><div><span>Services</span><strong>{draft.mealPlan} meals · {draft.electricityPlan}</strong></div><div><span>Resident policy</span><strong>{draft.noticeDays}-day notice · {draft.agreementRequired ? 'Agreement tracked' : 'Agreement optional'} · {draft.verificationRequired ? 'Verification tracked' : 'Verification optional'}</strong></div></div>
              <div className="review-amenities"><span>Amenities</span><p>{draft.amenities.length ? draft.amenities.map((item) => <i key={item}>{item}</i>) : <em>None selected</em>}</p></div>
              <div className="after-create"><p className="overline">WHAT HAPPENS NEXT</p><div><span>1</span><p><strong>Rooms and beds are created</strong><small>Your mixed-sharing plan opens as a clean, vacant floor plan.</small></p></div><div><span>2</span><p><strong>Allot your first resident</strong><small>Rent, deposit and operating defaults are already filled in.</small></p></div></div>
            </div>}

            {error && <p className="auth-error" role="alert">{error}</p>}
            <footer className="onboarding-actions"><button type="button" className="quiet-button" onClick={() => step ? setStep((current) => current - 1) : onClose()}>{step ? '← Back' : 'Cancel'}</button><button type="submit" className="main-button">{step === steps.length - 1 ? 'Create property →' : 'Continue →'}</button></footer>
          </form>
        </div>
      </section>
    </div>
  );
}
