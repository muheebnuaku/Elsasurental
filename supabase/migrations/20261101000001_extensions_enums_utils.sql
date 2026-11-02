-- Extensions, enums and shared utility functions.

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

-- ── Enums ─────────────────────────────────────────────────────────────
create type public.user_role as enum ('customer', 'corporate_admin', 'driver', 'admin');
create type public.vehicle_status as enum ('available', 'on_trip', 'maintenance', 'inactive');
create type public.trip_type as enum (
  'airport', 'half_day', 'full_day', 'multi_day', 'outstation', 'event', 'corporate_shuttle'
);
create type public.booking_status as enum (
  'pending_payment', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled', 'refunded'
);
create type public.booking_source as enum ('web', 'whatsapp', 'admin', 'ai');
create type public.promo_type as enum ('percent', 'fixed');
-- bank_transfer and cash exist for phone bookings recorded by an admin.
create type public.payment_method as enum ('momo', 'card', 'bank_transfer', 'cash');
create type public.payment_status as enum ('pending', 'success', 'failed', 'abandoned', 'reversed', 'refunded');
create type public.payment_kind as enum ('deposit', 'balance', 'full', 'refund');
create type public.addon_unit as enum ('per_trip', 'per_hour', 'per_day', 'per_item');
create type public.expense_category as enum ('fuel', 'repair', 'other');
create type public.conversation_channel as enum ('web', 'whatsapp');
create type public.conversation_status as enum ('bot', 'human', 'closed');
create type public.message_role as enum ('user', 'assistant', 'tool', 'staff');

-- ── updated_at trigger ────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Booking reference codes, e.g. ELS-7K3QX ───────────────────────────
-- Alphabet skips look-alikes (0/O, 1/I/L) so refs are easy to read over the phone.
create or replace function public.gen_booking_ref()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea;
  ref text;
begin
  loop
    bytes := extensions.gen_random_bytes(5);
    ref := 'ELS-';
    for i in 0..4 loop
      ref := ref || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.bookings b where b.ref_code = ref);
  end loop;
  return ref;
end;
$$;

-- ── Time range a booking blocks a van/driver for ──────────────────────
-- Adding minutes never depends on timezone, so this is safe to mark IMMUTABLE
-- (Postgres can't prove that on its own for timestamptz + interval).
create or replace function public.booking_block_range(
  start_at timestamptz,
  end_at timestamptz,
  buffer_minutes integer
)
returns tstzrange
language sql
immutable
parallel safe
set search_path = ''
as $$
  select tstzrange(start_at, end_at + make_interval(mins => buffer_minutes), '[)');
$$;
