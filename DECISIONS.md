# Decisions

Important choices and why. Newest at the bottom of each section.

## Framework & tooling

- **Next.js 16.4 with Cache Components + Partial Prefetching on** (create-next-app default). Dynamic data
  (cookies, auth, live prices) must be read inside `<Suspense>` or marked with `"use cache"`.
- **Middleware is `proxy.ts` in Next 16.** Route-group protection (Step 3) lives there, but it only does
  quick redirects. Real authorisation is RLS plus server-side checks.
- **shadcn/ui on Radix, "Nova" preset.** Radix is the most widely documented base (supports `asChild`).
  shadcn now uses its own `cn` package instead of `clsx` + `tailwind-merge`.
- **Quote tokens are signed with Node's built-in `crypto` (HMAC-SHA256)** instead of adding a JWT library.
- **Prettier** added as a dev-only formatter (not a runtime library). Easy to remove if unwanted.
- **`typecheck` runs `next typegen` first**, because Next generates global route types (`LayoutProps`,
  `PageProps`) that plain `tsc` can't see otherwise.

## Database

- **Double-booking guard = exclusion constraints on `bookings`** for `vehicle_id` and `driver_id`, over
  `booking_block_range(start_at, end_at, buffer_minutes)`, ignoring cancelled/refunded bookings.
  Postgres refuses `timestamptz + interval` in an index because it can't prove it never changes (adding
  *days* depends on timezone). Adding *minutes* doesn't, so a small helper function marked `IMMUTABLE` is safe.
- **Buffer stored per booking (`buffer_minutes`, default 60).** Admins can shorten it for back-to-back
  airport runs without a migration.
- **One booking = one van.** Groups of 15+ are split into several bookings sharing `group_id`, so the
  constraint protects every van. Hence `passengers` is capped at 14 per booking.
- **Unpaid bookings hold their van** (`status = pending_payment`, `hold_expires_at` ≈ 30 min). A cron job
  (Step 9) cancels expired holds so the van is freed.
- **A van is reserved at booking time** (`vehicle_id` set when the booking is created), not only when an
  admin assigns it. That's what makes "no possible double-booking" true. Admins can still swap vans.
  The constraint rejects a swap that would clash.
- **`quote_snapshot jsonb` on bookings** stores the exact line items charged, so receipts don't change
  if prices are edited later.
- **`payment_method` adds `bank_transfer` and `cash`** alongside momo/card, for phone bookings an admin
  records manually. `payment_kind` (deposit/balance/full/refund) tracks what each payment was for.
- **`driver_locations` uses a bigint identity key**, not UUID: it's a high-volume append-only table.
- **Extra columns not in the brief:** `slug` on vehicle types/destinations/add-ons (for URLs),
  destination `distance_km`/`lat`/`lng`, `reviews.is_published` (moderation), `expenses.driver_id`
  (driver PWA logging), `conversations.assigned_to` (human takeover), contact fields on bookings (guests).

## Security / RLS

- **RLS on every table; admins get a blanket policy.** Other roles get narrow read policies.
- **Clients never insert/update bookings or payments.** Those go through server code using the service
  role, or `SECURITY DEFINER` functions that do their own checks (Step 5). This stops a user writing their
  own price.
- **Role lookups use `SECURITY DEFINER` helpers** (`is_admin()`, `current_driver_id()`, …) to avoid
  recursive RLS on `profiles`. They're wrapped in `(select …)` in policies so Postgres evaluates them once
  per query rather than once per row.
- **New users are always `customer`.** `handle_new_user` never reads role from sign-up metadata, and a
  trigger blocks non-admins from changing their own `role` or `company_id`.
- **Drivers can't see payments**, only trip details.
- **Storage:** `vehicle-photos` public; `trip-photos` and `documents` private. Receipts are served via
  short-lived signed URLs.

## Auth / SMS

- **Phone OTP SMS will go through Supabase's "Send SMS" auth hook → Arkesel (or Hubtel)** (Step 3).
  Supabase's built-in providers (Twilio, Vonage, …) are expensive or unreliable for Ghana.
- **Local dev uses fixed test OTP numbers** (`config.toml`) and a dummy Twilio config, only because
  Supabase disables phone login entirely when no provider is enabled. It never sends anything.

## Design

- **Brand: black #0A0A0A, white, orange #EA580C.** Orange is a shade deeper than bright #F97316 so black
  text on orange buttons (5.9:1) and orange icons on white (3.6:1) pass contrast. Small orange text uses
  `text-brand-orange-text` (darker on light, lighter on black sections) to pass AA.
- **Warm, human tone:** Instrument Serif italic accents ("We'll drive."), a "driver is on the way" preview,
  a scrolling strip of real occasions. Geist for everything else.
- **Phones first:** sticky bottom bar (Book · Ask AI · WhatsApp); every page checked at 375 / 820 / 1440px
  for horizontal overflow.
- **Photos:** temporary Unsplash photos (`lib/stock-photos.ts`, free licence). Admin-uploaded van photos
  in `vehicles.photos` always win.

## Pricing

- **One entry point: `quoteTrip()`**. Booking form, `/api/quote` and the AI agent all use it, so a price
  shown anywhere is the same price. The engine itself (`lib/pricing/engine.ts`) is pure and unit-tested.
- **Groups of 15+ get a mix of vans** (largest first, then the smallest that fits the rest, e.g. 20 → 14 + 8).
- **Fixed destination prices** cover a same-day return with time for the drive both ways plus 4 hours there.
- **Unknown distance (no Google key / route not found) never guesses**: the quote says
  "includes N km, extra km at X/km".
- **Add-ons are per booking**, not per van; each stop is one "extra stop" add-on.
- **Deposit is rounded up to the whole cedi.**

## AI

- **Built ahead of schedule at the owner's request:** web chat assistant ("Ama") and the booking form's
  "describe your trip" box. WhatsApp bot, RAG and the admin inbox remain Phase 2.
- **OpenAI via the Vercel AI SDK (owner's choice); provider isolated in `lib/ai/provider.ts`.** Default
  `gpt-5.4-mini`, changeable with `AI_MODEL`. Chat runs at low reasoning effort.
- **The agent never states a price except from `get_quote`, and never confirms a booking**; it hands over
  a pre-filled booking link or WhatsApp. Every chat is saved to `conversations`/`messages`.
- **Knowledge base is a keyword search over FAQs/policies** until pgvector (Phase 2).
- **Rate limits are in-memory per server instance**; fine for launch traffic, move to Postgres/KV if abused.

## Round 3 (owner feedback)

- **Real logo** from `public/vans/` → transparent, trimmed `public/brand/logo.png` (+ white `logo-dark.png`
  for dark backgrounds) and `app/icon.png`.
- **One floating stack, bottom-right, all screens:** WhatsApp → Ask (assistant) → Book. Replaces the phone
  bottom bar. Hidden while the chat is open; Book hidden on `/book`.
- **About, FAQs and Contact are one page** (`/about`); `/faqs` and `/contact` redirect there. No FAQ/CTA
  repeats on the landing page.
- **Locations without typing:** suggestions, "My location" (GPS → address) and "Pick on map". Google Places/
  Geocoding when `GOOGLE_MAPS_SERVER_KEY` is set, else Photon (OpenStreetMap). The map picker is a small
  dependency-free OSM tile map; switch tiles to a paid provider before heavy traffic.
- **Van detail pages** `/fleet/[slug]` with a photo/video gallery. `vehicles.videos` and
  `destinations.image_url` added (admin-editable later).
- **No "AI" sparkle styling**: the assistant is presented as a helpful service, not a gimmick.
- **Scrollbars hidden** site-wide for a cleaner look (scrolling unchanged).

## Auth (Step 3)

- **Phone OTP only for now** (email login can follow). Login codes go Supabase → Send SMS hook
  (`/api/auth/sms-hook`, Standard Webhooks signature verified) → Arkesel/Hubtel. Dev without an SMS key prints
  the code to the terminal; production refuses to run without a provider.
- **Three layers of protection:** `proxy.ts` (signed-out → /login, quick), `AreaGate` in each area layout
  (role check on the server), and RLS in the database (the real guarantee).
- **Header sign-in state is read in the browser** so public pages stay pre-built and fast.
- **Account deletion** (Data Protection Act): removes the login and profile; bookings stay for tax records,
  unlinked (`customer_id` set to null). Staff accounts are removed by an admin.
- **Phone numbers stored as E.164 (+233…)**; `normalizeGhanaPhone` accepts every common local format.

## Booking & payments (Steps 7–8)

- **Bookings are created by one database function** (`create_booking`): picks a free van per van in the quote,
  all-or-nothing, holds them for 30 minutes (`pending_payment`), releases expired holds first. The exclusion
  constraint still decides clashes, so two people can never get the same van.
- **Prices come only from the signed quote token** (30-minute expiry); the browser cannot change them.
- **Multi-van groups:** each van gets its own booking with its exact share (`lib/booking/allocate.ts`, sums to the
  pesewa). Payments attach to the group's first booking and are spread across the group when recorded.
- **Payment recording is idempotent** (`record_payment_success`): the webhook and the confirmation page may both
  report the same payment; it counts once. Underpayments are rejected.
- **Webhook security:** HMAC-SHA512 signature check; forged requests get 401. Stored payment data is stripped to
  receipt-safe fields (no authorization codes, card numbers or MoMo numbers).
- **Guests verify their phone in the booking form** (SMS code) — this creates their account automatically.
- **Paystack needs an email:** customers without one get `<phone>@customers.elsasu.com`. TODO(confirm) domain.
- **Receipts:** PDF via `@react-pdf/renderer`, built-in Helvetica (so amounts show "GHS", not the ₵ glyph).
- **Not yet:** customer self-cancellation + refunds (cancellation policy is defined; refunds go through Paystack's
  refund API) and booking notifications — both come with Step 9.

## Notifications, cancellations (Step 9)

- **One `notify()`**: WhatsApp template first, SMS if WhatsApp isn't set up or fails, email in addition. Messages are
  built in one file (`lib/notifications/messages.ts`) so SMS, WhatsApp and email always state the same facts.
- **Never twice:** a unique `dedupe_key` per event+booking+channel (+payment reference) is claimed *before* sending.
- **Never blocking:** notifications run in `after()` once the response is sent; failures are logged, never thrown.
- **One message per group:** multi-van bookings notify once (lead booking).
- **Cancellation:** `cancel_booking_group` frees all vans at once; the refund follows the policy, is split across the
  customer's payments, and goes through Paystack's refund API. Completed refund rows use status `refunded` so they're
  never mistaken for payments. A failed refund is recorded (status `failed`) for admin follow-up.
- **Cron** (`/api/cron/reminders`, every 15 min) also releases expired van holds as a safety net.
  It's triggered by GitHub Actions, not a Vercel cron: Vercel Hobby only allows daily crons, and GitHub's
  free schedule does the job. Runs can start a few minutes late; the 2-hour / 1-hour reminder windows absorb that.
- **E2E suite:** one retry allowed; failures seen were local Docker auth/gateway timeouts under load, not app logic.

## Admin (Step 11)

- **Server Actions + `requireAdmin()`** for every admin write; they use the admin's own Supabase session so RLS
  ("admin full access") is the second gate. Only cross-user operations (creating driver logins, recording payments,
  refunds) use the service role, after the admin check.
- **Assignment respects the database guard:** van/driver clashes come back as friendly errors (exclusion constraint),
  never silent double-bookings. Calendar moves only allow vans of the same size (price depends on it).
- **Phone bookings** use the same pricing engine and quote token as the website, `source = admin`, a longer unpaid
  hold (24h with a payment link, 7 days for pay-later), and auto-attach to the customer's account on first sign-in
  (`handle_new_user` links bookings by phone).
- **Catalogue edits call `updateTag("catalog")`** so the public site shows new prices/vans on the next request.
- **IDs validated with `z.guid()`**, not `.uuid()`: Zod 4's strict UUID check rejects the seed data's test IDs.
- **Admin toasts fire from the action wrapper**, so feedback still shows when a save removes its own form.
- **Uploads:** van photos → `vehicle-photos`, videos → `vehicle-videos` (public buckets; only admins can write).

## Monitoring & analytics (Step 12)

- **Privacy first.** Sentry v11's defaults collect request bodies, cookies, headers and AI inputs/outputs. Those
  would include customers' names, phones and sessions, so all of that is off (`lib/sentry-options.ts`). PostHog runs
  with `person_profiles: identified_only`, no session recording, masked text and attributes, and identifies by
  account id only.
- **Funnel conversions come from the server.** `payment_succeeded` is sent from `afterPaymentRecorded` (after
  Paystack confirms), not from the browser redirect, so analytics never counts a payment that didn't happen. Guests
  who never sign in are tracked as `booking:<ref>`.
- **First-party routes** (`/monitoring` → `app/sentry-tunnel`, `/ingest` rewrites) keep data flowing past ad
  blockers. The tunnel forwards only the event, never the visitor's cookies.
- **`reportError(where, err, extra)`** replaces `console.error` where we recover from an error. Extras are refs only.
- **Sentry v11 API notes:** `withSentryConfig` is imported from `@sentry/nextjs/config`; `sendDefaultPii` was
  replaced by `dataCollection`.
- **Verified locally** with a stand-in collector: browser error through the tunnel, the full funnel linked to one
  customer, and no phone numbers, names, cookies or page text in any payload.

## Post-launch round (Nov 2026): Google sign-in, installable app, SUVs, terms

- **Google sign-in sits next to phone codes, it doesn't replace them.** Bookings need a verified phone (the
  booking API trusts `profiles.phone`), so a Google account confirms a number once at checkout with
  `updateUser({ phone })` + a `phone_change` code. That keeps one account with both identities. If the number
  already has its own account, checkout continues as that account. The Google button appears only when the
  provider is switched on in Supabase (read from `/auth/v1/settings`), so the page never shows a broken button.
- **"Confirm phone" must be on** (config.toml and the dashboard). Without it Supabase sets a new phone without a
  code and marks it confirmed, which would let anyone claim another person's number and their phone bookings.
- **Profile phone is locked.** `protect_profile_columns` now also blocks customers changing `phone`; only the
  verified-phone sync trigger (or an admin) writes it.
- **Vehicle categories.** `vehicle_types.category` is `van` or `suv`. Automatic sizing (pricing engine, home
  quick quote, AI assistant) only picks vans; an SUV is used when the customer chooses it (fleet page or the
  booking form's Vehicle choice). New types (e.g. Land Cruiser) need no code changes.
- **Destination prices per vehicle type** (`destination_prices`) replace the two hard-coded 8/14-seater columns.
  A destination without a price for the chosen vehicle returns a clear "message us" error instead of guessing.
- **One catalogue file.** `supabase/production-catalog.sql` is loaded before `seed.sql` locally and pasted into
  the live SQL editor; it's idempotent, so re-running it adds only new rows.
- **Terms written for visitors from abroad:** plain-English summary, refund table with a worked example, GH₵
  charging and exchange-rate differences, waiting time and no-shows, conduct, damage, delays outside our control,
  liability cap, Ghanaian law. Policy numbers come from `lib/site.ts`, so the terms, FAQ and refund code can't
  disagree. Customers accept the terms next to the Pay button. Still needs a Ghanaian lawyer's review.
- **Installable app:** `app/manifest.ts` + icons (no service worker, so nothing is cached stale). "Install the app"
  in the menu uses the browser prompt on Android/desktop Chrome and shows the two Share steps on iPhone.
- **Landing animation runs on one clock** (`useAnimationFrame` → `progress` → `useTransform`). Separate repeating
  animations started at different moments and drifted apart; in production some never started.
- **Slow SMS never strands the customer.** Arkesel can take far longer than the ~5 s Supabase gives the Send SMS
  hook, so the hook answers at once and delivers in `after()` with retries. If Supabase still reports an error
  (anything but 429), sign-in and checkout show the code boxes anyway with a gentle "taking longer" note, because
  the text usually arrives.
- **Functions run in `dub1`** (vercel.json), next to the Supabase project (eu-west-1), instead of Vercel's US default.
- **Phone + password accounts** (owner's choice over SMS codes at every sign-in). `/register` = name, phone,
  password → `signUp` → one code confirms the number. `/login` = `signInWithPassword`, no code. "Forgot
  password?" = `signInWithOtp({ shouldCreateUser: false })` → code → `updateUser({ password })`, which is also how
  older code-only and checkout-created accounts get a password (or Account → Password). Google stays.
- **Sessions last 30 days without a visit** (`sessionCookieOptions`, used by the browser, server and proxy
  clients). The cookie is rewritten on every session refresh, so regular use keeps people signed in.
- **Login codes go by WhatsApp first.** The Send SMS hook sends Supabase's code with an approved AUTHENTICATION
  template (`sendWhatsAppCode`). Meta accepts messages to numbers that aren't on WhatsApp and fails later, so we
  can't fall back instantly; instead a resend within 15 minutes goes by SMS (`otp_deliveries` remembers the last
  channel). `NEXT_PUBLIC_WHATSAPP_CODES=on` switches the wording on screen.
- **First account on an empty database becomes admin, once** (`app_bootstrap.first_admin_claimed`, checked in
  `handle_new_user`). It never fires while other accounts exist, and never again after it's used, so a later
  "no admins left" moment can't hand admin to a stranger. Further admins are promoted in SQL or by an admin.

## Admin rebuild (Nov 2026)

- **Navigation:** laptop = dark sidebar grouped Operations / Fleet & prices / People / Settings; phone = slim top
  bar, bottom tabs (Overview, Bookings, Calendar, Vehicles) and "More" for the rest. Admin has its own shell
  (`components/admin/admin-shell.tsx`); account and driver areas keep `AppShell`.
- **Vehicles = what the website sells.** Vehicle types are now created, edited and hidden in the admin
  (`vehicle_types.active`; hidden types are filtered by RLS and `getFleet`). Each type's page holds its details,
  its vehicles (plates, photos, videos), its trip prices and its destination prices. A new type copies prices
  from a chosen type so it can be quoted immediately.
- **Customers page** with search and admin access; can't change your own role or remove the last admin.
- **Admin assistant** (`/admin/assistant`, OpenAI via `lib/ai/provider.ts`): read-only tools that query
  through the admin's own session (RLS), so it can answer and draft messages but never change data.
- **Drivers get texts too** (`lib/notifications/driver.ts`, SMS): new trip (route, time, passengers, plate,
  customer name and number — never prices), "no longer assigned to you" when reassigned or removed, "cancelled,
  you don't need to go", and an evening digest of tomorrow's trips from 18:00 Accra (cron, once per driver per day).
  The customer still gets their own "your driver is…" message. All logged in `notification_log`.
