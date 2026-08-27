import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const owners = sqliteTable('owners', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  platformUserId: text('platform_user_id').unique(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  createdAt: text('created_at').notNull(),
  lastSeenAt: text('last_seen_at'),
});

export const properties = sqliteTable('properties', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: integer('owner_id').notNull().references(() => owners.id),
  name: text('name').notNull(),
  address: text('address'),
  city: text('city'),
  propertyType: text('property_type'),
  audience: text('audience'),
  rentDueDay: integer('rent_due_day').notNull().default(5),
  graceDays: integer('grace_days').notNull().default(3),
  lateFee: integer('late_fee').notNull().default(0),
  defaultRent: integer('default_rent').notNull().default(0),
  defaultSecurity: integer('default_security').notNull().default(0),
  noticeDays: integer('notice_days').notNull().default(30),
  agreementRequired: integer('agreement_required', { mode: 'boolean' }).notNull().default(true),
  verificationRequired: integer('verification_required', { mode: 'boolean' }).notNull().default(true),
  amenitiesJson: text('amenities_json').notNull().default('[]'),
  mealPlan: text('meal_plan'),
  electricityPlan: text('electricity_plan'),
  climatePlan: text('climate_plan'),
  bathroomPlan: text('bathroom_plan'),
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
}, (table) => [
  index('idx_properties_owner').on(table.ownerId),
]);

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
  floorNo: text('floor_no'),
  status: text('status', { enum: ['vacant', 'reserved', 'occupied', 'maintenance'] }).notNull().default('vacant'),
}, (table) => [
  uniqueIndex('idx_beds_property_room_bed').on(table.propertyId, table.roomNo, table.bedNo),
  index('idx_beds_property_status').on(table.propertyId, table.status),
]);

export const tenancies = sqliteTable('tenancies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bedId: integer('bed_id').notNull().references(() => beds.id),
  tenantName: text('tenant_name').notNull(),
  phone: text('phone'),
  email: text('email'),
  occupation: text('occupation'),
  hometown: text('hometown'),
  emergencyName: text('emergency_name'),
  emergencyPhone: text('emergency_phone'),
  allotmentDate: text('allotment_date').notNull(),
  monthlyRent: integer('monthly_rent').notNull(),
  securityAmount: integer('security_amount').notNull(),
  firstMonthRent: integer('first_month_rent').notNull(),
  status: text('status', { enum: ['active', 'notice', 'closed'] }).notNull().default('active'),
  noticeGivenOn: text('notice_given_on'),
  plannedExitOn: text('planned_exit_on'),
  actualExitOn: text('actual_exit_on'),
  depositRefunded: integer('deposit_refunded').notNull().default(0),
  updatedAt: text('updated_at'),
}, (table) => [
  index('idx_tenancies_bed_status').on(table.bedId, table.status),
]);

export const charges = sqliteTable('charges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenancyId: integer('tenancy_id').notNull().references(() => tenancies.id),
  kind: text('kind', { enum: ['security', 'prorated_rent', 'monthly_rent', 'electricity', 'meal', 'late_fee', 'damage', 'adjustment'] }).notNull(),
  description: text('description'),
  period: text('period').notNull(),
  amount: integer('amount').notNull(),
  dueOn: text('due_on').notNull(),
  status: text('status', { enum: ['due', 'partial', 'paid', 'waived'] }).notNull().default('due'),
  createdAt: text('created_at'),
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
  status: text('status', { enum: ['confirmed', 'voided', 'refunded'] }).notNull().default('confirmed'),
  idempotencyKey: text('idempotency_key'),
  receiptNumber: text('receipt_number'),
  voidedAt: text('voided_at'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_payments_tenancy_paid_on').on(table.tenancyId, table.paidOn),
  uniqueIndex('idx_payments_idempotency').on(table.idempotencyKey),
  uniqueIndex('idx_payments_receipt_number').on(table.receiptNumber),
]);

export const bookings = sqliteTable('bookings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').notNull().references(() => properties.id),
  prospectName: text('prospect_name').notNull(),
  phone: text('phone').notNull(),
  expectedMoveIn: text('expected_move_in').notNull(),
  preferredSharing: text('preferred_sharing'),
  quotedRent: integer('quoted_rent').notNull().default(0),
  tokenAmount: integer('token_amount').notNull().default(0),
  source: text('source'),
  notes: text('notes'),
  status: text('status', { enum: ['enquiry', 'visit', 'confirmed', 'checked_in', 'cancelled'] }).notNull().default('enquiry'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_bookings_property_status_move_in').on(table.propertyId, table.status, table.expectedMoveIn),
]);

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').notNull().references(() => properties.id),
  category: text('category', { enum: ['utilities', 'maintenance', 'food', 'salary', 'supplies', 'tax', 'other'] }).notNull(),
  amount: integer('amount').notNull(),
  spentOn: text('spent_on').notNull(),
  vendor: text('vendor'),
  reference: text('reference'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_expenses_property_spent_on').on(table.propertyId, table.spentOn),
]);

export const workOrders = sqliteTable('work_orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').notNull().references(() => properties.id),
  tenancyId: integer('tenancy_id').references(() => tenancies.id),
  roomNo: text('room_no'),
  title: text('title').notNull(),
  category: text('category').notNull(),
  priority: text('priority', { enum: ['urgent', 'normal', 'low'] }).notNull().default('normal'),
  status: text('status', { enum: ['new', 'in_progress', 'resolved', 'cancelled'] }).notNull().default('new'),
  assignee: text('assignee'),
  cost: integer('cost').notNull().default(0),
  dueOn: text('due_on'),
  resolvedAt: text('resolved_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_work_orders_property_status').on(table.propertyId, table.status, table.priority),
]);

export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenancyId: integer('tenancy_id').notNull().references(() => tenancies.id),
  kind: text('kind', { enum: ['identity', 'address', 'agreement', 'police_verification', 'other'] }).notNull(),
  label: text('label').notNull(),
  storageKey: text('storage_key'),
  originalName: text('original_name'),
  contentType: text('content_type'),
  sizeBytes: integer('size_bytes'),
  verificationStatus: text('verification_status', { enum: ['requested', 'uploaded', 'verified', 'rejected', 'expired'] }).notNull().default('requested'),
  expiresOn: text('expires_on'),
  consentRecordedAt: text('consent_recorded_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_documents_tenancy_status').on(table.tenancyId, table.verificationStatus),
]);

export const meterReadings = sqliteTable('meter_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').notNull().references(() => properties.id),
  roomNo: text('room_no').notNull(),
  meterName: text('meter_name').notNull().default('Electricity'),
  period: text('period').notNull(),
  previousReading: integer('previous_reading').notNull(),
  currentReading: integer('current_reading').notNull(),
  ratePaise: integer('rate_paise').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('idx_meter_property_room_period').on(table.propertyId, table.roomNo, table.meterName, table.period),
]);

export const auditEvents = sqliteTable('audit_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: integer('owner_id').notNull().references(() => owners.id),
  propertyId: integer('property_id').references(() => properties.id),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  summary: text('summary').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_audit_owner_created').on(table.ownerId, table.createdAt),
]);

export const notificationEvents = sqliteTable('notification_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').notNull().references(() => properties.id),
  tenancyId: integer('tenancy_id').references(() => tenancies.id),
  channel: text('channel', { enum: ['whatsapp', 'email', 'sms', 'manual'] }).notNull(),
  kind: text('kind', { enum: ['rent_reminder', 'receipt', 'document_request', 'maintenance_update', 'other'] }).notNull(),
  recipient: text('recipient'),
  status: text('status', { enum: ['prepared', 'sent', 'failed'] }).notNull().default('prepared'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_notifications_property_created').on(table.propertyId, table.createdAt),
]);
