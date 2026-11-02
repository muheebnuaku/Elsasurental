-- Notification log (one row per message attempt, de-duplicated) and booking cancellation.

create type public.notification_channel as enum ('whatsapp', 'sms', 'email');
create type public.notification_status as enum ('sent', 'failed', 'skipped');

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete cascade,
  event text not null,
  channel public.notification_channel not null,
  status public.notification_status not null,
  -- e.g. "reminder_24h:ELS-7K3QX:sms" — a message with the same key is never sent twice
  dedupe_key text not null unique,
  recipient text, -- masked, e.g. +23324•••4567
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);
create index notification_log_booking_idx on public.notification_log (booking_id, created_at desc);

alter table public.notification_log enable row level security;
create policy "admin full access" on public.notification_log for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Cancel every live booking in a group (or a single booking). Frees the vans immediately.
create or replace function public.cancel_booking_group(p_lead uuid, p_reason text)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_group uuid;
  n integer;
begin
  select group_id into v_group from public.bookings where id = p_lead;
  update public.bookings
     set status = 'cancelled', cancelled_at = now(), cancel_reason = left(p_reason, 300), hold_expires_at = null
   where ((v_group is not null and group_id = v_group) or id = p_lead)
     and status in ('pending_payment', 'confirmed', 'assigned');
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.cancel_booking_group(uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_booking_group(uuid, text) to service_role;
