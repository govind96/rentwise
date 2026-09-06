'use client';

import { useState } from 'react';
import { type RoomInventory, type Tenant } from '../shared';

export default function OccupancyMap({ inventory, tenants, onTenant, onAdd }: {
  inventory: RoomInventory; tenants: Tenant[]; onTenant: (id: number) => void; onAdd: () => void;
}) {
  const [vacanciesOnly, setVacanciesOnly] = useState(false);
  const rooms = inventory.filter(([room, beds]) => !vacanciesOnly || beds.some((bed) => !tenants.some((tenant) => tenant.room === room && tenant.bed === bed)));
  return <section className="surface occupancy-map" aria-label="Interactive bed map">
    <div className="surface-head"><div><p className="overline">YOUR HOME AT A GLANCE</p><h2>A place for every resident.</h2></div>
      <button className="quiet-button" aria-pressed={vacanciesOnly} onClick={() => setVacanciesOnly(!vacanciesOnly)}>{vacanciesOnly ? 'Show all rooms' : 'Find vacant beds'}</button>
    </div>
    <p className="map-help">Select an occupied bed to see its resident. Empty beds open the property inventory for allotment.</p>
    <div className="map-legend"><span><i className="filled" />Occupied</span><span><i />Vacant</span></div>
    <div className="map-rooms">{rooms.map(([room, beds]) => <article key={room}><h3>Room {room}</h3><div>{beds.map((bed) => {
      const resident = tenants.find((tenant) => tenant.room === room && tenant.bed === bed);
      return <button key={bed} className={resident ? 'filled' : ''} aria-label={`Room ${room}, bed ${bed}: ${resident ? resident.name : 'vacant, open property inventory'}`} title={resident?.name || 'Open property inventory'} onClick={() => resident ? onTenant(resident.id) : onAdd()}><span>{bed}</span><small>{resident ? resident.name.split(' ')[0] : 'Vacant'}</small></button>;
    })}</div></article>)}</div>
    {rooms.length === 0 && <p className="map-help">Every bed is occupied. Switch to all rooms to see your residents.</p>}
  </section>;
}
