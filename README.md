# RentWise OS — AI-native property operations

An owner-first workspace for Indian PGs and hostels: rooms and beds, tenant ledger
(security + prorated first month + monthly rent cycles), receipts, maintenance,
documents — with an always-available copilot. Runs on Cloudflare Workers + D1.

## Local development

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

- `/` marketing landing page
- `/dashboard` seeded interactive owner workspace, no login needed
- `/login` explains the MVP access model and links to the demo

The public demo stores changes in the visitor's browser, so one visitor cannot
change what another visitor sees. D1-backed owner APIs are scaffolded for the
next phase but stay inaccessible until verified authentication is enabled.

## Configuration

`.openai/hosting.json` wires local bindings:

```json
{ "d1": "DB", "r2": null }
```

Secrets for the later authenticated owner beta:

| Secret | Purpose |
|---|---|
| `SESSION_SECRET` | HMAC key for session cookies. Authentication refuses to run without a 32+ character value. |
| `RESEND_API_KEY` | (future) transactional email for magic links and reminders |

## Deploy to Cloudflare

```bash
wrangler d1 create rentwise          # once; note the database_id
wrangler d1 execute rentwise --remote --command "SELECT 1"   # smoke test
wrangler secret put SESSION_SECRET   # openssl rand -hex 32
wrangler deploy
```

The Vite Cloudflare plugin reads the same bindings in production; make sure the
`d1` binding name (`DB`) matches `hosting.json`.

## Architecture notes

- **Frontend**: React 19 + RSC via vinext (Next-compatible app router on Vite).
  Styling is hand-written CSS in `app/globals.css` — warm editorial theme,
  Fraunces + Plus Jakarta Sans + DM Mono, one violet accent.
- **Ledger**: every tenancy gets charges (`security`, `prorated_rent`, then one
  `monthly_rent` per period from the month after allotment). Payments are credits;
  the server allocates them oldest-due-first (waterfall) and returns per-tenant
  balance + current-month status. Charges are idempotent (`UNIQUE(tenancy_id, kind, period)`),
  so loading a property safely regenerates missing months.
- **Auth**: intentionally disabled for phase one. Email-only access is not treated
  as authentication; verified sign-in will be introduced with the owner beta.
- **Demo mode**: `/dashboard` uses seeded data and persists to local browser
  storage, keeping the public experience interactive and isolated per visitor.

## Beta scope & known limits

- One session revocation model only (sign-out clears the cookie).
- Maintenance requests and document status are stored client-side for real owners.
- No file uploads yet (R2 binding reserved); KYC is a tracked status flag.
- The copilot answers from live workspace data using intent matching.
