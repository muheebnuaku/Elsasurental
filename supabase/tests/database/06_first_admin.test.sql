-- The first account on an empty database becomes admin, once.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

delete from public.notification_log; delete from public.payments; delete from public.bookings;
delete from auth.users;
update public.app_bootstrap set first_admin_claimed = false;

insert into auth.users (instance_id, id, aud, role, phone, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '70000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', '233590000001', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '70000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', '233590000002', now(), now());

select is((select role::text from public.profiles where id = '70000000-0000-0000-0000-000000000001'), 'admin', 'first account becomes admin');
select is((select role::text from public.profiles where id = '70000000-0000-0000-0000-000000000002'), 'customer', 'second account is a customer');

delete from auth.users;
insert into auth.users (instance_id, id, aud, role, phone, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '70000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', '233590000003', now(), now());
select is((select role::text from public.profiles where id = '70000000-0000-0000-0000-000000000003'), 'customer', 'it only ever happens once');

select * from finish();
rollback;
