-- The fleet is more than two minivan sizes: 7-seater SUVs (Toyota Highlander, Acura) now, more later
-- (e.g. Land Cruiser). All chauffeur-driven.
--  1. vehicle_types.category: "van" types are picked automatically by group size; an "suv" is only
--     used when the customer chooses it.
--  2. Fixed destination prices move from two hard-coded columns (8 / 14 seats) to one row per
--     destination × vehicle type, so any new vehicle type can have its own price.

alter table public.vehicle_types
  add column category text not null default 'van' check (category in ('van', 'suv'));

create table public.destination_prices (
  destination_id uuid not null references public.destinations (id) on delete cascade,
  vehicle_type_id uuid not null references public.vehicle_types (id) on delete cascade,
  price numeric(12,2) not null check (price >= 0),
  primary key (destination_id, vehicle_type_id)
);

alter table public.destination_prices enable row level security;

create policy "admin full access" on public.destination_prices for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "public read active destination prices" on public.destination_prices
  for select to anon, authenticated
  using (exists (select 1 from public.destinations d where d.id = destination_id and d.active));

-- Carry the existing prices over (up to 8 seats → the 8-seater price, larger → the 14-seater price).
insert into public.destination_prices (destination_id, vehicle_type_id, price)
select d.id, vt.id, case when vt.seats <= 8 then d.price_8_seater else d.price_14_seater end
  from public.destinations d
 cross join public.vehicle_types vt;

alter table public.destinations
  drop column price_8_seater,
  drop column price_14_seater;
