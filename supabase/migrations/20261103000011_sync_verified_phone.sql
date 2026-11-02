-- Google sign-in: accounts can start without a phone and add one later (verified by SMS code through
-- supabase.auth.updateUser → phone_change). Copy the verified number onto the profile, attach any
-- phone/WhatsApp bookings made for it, and stop customers editing their profile phone directly
-- (bookings trust profiles.phone, so it must only ever hold a verified number).

create or replace function public.sync_verified_phone()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_phone text := case when new.phone is null or new.phone = '' then null
                       when left(new.phone, 1) = '+' then new.phone
                       else '+' || new.phone end;
begin
  if v_phone is null then
    return new;
  end if;
  -- Another profile still holding this number (e.g. an old account) keeps it; never block the auth update.
  if exists (select 1 from public.profiles where phone = v_phone and id <> new.id) then
    return new;
  end if;
  update public.profiles set phone = v_phone where id = new.id and phone is distinct from v_phone;
  update public.bookings set customer_id = new.id where customer_id is null and contact_phone = v_phone;
  return new;
end;
$$;

create trigger on_auth_user_phone_verified
  after update of phone on auth.users
  for each row
  when (new.phone is distinct from old.phone)
  execute function public.sync_verified_phone();

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role
      or new.company_id is distinct from old.company_id
      or new.phone is distinct from old.phone)
     and coalesce((select auth.role()), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
     and not public.is_admin() then
    raise exception 'Only an admin can change role, company or phone'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
