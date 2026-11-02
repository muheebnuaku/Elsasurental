-- cancel_booking_group + notification log. Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

create temp table _b as
select * from public.create_booking(null, 'Ama', '+233241112230', null, 'airport', null,
  '{"address":"Kotoka"}', null, '[]', '2031-01-05 10:00+00', '2031-01-05 12:00+00', 0,
  '[{"vehicle_type_id":"10000000-0000-0000-0000-000000000008","passengers":4,"subtotal":700,"discount":0,"total":700,"deposit":210},
    {"vehicle_type_id":"10000000-0000-0000-0000-000000000008","passengers":4,"subtotal":700,"discount":0,"total":700,"deposit":210}]',
  '[]', null, null, '{}', 'web', null);

select is(public.cancel_booking_group((select booking_id from _b limit 1), 'test'), 2, 'cancelling one booking cancels its whole group');
select is((select count(*) from public.bookings where id in (select booking_id from _b) and status = 'cancelled'), 2::bigint, 'both vans cancelled');
select is(public.cancel_booking_group((select booking_id from _b limit 1), 'again'), 0, 'cancelling twice changes nothing');
select lives_ok(
  $$select * from public.create_booking(null, 'Kofi', '+233241112231', null, 'airport', null, '{"address":"Kotoka"}', null, '[]',
      '2031-01-05 10:00+00', '2031-01-05 12:00+00', 0,
      '[{"vehicle_type_id":"10000000-0000-0000-0000-000000000008","passengers":4,"subtotal":700,"discount":0,"total":700,"deposit":210},
        {"vehicle_type_id":"10000000-0000-0000-0000-000000000008","passengers":4,"subtotal":700,"discount":0,"total":700,"deposit":210}]',
      '[]', null, null, '{}', 'web', null)$$,
  'cancelled vans are immediately bookable again');

insert into public.notification_log (booking_id, event, channel, status, dedupe_key)
values ((select booking_id from _b limit 1), 'reminder_24h', 'sms', 'sent', 'reminder_24h:TEST:sms');
select throws_ok(
  $$insert into public.notification_log (booking_id, event, channel, status, dedupe_key)
    values ((select booking_id from _b limit 1), 'reminder_24h', 'sms', 'sent', 'reminder_24h:TEST:sms')$$,
  '23505', null, 'the same message can never be logged (sent) twice');

set local role authenticated;
set local request.jwt.claims to '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}';
select is((select count(*) from public.notification_log), 0::bigint, 'non-admins cannot read the notification log');

select * from finish();
rollback;
