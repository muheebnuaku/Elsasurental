-- The very first account on an empty database becomes the admin (the owner registers first). This
-- happens ONCE: the claim is recorded, so later sign-ups are always customers, even if every admin is
-- removed one day. It also never fires while other accounts exist.

create table public.app_bootstrap (
  id boolean primary key default true check (id),
  first_admin_claimed boolean not null default false
);
alter table public.app_bootstrap enable row level security; -- no policies: database-only

insert into public.app_bootstrap (first_admin_claimed) values (false);

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_phone text := case when new.phone is null or new.phone = '' then null
                       when left(new.phone, 1) = '+' then new.phone
                       else '+' || new.phone end;
begin
  insert into public.profiles (id, phone, email, full_name)
  values (new.id, v_phone, nullif(new.email, ''), nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  if v_phone is not null then
    update public.bookings set customer_id = new.id
     where customer_id is null and contact_phone = v_phone;
  end if;

  -- First account ever, on an empty database: make it the admin and use up the one-time claim.
  if not exists (select 1 from public.profiles where id <> new.id) then
    update public.app_bootstrap set first_admin_claimed = true where id and not first_admin_claimed;
    if found then
      update public.profiles set role = 'admin' where id = new.id;
    end if;
  end if;
  return new;
end;
$$;
