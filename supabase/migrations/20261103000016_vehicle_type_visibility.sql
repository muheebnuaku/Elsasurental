-- Admin can hide a vehicle type from the website (and quotes) without deleting it or its history.

alter table public.vehicle_types add column active boolean not null default true;

drop policy "public read vehicle types" on public.vehicle_types;
create policy "public read active vehicle types" on public.vehicle_types
  for select to anon, authenticated using (active);
