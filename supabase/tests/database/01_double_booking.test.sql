-- Double-booking guard (exclusion constraints). Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Uses vans 8-01 / 8-02 / 14-01 and driver Kwame from seed.sql

-- A: 10:00–12:00 on van 8-01 (blocks until 13:00 with the 60-minute buffer)
insert into public.bookings (id, vehicle_type_id, vehicle_id, driver_id, trip_type, pickup, start_at, end_at,
  passengers, contact_name, contact_phone, subtotal, total, status)
values ('50000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'half_day', '{"address":"Airport"}',
  '2030-01-10 10:00+00', '2030-01-10 12:00+00', 5, 'Test A', '+233240000001', 1000, 1000, 'confirmed');

select throws_ok(
  $$insert into public.bookings (vehicle_type_id, vehicle_id, trip_type, pickup, start_at, end_at,
      passengers, contact_name, contact_phone, subtotal, total)
    values ('10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', 'airport',
      '{"address":"x"}', '2030-01-10 11:00+00', '2030-01-10 11:30+00', 2, 'B', '+233240000002', 500, 500)$$,
  '23P01', null, 'overlapping booking on the same van is rejected'
);

select throws_ok(
  $$insert into public.bookings (vehicle_type_id, vehicle_id, trip_type, pickup, start_at, end_at,
      passengers, contact_name, contact_phone, subtotal, total)
    values ('10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', 'airport',
      '{"address":"x"}', '2030-01-10 12:30+00', '2030-01-10 14:00+00', 2, 'B', '+233240000002', 500, 500)$$,
  '23P01', null, 'booking inside the turnaround buffer is rejected'
);

select lives_ok(
  $$insert into public.bookings (vehicle_type_id, vehicle_id, trip_type, pickup, start_at, end_at,
      passengers, contact_name, contact_phone, subtotal, total)
    values ('10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', 'airport',
      '{"address":"x"}', '2030-01-10 13:00+00', '2030-01-10 14:00+00', 2, 'B', '+233240000002', 500, 500)$$,
  'booking right after the buffer is allowed'
);

select lives_ok(
  $$insert into public.bookings (vehicle_type_id, vehicle_id, trip_type, pickup, start_at, end_at,
      passengers, contact_name, contact_phone, subtotal, total)
    values ('10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', 'airport',
      '{"address":"x"}', '2030-01-10 10:00+00', '2030-01-10 12:00+00', 2, 'C', '+233240000003', 500, 500)$$,
  'same time on a different van is allowed'
);

select throws_ok(
  $$insert into public.bookings (vehicle_type_id, vehicle_id, driver_id, trip_type, pickup, start_at, end_at,
      passengers, contact_name, contact_phone, subtotal, total)
    values ('10000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000003',
      '40000000-0000-0000-0000-000000000002', 'airport',
      '{"address":"x"}', '2030-01-10 11:00+00', '2030-01-10 11:30+00', 2, 'D', '+233240000004', 500, 500)$$,
  '23P01', null, 'same driver on two overlapping trips is rejected'
);

select lives_ok(
  $$insert into public.bookings (vehicle_type_id, vehicle_id, trip_type, pickup, start_at, end_at,
      passengers, contact_name, contact_phone, subtotal, total, status)
    values ('10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', 'airport',
      '{"address":"x"}', '2030-01-10 10:30+00', '2030-01-10 11:00+00', 2, 'E', '+233240000005', 500, 500, 'cancelled')$$,
  'a cancelled booking does not block (and is not blocked)'
);

update public.bookings set status = 'cancelled' where id = '50000000-0000-0000-0000-00000000000a';

select lives_ok(
  $$insert into public.bookings (vehicle_type_id, vehicle_id, trip_type, pickup, start_at, end_at,
      passengers, contact_name, contact_phone, subtotal, total)
    values ('10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', 'airport',
      '{"address":"x"}', '2030-01-10 10:00+00', '2030-01-10 11:30+00', 2, 'F', '+233240000006', 500, 500)$$,
  'cancelling a booking frees the van'
);

select matches(
  (select ref_code from public.bookings where id = '50000000-0000-0000-0000-00000000000a'),
  '^ELS-[2-9A-HJ-NP-Z]{5}$',
  'booking refs look like ELS-7K3QX'
);

select * from finish();
rollback;
