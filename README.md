# RentWise OS — production property operations

RentWise is an owner-first operating system for Indian PGs, hostels and
co-living properties. It runs on Cloudflare Workers with D1 for structured
records and R2 for private resident documents.

## Live site

[Open RentWise](https://rentwise-villa-26.gspabusar.chatgpt.site/)

## Product coverage

- Multi-property setup with flexible room and bed layouts
- Owner-scoped access through Sites authentication
- Resident onboarding, bed allotment, notices and checkout
- Idempotent charge generation for deposits, prorated move-ins and monthly rent
- Split-payment ledger, numbered receipts, WhatsApp-ready reminders and void audit trail
- Booking pipeline, operating expenses and profitability view
- Maintenance work orders and status tracking
- Consent-aware private document uploads, review and download
- CSV ledger/resident exports plus a complete owner JSON export
- Audit events, health endpoint, legal notices and production security headers

Payment records are internal ledger entries; RentWise does not move money.
Document review is not government KYC or Aadhaar authentication. Aadhaar copies
must be masked before upload.

## Local development

```bash
pnpm install
pnpm dev
```

Open `/signin-with-chatgpt?return_to=/dashboard` once to activate the simulated
local owner. The development identity is provided by the Sites plugin and is
never included in production builds.

Useful checks:

```bash
pnpm db:generate
pnpm lint
pnpm build
```

## Storage and deployment

`.openai/hosting.json` declares logical `DB` (D1) and `FILES` (R2) bindings.
Sites provisions and connects the hosted resources and applies the migrations
in `drizzle/`. Do not put resource IDs or credentials in the repository.

The app trusts only the authenticated identity headers supplied by Sites. All
data queries and mutations verify owner scope server-side. Cross-site browser
mutations are rejected, uploaded files are type/size checked, and payments use
idempotency keys so retries cannot create duplicate receipts.

## Launch operations

Before opening access to customers, confirm the deployment access policy,
support and grievance contact, data-retention policy, backups, uptime alerting,
and the state/city-specific accommodation and police-verification requirements
for the intended market. Payment gateway automation should be added only with
server-side signature verification and idempotent webhook processing.
