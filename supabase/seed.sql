-- Local development seed (test data only). Runs on `pnpm db:reset` AFTER production-catalog.sql
-- (see [db.seed] in config.toml), which provides vehicle types, prices, destinations and add-ons.

-- ── Test vehicles (made-up plates; real ones are added in Admin → Fleet) ──
insert into public.vehicles (id, type_id, name, plate, photos, features, status, current_mileage, year, colour) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', 'Elsasu 8-01', 'GR 1001-24',
   '{}', array['Air conditioning', 'USB charging', 'Reclining seats'], 'available', 42000, 2021, 'Silver'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000008', 'Elsasu 8-02', 'GR 1002-24',
   '{}', array['Air conditioning', 'USB charging', 'Bluetooth audio'], 'available', 38500, 2022, 'White'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000014', 'Elsasu 14-01', 'GR 1401-24',
   '{}', array['Air conditioning', 'USB charging', 'Large luggage space', 'PA system'], 'available', 61000, 2020, 'White'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000014', 'Elsasu 14-02', 'GR 1402-24',
   '{}', array['Air conditioning', 'USB charging', 'Large luggage space'], 'available', 55000, 2021, 'Silver'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000007', 'Toyota Highlander', 'GR 7001-24',
   '{}', array['Air conditioning', 'Leather seats', 'USB charging'], 'available', 30000, 2022, 'Black'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000007', 'Acura MDX', 'GR 7002-24',
   '{}', array['Air conditioning', 'Leather seats', 'Bluetooth audio'], 'available', 27000, 2021, 'White');

-- ── Local test accounts (sign in with the test OTP numbers in config.toml, code 123456) ──
--   +233200000001  Admin
--   +233200000002  Driver Kwame
--   +233200000003  Driver Ama
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('30000000-0000-0000-0000-000000000001'::uuid, '233200000001', 'Elsasu Admin'),
      ('30000000-0000-0000-0000-000000000002'::uuid, '233200000002', 'Kwame Mensah'),
      ('30000000-0000-0000-0000-000000000003'::uuid, '233200000003', 'Ama Owusu')
    ) as t(id, phone, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, phone, phone_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      phone_change, phone_change_token, email_change_token_current, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.phone, now(),
      '{"provider":"phone","providers":["phone"]}', jsonb_build_object('full_name', u.full_name), now(), now(),
      '', '', '', '', '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), u.id, u.id::text, 'phone',
      jsonb_build_object('sub', u.id::text, 'phone', u.phone, 'phone_verified', true),
      now(), now(), now()
    );
  end loop;
end;
$$;

-- Profiles were created by the on_auth_user_created trigger; now set roles.
update public.profiles set role = 'admin'  where id = '30000000-0000-0000-0000-000000000001';
update public.profiles set role = 'driver' where id in ('30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003');

insert into public.drivers (id, profile_id, licence_no, licence_expiry, rating) values
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'GH-DL-TEST-0002', '2028-12-31', 4.8),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'GH-DL-TEST-0003', '2029-06-30', 4.9);

