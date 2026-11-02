-- Business contact details the owner edits in Admin → Business (phone, WhatsApp, email, address).
-- One row only. Everyone can read it (it's shown on the website); only admins can change it.

create table public.business_settings (
  id boolean primary key default true check (id),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  whatsapp text not null check (whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address text not null check (length(address) between 2 and 200),
  updated_at timestamptz not null default now()
);

alter table public.business_settings enable row level security;

create policy "admin full access" on public.business_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "public read business settings" on public.business_settings
  for select to anon, authenticated using (true);

create trigger business_settings_updated_at before update on public.business_settings
  for each row execute function public.set_updated_at();

insert into public.business_settings (phone, whatsapp, email, address)
values ('+233545415019', '+233545415019', 'bookings@elsasu.com', 'Accra, Ghana');
