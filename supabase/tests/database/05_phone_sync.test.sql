-- Google accounts adding a verified phone later, and customers not editing their phone directly.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- A Google sign-up: email, no phone.
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '60000000-0000-0000-0000-0000000000f1', 'authenticated', 'authenticated',
  'ama@example.com', '{"full_name":"Ama Google"}', now(), now());

-- An earlier phone booking made by staff for the number she will verify.
insert into public.bookings (id, vehicle_type_id, vehicle_id, trip_type, pickup, start_at, end_at, passengers,
  contact_name, contact_phone, subtotal, total, status, source)
values ('50000000-0000-0000-0000-0000000000f1', '10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001',
  'airport', '{"address":"Kotoka"}', '2031-03-01 08:00+00', '2031-03-01 10:00+00', 3, 'Ama', '+233240000777', 700, 700, 'confirmed', 'admin');

select is((select phone from public.profiles where id = '60000000-0000-0000-0000-0000000000f1'), null, 'Google account starts without a phone');

-- Supabase Auth sets the phone once the SMS code is verified (phone_change).
update auth.users set phone = '233240000777' where id = '60000000-0000-0000-0000-0000000000f1';

select is((select phone from public.profiles where id = '60000000-0000-0000-0000-0000000000f1'), '+233240000777', 'verified phone is copied to the profile');
select is((select customer_id::text from public.bookings where id = '50000000-0000-0000-0000-0000000000f1'),
  '60000000-0000-0000-0000-0000000000f1', 'earlier phone bookings for that number are attached');

-- The customer can't change their own profile phone.
set local role authenticated;
set local request.jwt.claims to '{"role":"authenticated","sub":"60000000-0000-0000-0000-0000000000f1"}';

select throws_ok(
  $$update public.profiles set phone = '+233240000999' where id = '60000000-0000-0000-0000-0000000000f1'$$,
  '42501', null, 'customer cannot edit their phone directly'
);
select lives_ok(
  $$update public.profiles set full_name = 'Ama K.' where id = '60000000-0000-0000-0000-0000000000f1'$$,
  'customer can still edit their name'
);

select * from finish();
rollback;
