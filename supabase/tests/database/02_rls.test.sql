-- Row-Level Security: who can see and change what. Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

-- ── Setup (as postgres) ───────────────────────────────────────────────
-- Two customers. Profiles are created by the on_auth_user_created trigger.
insert into auth.users (instance_id, id, aud, role, phone, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated',
   '233240000101', '{"full_name":"Customer One"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated',
   '233240000102', '{"full_name":"Customer Two"}', now(), now());

-- Customer One's booking, assigned to driver Kwame.
insert into public.bookings (id, customer_id, vehicle_type_id, vehicle_id, driver_id, trip_type, pickup,
  start_at, end_at, passengers, contact_name, contact_phone, subtotal, total, status)
values ('50000000-0000-0000-0000-0000000000b1', '60000000-0000-0000-0000-0000000000c1',
  '10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002', 'airport', '{"address":"Kotoka"}',
  '2030-02-01 08:00+00', '2030-02-01 10:00+00', 4, 'Customer One', '+233240000101', 700, 700, 'assigned');

insert into public.payments (booking_id, reference, kind, amount, method, status)
values ('50000000-0000-0000-0000-0000000000b1', 'TEST-REF-1', 'deposit', 210, 'momo', 'success');

insert into public.promo_codes (code, type, value) values ('WELCOME10', 'percent', 10);

-- Remember how many bookings exist in total (the database may already hold other bookings).
select set_config('test.total_bookings', (select count(*)::text from public.bookings), true);

select is(
  (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity),
  0::bigint, 'every public table has RLS enabled'
);

-- ── Anonymous visitor ─────────────────────────────────────────────────
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

select is((select count(*) from public.vehicles), 4::bigint, 'anon can browse the fleet');
select is((select count(*) from public.pricing_rules), 14::bigint, 'anon can read active pricing');
select is((select count(*) from public.bookings), 0::bigint, 'anon sees no bookings');
select is((select count(*) from public.promo_codes), 0::bigint, 'anon cannot list promo codes');
select is((select count(*) from public.profiles), 0::bigint, 'anon sees no profiles');

-- ── Customer One ──────────────────────────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"60000000-0000-0000-0000-0000000000c1","role":"authenticated"}';

select is((select count(*) from public.bookings), 1::bigint, 'customer sees own booking');
select is((select count(*) from public.payments), 1::bigint, 'customer sees own payment');
select is((select count(*) from public.drivers), 1::bigint, 'customer sees their assigned driver');
select is((select count(*) from public.profiles), 2::bigint, 'customer sees own profile + assigned driver profile');

select throws_ok(
  $$insert into public.bookings (customer_id, vehicle_type_id, trip_type, pickup, start_at, end_at,
      passengers, contact_name, contact_phone, subtotal, total)
    values ('60000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000008', 'airport',
      '{"address":"x"}', '2030-03-01 08:00+00', '2030-03-01 09:00+00', 2, 'Me', '+233240000101', 1, 1)$$,
  '42501', null, 'customer cannot insert bookings directly'
);

select throws_ok(
  $$update public.profiles set role = 'admin' where id = '60000000-0000-0000-0000-0000000000c1'$$,
  '42501', null, 'customer cannot promote themselves to admin'
);

select lives_ok(
  $$update public.profiles set full_name = 'Customer One Renamed' where id = '60000000-0000-0000-0000-0000000000c1'$$,
  'customer can update their own name'
);

-- ── Customer Two ──────────────────────────────────────────────────────
set local request.jwt.claims to '{"sub":"60000000-0000-0000-0000-0000000000c2","role":"authenticated"}';

select is((select count(*) from public.bookings), 0::bigint, 'customer cannot see other customers'' bookings');
select is((select count(*) from public.payments), 0::bigint, 'customer cannot see other customers'' payments');
select is((select count(*) from public.drivers), 0::bigint, 'customer sees no drivers when none assigned');

-- ── Driver Kwame (assigned) ───────────────────────────────────────────
set local request.jwt.claims to '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}';

select is((select count(*) from public.bookings where id = '50000000-0000-0000-0000-0000000000b1'), 1::bigint, 'driver sees trips assigned to them');
select is((select count(*) from public.bookings where driver_id is distinct from '40000000-0000-0000-0000-000000000002'), 0::bigint, 'driver sees no one else''s trips');
select is((select count(*) from public.payments), 0::bigint, 'driver cannot see payments');

-- ── Driver Ama (not assigned) ─────────────────────────────────────────
set local request.jwt.claims to '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}';

select is((select count(*) from public.bookings where id = '50000000-0000-0000-0000-0000000000b1'), 0::bigint, 'driver cannot see other drivers'' trips');

-- ── Admin ─────────────────────────────────────────────────────────────
set local request.jwt.claims to '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is((select count(*) from public.bookings), current_setting('test.total_bookings')::bigint, 'admin sees all bookings');
select ok((select count(*) from public.promo_codes) >= 1, 'admin sees promo codes');
select lives_ok(
  $$update public.profiles set role = 'corporate_admin' where id = '60000000-0000-0000-0000-0000000000c2'$$,
  'admin can change a user''s role'
);

select * from finish();
rollback;
