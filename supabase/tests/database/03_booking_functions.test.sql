-- create_booking + record_payment_success. Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Helper: one 14-seater van spec
create temp table _t as select
  '[{"vehicle_type_id":"10000000-0000-0000-0000-000000000014","passengers":12,"subtotal":3700,"discount":0,"total":3700,"deposit":1110}]'::jsonb as one14,
  '[{"vehicle_type_id":"10000000-0000-0000-0000-000000000014","passengers":14,"subtotal":2300,"discount":0,"total":2300,"deposit":690},
    {"vehicle_type_id":"10000000-0000-0000-0000-000000000008","passengers":6,"subtotal":1600,"discount":0,"total":1600,"deposit":480}]'::jsonb as group2;

-- 1. Single booking picks a 14-seater and holds it
create temp table _b1 as
select * from public.create_booking(null, 'Ama', '+233241112223', null, 'outstation', null,
  '{"address":"East Legon"}', '{"address":"Cape Coast"}', '[]', '2030-06-01 06:00+00', '2030-06-01 16:00+00', 4,
  (select one14 from _t), '[]', null, 12, '{}', 'web', null);

select is((select count(*) from _b1), 1::bigint, 'one booking created');
select ok((select b.vehicle_id is not null and b.status = 'pending_payment' and b.hold_expires_at > now()
             from public.bookings b join _b1 on b.id = _b1.booking_id), 'van assigned and held while unpaid');

-- 2. Same slot again → the other 14-seater
create temp table _b2 as
select * from public.create_booking(null, 'Kofi', '+233241112224', null, 'outstation', null,
  '{"address":"Osu"}', null, '[]', '2030-06-01 07:00+00', '2030-06-01 15:00+00', 0,
  (select one14 from _t), '[]', null, null, '{}', 'web', null);
select isnt(
  (select vehicle_id from public.bookings where id = (select booking_id from _b2)),
  (select vehicle_id from public.bookings where id = (select booking_id from _b1)),
  'second overlapping booking gets a different van');

-- 3. Third overlapping 14-seater → none left, whole call fails
select throws_ok(
  $$select * from public.create_booking(null, 'Yaw', '+233241112225', null, 'outstation', null,
      '{"address":"Tema"}', null, '[]', '2030-06-01 08:00+00', '2030-06-01 12:00+00', 0,
      (select one14 from _t), '[]', null, null, '{}', 'web', null)$$,
  'P0001', 'NO_VAN_AVAILABLE', 'no double-booking: fails cleanly when all vans are busy');

-- 4. Group booking: two vans, one group, all-or-nothing
create temp table _g as
select * from public.create_booking(null, 'Choir', '+233241112226', 'choir@example.com', 'event', null,
  '{"address":"Spintex"}', null, '[]', '2030-07-01 08:00+00', '2030-07-01 16:00+00', 0,
  (select group2 from _t), ('[{"addon_id":"' || (select id from public.addons where slug = 'decorations') || '","qty":1,"unit_price":300}]')::jsonb, null, null, '{}', 'web', null);
select is((select count(*) from _g), 2::bigint, 'group booking creates one booking per van');
select is((select count(distinct group_id) from _g), 1::bigint, 'both bookings share a group id');
select is((select count(*) from public.booking_addons where booking_id in (select booking_id from _g)), 1::bigint, 'add-on attached once');

-- 5. Expired holds are released (van freed) on the next booking attempt
update public.bookings set hold_expires_at = now() - interval '1 minute' where id = (select booking_id from _b2);
select lives_ok(
  $$select * from public.create_booking(null, 'Esi', '+233241112227', null, 'outstation', null,
      '{"address":"Tema"}', null, '[]', '2030-06-01 08:00+00', '2030-06-01 12:00+00', 0,
      (select one14 from _t), '[]', null, null, '{}', 'web', null)$$,
  'an expired unpaid hold frees the van');
select is((select status::text from public.bookings where id = (select booking_id from _b2)), 'cancelled', 'expired hold was cancelled');

-- 6. Payments: idempotent, spread over the group, confirm bookings
insert into public.payments (booking_id, reference, kind, amount, status)
values ((select booking_id from _g order by booking_id limit 1), 'PAY-GROUP-1', 'deposit', 1170, 'pending');

select is((select applied from public.record_payment_success('PAY-GROUP-1', 1170, 'momo', now(), '{}')), true, 'first payment notification applies');
select is((select applied from public.record_payment_success('PAY-GROUP-1', 1170, 'momo', now(), '{}')), false, 'duplicate notification is ignored');
select is((select sum(amount_paid) from public.bookings where id in (select booking_id from _g)), 1170::numeric, 'amount counted once, spread across the group');
select is((select count(*) from public.bookings where id in (select booking_id from _g) and status = 'confirmed'), 2::bigint, 'all group bookings confirmed');

insert into public.payments (booking_id, reference, kind, amount, status)
values ((select booking_id from _b1), 'PAY-SHORT-1', 'deposit', 1110, 'pending');
select throws_ok($$select * from public.record_payment_success('PAY-SHORT-1', 500, 'momo', now(), '{}')$$,
  'P0001', 'AMOUNT_MISMATCH', 'underpayment is rejected');

select * from finish();
rollback;
