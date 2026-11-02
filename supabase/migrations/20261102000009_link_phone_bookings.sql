-- When someone signs up with a phone number, attach any bookings an admin made for that number
-- (phone/WhatsApp bookings) to their new account, so they see them under "My trips".

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
  return new;
end;
$$;
