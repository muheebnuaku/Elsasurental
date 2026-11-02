-- Core schema. Money is numeric(12,2) in the booking's currency (GHS by default).

-- ── Companies & profiles ──────────────────────────────────────────────
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_email text,
  credit_terms_days integer not null default 0 check (credit_terms_days >= 0),
  discount_pct numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text unique check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text,
  role public.user_role not null default 'customer',
  company_id uuid references public.companies (id) on delete set null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_company_id_idx on public.profiles (company_id);

-- ── Fleet ─────────────────────────────────────────────────────────────
create table public.vehicle_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  seats integer not null check (seats > 0),
  luggage_capacity integer not null default 0 check (luggage_capacity >= 0),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  type_id uuid not null references public.vehicle_types (id),
  name text not null,
  plate text not null unique,
  photos text[] not null default '{}',
  features text[] not null default '{}',
  status public.vehicle_status not null default 'available',
  current_mileage integer not null default 0 check (current_mileage >= 0),
  year integer,
  colour text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicles_type_id_idx on public.vehicles (type_id);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  licence_no text not null,
  licence_expiry date not null,
  rating numeric(3,2) check (rating is null or rating between 1 and 5),
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Pricing (all prices live here, never in code) ─────────────────────
create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  vehicle_type_id uuid not null references public.vehicle_types (id) on delete cascade,
  trip_type public.trip_type not null,
  -- For multi_day, base_price / included_km / included_hours are per day.
  base_price numeric(12,2) not null check (base_price >= 0),
  included_km integer not null default 0 check (included_km >= 0),
  included_hours numeric(5,2) not null default 0 check (included_hours >= 0),
  extra_km_rate numeric(12,2) not null default 0 check (extra_km_rate >= 0),
  extra_hour_rate numeric(12,2) not null default 0 check (extra_hour_rate >= 0),
  night_surcharge_pct numeric(5,2) not null default 0 check (night_surcharge_pct between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Only one active rule per van type + trip type.
create unique index pricing_rules_one_active_idx
  on public.pricing_rules (vehicle_type_id, trip_type) where active;

-- Fixed-price outstation trips from Accra (same-day return unless noted).
create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  region text not null,
  price_8_seater numeric(12,2) not null check (price_8_seater >= 0),
  price_14_seater numeric(12,2) not null check (price_14_seater >= 0),
  est_hours numeric(4,1) not null check (est_hours > 0), -- one-way drive time from Accra
  distance_km integer,                                     -- one-way, from Accra
  description text,
  lat double precision,
  lng double precision,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  unit public.addon_unit not null default 'per_trip',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  type public.promo_type not null,
  value numeric(12,2) not null check (value > 0),
  min_subtotal numeric(12,2) not null default 0,
  valid_from timestamptz,
  valid_to timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type <> 'percent' or value <= 100),
  check (valid_to is null or valid_from is null or valid_to > valid_from)
);

-- ── Bookings ──────────────────────────────────────────────────────────
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref_code text not null unique default public.gen_booking_ref(),
  -- Bookings for 15+ passengers are split into one booking per van sharing a group_id.
  group_id uuid,
  customer_id uuid references public.profiles (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  vehicle_type_id uuid not null references public.vehicle_types (id),
  vehicle_id uuid references public.vehicles (id),
  driver_id uuid references public.drivers (id),
  trip_type public.trip_type not null,
  destination_id uuid references public.destinations (id),
  -- { "address": text, "place_id": text, "lat": number, "lng": number }
  pickup jsonb not null,
  dropoff jsonb,
  stops jsonb not null default '[]'::jsonb,
  start_at timestamptz not null,
  end_at timestamptz not null,
  -- TODO(confirm): turnaround buffer between trips. Default 60 minutes.
  buffer_minutes integer not null default 60 check (buffer_minutes between 0 and 600),
  passengers integer not null check (passengers between 1 and 14),
  luggage integer not null default 0 check (luggage >= 0),
  status public.booking_status not null default 'pending_payment',
  -- Unpaid bookings hold the van until this time; expired holds are released by cron.
  hold_expires_at timestamptz,
  contact_name text not null,
  contact_phone text not null check (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  contact_email text,
  distance_km numeric(8,1),
  duration_minutes integer,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null check (total >= 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  currency text not null default 'GHS' check (currency in ('GHS', 'USD')),
  -- Line items exactly as quoted, so receipts never change if prices change later.
  quote_snapshot jsonb not null default '{}'::jsonb,
  promo_code_id uuid references public.promo_codes (id),
  source public.booking_source not null default 'web',
  notes text,
  admin_notes text,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (total <= subtotal),

  -- ── The double-booking guard ──
  -- No two live bookings may use the same van for overlapping time (+ turnaround buffer).
  constraint bookings_no_vehicle_overlap exclude using gist (
    vehicle_id with =,
    public.booking_block_range(start_at, end_at, buffer_minutes) with &&
  ) where (vehicle_id is not null and status not in ('cancelled', 'refunded')),

  -- Same rule for drivers: one trip at a time.
  constraint bookings_no_driver_overlap exclude using gist (
    driver_id with =,
    public.booking_block_range(start_at, end_at, buffer_minutes) with &&
  ) where (driver_id is not null and status not in ('cancelled', 'refunded'))
);
create index bookings_customer_id_idx on public.bookings (customer_id);
create index bookings_company_id_idx on public.bookings (company_id);
create index bookings_driver_id_idx on public.bookings (driver_id);
create index bookings_start_at_idx on public.bookings (start_at);
create index bookings_status_idx on public.bookings (status);
create index bookings_group_id_idx on public.bookings (group_id) where group_id is not null;
create index bookings_contact_phone_idx on public.bookings (contact_phone);

create table public.booking_addons (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  addon_id uuid not null references public.addons (id),
  qty integer not null default 1 check (qty > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, addon_id)
);

-- ── Payments ──────────────────────────────────────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  provider text not null default 'paystack',
  reference text not null unique, -- idempotency key for webhooks
  kind public.payment_kind not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'GHS' check (currency in ('GHS', 'USD')),
  method public.payment_method,
  status public.payment_status not null default 'pending',
  -- Provider payload with card/MoMo details stripped before storing.
  raw jsonb,
  refund_of uuid references public.payments (id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_booking_id_idx on public.payments (booking_id);

-- ── Operations ────────────────────────────────────────────────────────
create table public.trip_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  start_odometer integer check (start_odometer >= 0),
  end_odometer integer check (end_odometer >= 0),
  start_photo_path text,
  started_at timestamptz,
  ended_at timestamptz,
  extra_km numeric(8,1) not null default 0,
  extra_hours numeric(5,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_odometer is null or start_odometer is null or end_odometer >= start_odometer)
);

-- High-volume (a point every 15–30s per active trip), so a bigint key instead of uuid.
create table public.driver_locations (
  id bigint generated always as identity primary key,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  heading double precision,
  speed double precision,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index driver_locations_booking_time_idx on public.driver_locations (booking_id, recorded_at desc);
create index driver_locations_driver_time_idx on public.driver_locations (driver_id, recorded_at desc);

create table public.maintenance (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  type text not null,
  cost numeric(12,2) not null default 0 check (cost >= 0),
  done_at date not null,
  next_due_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index maintenance_vehicle_id_idx on public.maintenance (vehicle_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  driver_id uuid references public.drivers (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  category public.expense_category not null,
  amount numeric(12,2) not null check (amount > 0),
  spent_at timestamptz not null default now(),
  receipt_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_vehicle_id_idx on public.expenses (vehicle_id);
create index expenses_driver_id_idx on public.expenses (driver_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  customer_id uuid references public.profiles (id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  sentiment text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── AI / messaging (used from Phase 2) ────────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  channel public.conversation_channel not null,
  phone text,
  customer_id uuid references public.profiles (id) on delete set null,
  status public.conversation_status not null default 'bot',
  assigned_to uuid references public.profiles (id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_phone_idx on public.conversations (phone);
create index conversations_customer_id_idx on public.conversations (customer_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role public.message_role not null,
  content text,
  tool_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index messages_conversation_time_idx on public.messages (conversation_id, created_at);

create table public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index kb_documents_embedding_idx on public.kb_documents
  using hnsw (embedding extensions.vector_cosine_ops);

-- ── updated_at triggers on every table that has the column ────────────
do $$
declare t text;
begin
  foreach t in array array[
    'companies','profiles','vehicle_types','vehicles','drivers','pricing_rules','destinations',
    'addons','promo_codes','bookings','booking_addons','payments','trip_logs','maintenance',
    'expenses','reviews','conversations','messages','kb_documents'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;
