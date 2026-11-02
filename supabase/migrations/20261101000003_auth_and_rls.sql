-- Auth wiring + Row-Level Security on every table.
--
-- Rules of thumb:
--   • Clients only ever READ through RLS (plus a few narrow writes such as updating their own profile).
--   • Bookings and payments are written by server code (service role) or SECURITY DEFINER
--     functions that do their own checks — never by direct client inserts.
--   • Helper functions are SECURITY DEFINER so policies can look up the caller's role
--     without recursive RLS checks on `profiles`.

-- ── Helpers ───────────────────────────────────────────────────────────
create or replace function public.app_role()
returns public.user_role
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select p.role = 'admin' from public.profiles p where p.id = (select auth.uid())), false);
$$;

create or replace function public.current_company_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select p.company_id from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'corporate_admin';
$$;

create or replace function public.current_driver_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select d.id from public.drivers d where d.profile_id = (select auth.uid());
$$;

-- Lets a customer see the driver (and driver's profile) assigned to one of their bookings.
create or replace function public.is_my_assigned_driver(p_driver_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
    where b.driver_id = p_driver_id
      and b.customer_id = (select auth.uid())
      and b.status not in ('cancelled', 'refunded')
  );
$$;

revoke execute on function public.app_role(), public.is_admin(), public.current_company_id(),
  public.current_driver_id(), public.is_my_assigned_driver(uuid) from public, anon;
grant execute on function public.app_role(), public.is_admin(), public.current_company_id(),
  public.current_driver_id(), public.is_my_assigned_driver(uuid) to authenticated, service_role;

-- ── Create a profile for every new auth user ──────────────────────────
-- Role is ALWAYS 'customer' here; it is never read from user-supplied metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone, email, full_name)
  values (
    new.id,
    case when new.phone is null or new.phone = '' then null
         when left(new.phone, 1) = '+' then new.phone
         else '+' || new.phone end,
    nullif(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Stop non-admins from changing privileged profile fields ───────────
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.company_id is distinct from old.company_id)
     and coalesce((select auth.role()), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin')
     and not public.is_admin() then
    raise exception 'Only an admin can change role or company'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ── Enable RLS everywhere ─────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'companies','profiles','vehicle_types','vehicles','drivers','pricing_rules','destinations',
    'addons','promo_codes','bookings','booking_addons','payments','trip_logs','driver_locations',
    'maintenance','expenses','reviews','conversations','messages','kb_documents'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    -- Admins can do everything on every table.
    execute format(
      'create policy "admin full access" on public.%I for all to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end;
$$;

-- ── Public catalogue (anyone can read what's for sale) ────────────────
create policy "public read vehicle types" on public.vehicle_types
  for select to anon, authenticated using (true);

create policy "public read bookable vehicles" on public.vehicles
  for select to anon, authenticated using (status <> 'inactive');

create policy "public read active pricing" on public.pricing_rules
  for select to anon, authenticated using (active);

create policy "public read active destinations" on public.destinations
  for select to anon, authenticated using (active);

create policy "public read active addons" on public.addons
  for select to anon, authenticated using (active);

create policy "public read published reviews" on public.reviews
  for select to anon, authenticated using (is_published);

-- promo_codes, kb_documents: admin-only (validated / searched server-side).

-- ── Profiles ──────────────────────────────────────────────────────────
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "corporate admin reads company profiles" on public.profiles
  for select to authenticated
  using (company_id is not null and company_id = (select public.current_company_id()));

create policy "customer reads assigned driver profile" on public.profiles
  for select to authenticated
  using (
    role = 'driver' and exists (
      select 1 from public.drivers d
      where d.profile_id = profiles.id and public.is_my_assigned_driver(d.id)
    )
  );

create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ── Companies ─────────────────────────────────────────────────────────
create policy "members read own company" on public.companies
  for select to authenticated
  using (id = (select p.company_id from public.profiles p where p.id = (select auth.uid())));

-- ── Drivers ───────────────────────────────────────────────────────────
create policy "driver reads own record" on public.drivers
  for select to authenticated using (profile_id = (select auth.uid()));

create policy "customer reads assigned driver" on public.drivers
  for select to authenticated using ((select public.is_my_assigned_driver(id)));

-- ── Bookings (read-only for non-admins) ───────────────────────────────
create policy "customer reads own bookings" on public.bookings
  for select to authenticated using (customer_id = (select auth.uid()));

create policy "corporate admin reads company bookings" on public.bookings
  for select to authenticated
  using (company_id is not null and company_id = (select public.current_company_id()));

create policy "driver reads assigned trips" on public.bookings
  for select to authenticated using (driver_id = (select public.current_driver_id()));

-- Child tables follow the parent booking's visibility (bookings RLS applies inside the subquery).
create policy "read add-ons of visible bookings" on public.booking_addons
  for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_addons.booking_id));

-- Drivers can see trips but not money.
create policy "customer/corporate read payments of visible bookings" on public.payments
  for select to authenticated
  using (
    (select public.app_role()) in ('customer', 'corporate_admin')
    and exists (select 1 from public.bookings b where b.id = payments.booking_id)
  );

-- ── Driver operations ─────────────────────────────────────────────────
create policy "driver reads own trip logs" on public.trip_logs
  for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = trip_logs.booking_id and b.driver_id = (select public.current_driver_id())
  ));

create policy "driver writes own trip logs" on public.trip_logs
  for insert to authenticated
  with check (exists (
    select 1 from public.bookings b
    where b.id = trip_logs.booking_id and b.driver_id = (select public.current_driver_id())
  ));

create policy "driver updates own trip logs" on public.trip_logs
  for update to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = trip_logs.booking_id and b.driver_id = (select public.current_driver_id())
  ))
  with check (exists (
    select 1 from public.bookings b
    where b.id = trip_logs.booking_id and b.driver_id = (select public.current_driver_id())
  ));

create policy "driver sends own location" on public.driver_locations
  for insert to authenticated
  with check (
    driver_id = (select public.current_driver_id())
    and (booking_id is null or exists (
      select 1 from public.bookings b
      where b.id = driver_locations.booking_id
        and b.driver_id = (select public.current_driver_id())
        and b.status = 'in_progress'
    ))
  );

create policy "driver reads own locations" on public.driver_locations
  for select to authenticated using (driver_id = (select public.current_driver_id()));

create policy "customer reads location of own active trip" on public.driver_locations
  for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = driver_locations.booking_id
      and b.customer_id = (select auth.uid())
      and b.status = 'in_progress'
  ));

create policy "driver logs own expenses" on public.expenses
  for insert to authenticated with check (driver_id = (select public.current_driver_id()));

create policy "driver reads own expenses" on public.expenses
  for select to authenticated using (driver_id = (select public.current_driver_id()));

-- ── Reviews ───────────────────────────────────────────────────────────
create policy "customer reads own reviews" on public.reviews
  for select to authenticated using (customer_id = (select auth.uid()));

create policy "customer reviews own completed trip" on public.reviews
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and is_published = false
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.customer_id = (select auth.uid())
        and b.status = 'completed'
    )
  );

-- ── Conversations ─────────────────────────────────────────────────────
create policy "customer reads own conversations" on public.conversations
  for select to authenticated using (customer_id = (select auth.uid()));

create policy "customer reads own messages" on public.messages
  for select to authenticated
  using (
    role in ('user', 'assistant', 'staff')
    and exists (select 1 from public.conversations c where c.id = messages.conversation_id)
  );
