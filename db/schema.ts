import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const owners = sqliteTable('owners', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  createdAt: text('created_at').notNull(),
});

export const properties = sqliteTable('properties', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: integer('owner_id').notNull().references(() => owners.id),
  name: text('name').notNull(),
  address: text('address'),
  createdAt: text('created_at').notNull(),
});

export const mvpState = sqliteTable('mvp_state', {
  id: integer('id').primaryKey(),
  payload: text('payload').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const beds = sqliteTable('beds', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').notNull().references(() => properties.id),
  roomNo: text('room_no').notNull(),
  bedNo: text('bed_no').notNull(),
  monthlyRent: integer('monthly_rent').notNull(),
  status: text('status', { enum: ['vacant', 'occupied'] }).notNull().default('vacant'),
}, (table) => [
  uniqueIndex('idx_beds_property_room_bed').on(table.propertyId, table.roomNo, table.bedNo),
  index('idx_beds_property_status').on(table.propertyId, table.status),
]);

export const tenancies = sqliteTable('tenancies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bedId: integer('bed_id').notNull().references(() => beds.id),
  tenantName: text('tenant_name').notNull(),
  phone: text('phone'),
  allotmentDate: text('allotment_date').notNull(),
  monthlyRent: integer('monthly_rent').notNull(),
  securityAmount: integer('security_amount').notNull(),
  firstMonthRent: integer('first_month_rent').notNull(),
  status: text('status', { enum: ['active', 'notice', 'closed'] }).notNull().default('active'),
}, (table) => [
  index('idx_tenancies_bed_status').on(table.bedId, table.status),
]);

export const charges = sqliteTable('charges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenancyId: integer('tenancy_id').notNull().references(() => tenancies.id),
  kind: text('kind', { enum: ['security', 'prorated_rent', 'monthly_rent'] }).notNull(),
  period: text('period').notNull(),
  amount: integer('amount').notNull(),
  dueOn: text('due_on').notNull(),
  status: text('status', { enum: ['due', 'partial', 'paid', 'waived'] }).notNull().default('due'),
}, (table) => [
  uniqueIndex('idx_charges_tenancy_kind_period').on(table.tenancyId, table.kind, table.period),
  index('idx_charges_tenancy_period').on(table.tenancyId, table.period),
  index('idx_charges_status_due').on(table.status, table.dueOn),
]);

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenancyId: integer('tenancy_id').notNull().references(() => tenancies.id),
  amount: integer('amount').notNull(),
  paidOn: text('paid_on').notNull(),
  mode: text('mode', { enum: ['UPI', 'Cash', 'Bank transfer'] }).notNull(),
  reference: text('reference'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_payments_tenancy_paid_on').on(table.tenancyId, table.paidOn),
]);
