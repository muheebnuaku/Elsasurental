# Elsasu Rentals Services

Van rental and booking platform for Elsasu, a group-transport business in Ghana:
8- and 14-seater minivans with professional drivers, instant quotes, MoMo payment, live tracking
and (from Phase 2) a 24/7 AI booking assistant on web and WhatsApp.

**Stack:** Next.js 16 (App Router, TypeScript strict) · Supabase (Postgres, Auth, Storage, Realtime) ·
Tailwind CSS v4 + shadcn/ui · React Hook Form + Zod · Paystack · Google Maps · WhatsApp Cloud API ·
Resend · Arkesel/Hubtel SMS · Vercel.

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 — MVP | Schema, auth, public site, pricing, booking, Paystack, notifications, account, admin, monitoring | ✅ Built and tested locally. Go-live needs the real keys listed under "Go-live checklist" |
| 2 — AI & ops | AI concierge, WhatsApp bot, RAG, driver PWA, live tracking, inbox | 🚧 Web AI assistant live (WhatsApp bot, RAG, PWA, tracking to do) |
| 3 — Growth | Corporate invoicing, trip planner, smart dispatch, SEO pages, promos, reports | ⏳ |
| 4 — Intelligence | Admin AI, damage checks, voice/Twi/Ga | ⏳ |

## Prerequisites

- Node.js 20+ (developed on 24)
- pnpm (`npm i -g pnpm`)
- Docker Desktop, running (for local Supabase)

## Setup

```bash
pnpm install
pnpm db:start          # starts local Supabase in Docker, applies migrations + seed
cp .env.example .env.local
```

`pnpm db:start` prints your local keys. Copy them into `.env.local`:

| From `db:start` output | Into `.env.local` |
|---|---|
| API URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable / anon key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Secret / service_role key | `SUPABASE_SERVICE_ROLE_KEY` |

For the AI assistant, add `OPENAI_API_KEY` (from platform.openai.com/api-keys). Choose the model with `AI_MODEL`.

Then:

```bash
pnpm db:types          # generate TypeScript types from the database
pnpm dev               # http://localhost:3000
```

Supabase Studio (database browser) runs at http://127.0.0.1:54323.

## Test accounts (local only)

Phone OTP sign-in with these numbers always accepts code **123456**; no SMS is sent.

| Phone | Role |
|---|---|
| +233 20 000 0001 | Admin |
| +233 20 000 0002 | Driver (Kwame Mensah) |
| +233 20 000 0003 | Driver (Ama Owusu) |

Any other number signs up as a normal customer. In local dev (no `ARKESEL_API_KEY`), the login code is printed in the `pnpm dev` terminal: look for `[sms-hook] DEV login code`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run the app locally |
| `pnpm build` | Production build |
| `pnpm typecheck` | Generate route types + run TypeScript |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | End-to-end tests (Playwright) |
| `pnpm db:start` / `db:stop` | Start/stop local Supabase |
| `pnpm db:reset` | Wipe local DB, re-run all migrations + seed |
| `pnpm db:test` | Database tests (RLS + double-booking), pgTAP |
| `pnpm db:types` | Regenerate `types/supabase.ts` |

## Project layout

```
app/(public)        public site, booking flow, tracking
app/(customer)      /account
app/(driver)        /driver (PWA, Phase 2)
app/(admin)         /admin
app/api             webhooks (paystack, whatsapp), ai/chat, cron
components/         ui (shadcn), booking, fleet, admin, driver, chat
lib/                supabase, pricing, availability, payments, notifications, ai, maps, validators
supabase/           migrations, seed.sql, tests
types/              generated Supabase types
```

## Database at a glance

- **Double-booking is impossible at the database level.** `bookings` has two exclusion constraints:
  no two live bookings can share a van, or a driver, for overlapping time plus a 60-minute turnaround buffer.
- **RLS on every table.** Customers see only their own bookings and payments. Corporate admins see their
  company's. Drivers see only trips assigned to them (and never payments). Admins see everything.
  Bookings and payments are never written directly by the browser.
- **All prices are in the database** (`pricing_rules`, `destinations`, `addons`). Seed prices are placeholders.

See [DECISIONS.md](DECISIONS.md) for the reasoning behind these choices.

## Open questions (`TODO(confirm)`)

Search the code for `TODO(confirm)`. Current defaults:

- Driver-only (no self-drive)
- Fleet: 2 × 8-seater, 2 × 14-seater (placeholder plates)
- Turnaround buffer: 60 minutes
- Deposit: 30%
- Cancellation: full refund > 48h before, 50% at 24–48h, none < 24h
- Brand colours: black, white and orange (logo in `public/vans`)
- All seed prices, business phone/WhatsApp/email

## Production setup for phone login (Step 3)

1. Supabase dashboard → Authentication → Providers → Phone: enable. Pick any SMS provider with dummy values
   (the hook below overrides it).
2. Authentication → Hooks → **Send SMS** → HTTP → URL `https://<your-domain>/api/auth/sms-hook`.
   Generate the secret there and put it in `SUPABASE_SMS_HOOK_SECRET`.
3. Set `SMS_PROVIDER` (`arkesel` or `hubtel`), its API key(s) and an approved `SMS_SENDER_ID`.
4. Keep **Confirm phone** switched on (Phone provider settings). Google accounts add their number with an SMS
   code; without confirmations the number would be saved unverified.

## Google sign-in

1. Google Cloud Console → APIs & Services → OAuth consent screen: app name "Elsasu Rentals", your support email,
   logo, and the authorised domain (your site's domain). Publish it.
2. Credentials → Create credentials → OAuth client ID → Web application. Authorised redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Sign In / Providers → Google: enable, paste the client ID and secret.
4. Supabase → Authentication → URL Configuration: Site URL = your site; add `https://<your-domain>/**` to
   Redirect URLs. The "Continue with Google" button appears on /login automatically once the provider is on.

## Payments (Paystack)

1. Paystack dashboard → Settings → API Keys: put the **test** keys in `.env.local`
   (`PAYSTACK_SECRET_KEY=sk_test_…`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_…`). Switch to live keys only at launch.
2. Settings → Webhooks: URL `https://<your-domain>/api/webhooks/paystack` (for local testing use a tunnel such as
   ngrok, or rely on the confirmation page, which double-checks every payment with Paystack).
3. Enable Mobile Money (MTN, Telecel, AirtelTigo) and card on your Paystack account.

How it works: the customer verifies their phone by SMS code → bookings are created (vans held 30 min) → Paystack
→ webhook and/or the confirmation page record the payment once (idempotent) → bookings become **confirmed**.

## End-to-end tests

`pnpm test:e2e` builds the app, starts it on :3100 against a local **Paystack stand-in** (`e2e/mock-paystack.mjs`),
and books + pays on desktop and phone using test numbers 020 000 0009 / 0008. Local Supabase must be running.

## Notifications (Step 9)

`notify(event, bookingId)` sends **WhatsApp → SMS fallback**, plus **email** when the customer gave one. Every message
is logged in `notification_log` and never sent twice. Without keys (local dev) messages are printed in the terminal
(`[notify] DEV …`). Events: booking_confirmed, payment_received, reminder_24h, reminder_1h, booking_cancelled
(driver_assigned, trip_started, trip_completed, review_request are ready and get triggered by the admin/driver tools).

- **WhatsApp (Meta Cloud API):** set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`, then create and get approval
  for these templates in Meta Business Manager (language `en`, body parameters {{1}}, {{2}}… in this order):

  | Template | Parameters |
  |---|---|
  | `elsasu_booking_confirmed` | name, ref, trip, date/time, pick-up, paid, balance |
  | `elsasu_payment_received` | name, amount, ref, balance |
  | `elsasu_driver_assigned` | name, driver, driver phone, ref, date/time, van plate |
  | `elsasu_reminder_24h` | name, ref, date/time, pick-up, balance |
  | `elsasu_reminder_1h` | name, pick-up, driver, tracking link |
  | `elsasu_trip_started` | name, driver, ref, tracking link |
  | `elsasu_trip_completed` | name, ref |
  | `elsasu_review_request` | name, ref, link |
  | `elsasu_booking_cancelled` | name, ref, refund amount |

- **SMS:** `SMS_PROVIDER`, its key and an approved `SMS_SENDER_ID` (same as login codes).
- **Email:** `RESEND_API_KEY` and a verified sending domain in `EMAIL_FROM`.
- **Reminders:** a GitHub Actions schedule (`.github/workflows/reminders.yml`) calls `/api/cron/reminders` every
  15 minutes, so it works on Vercel Hobby. Add repo secrets `SITE_URL` and `CRON_SECRET` (same value as in Vercel).
  Run it by hand from the repo's Actions tab → Trip reminders → Run workflow. Test locally:
  `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders`

## Cancellations & refunds

Customers cancel from their booking page. Policy (site.ts): full refund > 48h before pick-up, 50% at 24–48h, none
< 24h. Vans are freed immediately; refunds go back through Paystack and the booking becomes **refunded** when
Paystack's `refund.processed` webhook arrives.

**Local testing note:** Docker on a small machine (here 4 CPUs / 3.7 GB) can make local Supabase stall under heavy
load (builds + browsers). If an end-to-end run times out on "send code", give Docker Desktop more memory or run one
device project at a time: `pnpm test:e2e --project=desktop`.

## Admin (Step 11)

Sign in as an admin (local: 020 000 0001, code 123456) → `/admin`:

- **Bookings** — search/filter; open a booking to assign van + driver (busy ones are greyed out; the customer is
  notified), start/complete the trip, record cash/bank/MoMo payments, send a Paystack payment link, cancel with
  policy/full/no refund, keep private notes, and see every payment and message.
- **Phone booking** — enter a phone/WhatsApp booking at website prices; pay by link, cash now, or later.
  It attaches to the customer's account automatically when they sign in with that number.
- **Calendar** — vans × 7 days; drag a booking onto another van of the same size to move it.
- **Fleet** — vans (status, mileage, features, photo/video upload) and drivers (create their login from a phone number).
- **Pricing** — prices per van/trip, destinations, add-ons, promo codes. Changes are live immediately.

## Monitoring & analytics (Step 12)

Both are **off until their keys are set** (see `.env.example`), and both go through our own domain so ad blockers
don't drop them: Sentry via `/monitoring`, PostHog via `/ingest`.

- **Sentry**: server errors (`instrumentation.ts`), browser errors (`instrumentation-client.ts`), error pages
  (`app/error.tsx`, `app/global-error.tsx`), plus errors we catch and recover from, such as failed refunds, payment
  start/reconcile, notifications and AI (`reportError()` in `lib/observability.ts`). Request bodies, cookies,
  headers and AI chat text are **not** sent (`lib/sentry-options.ts`).
- **PostHog**: page views plus the booking funnel `quote_shown → checkout_started → payment_redirected →
  payment_succeeded` (the last one is sent by the server once Paystack confirms), and `ai_trip_filled`,
  `chat_opened`, `balance_payment_started`, `booking_cancelled_by_customer` / `booking_cancelled`. Signed-in
  visitors are linked by account id only. There is no session recording, page text is masked, and no names,
  phones or emails are sent.
- Source maps upload to Sentry during the build only when `SENTRY_AUTH_TOKEN` is set.
- PostHog ignores automated browsers (Playwright etc.), so test runs don't show up in analytics.

## Go-live checklist

1. Supabase project created; run migrations (`supabase db push --linked`); paste `supabase/production-catalog.sql` into the SQL Editor (vehicle types, prices, destinations, add-ons; no test data; safe to re-run after new migrations); set the Send SMS hook to `https://<domain>/api/auth/sms-hook`.
2. Paystack **test** keys → run one real MoMo test payment; then live keys; webhook URL `https://<domain>/api/webhooks/paystack`.
3. WhatsApp templates (`elsasu_<event>`) approved; SMS sender ID registered; Resend domain verified.
4. Real prices, vans, photos, business phone/WhatsApp/email (search `TODO(confirm)`).
5. Vercel env vars from `.env.example`; GitHub repo secrets `SITE_URL` + `CRON_SECRET` for the 15-minute reminders.
6. Sentry DSN + auth token, PostHog key.
