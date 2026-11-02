-- Starter catalogue: vehicle types, prices, destinations, add-ons. No test users, bookings or vehicles.
-- Live database: Supabase dashboard → SQL Editor → paste ALL of this file → Run.
-- Safe to re-run: rows that already exist are left alone, so running it again only adds what's new
-- (e.g. the 7-seater SUV type and its prices). Local `pnpm db:reset` loads it before seed.sql.
-- Add real vehicles (with plates) in Admin → Fleet.
-- TODO(confirm): every price is a placeholder. Set real ones in Admin → Pricing.

-- ── Vehicle types ─────────────────────────────────────────────────────
-- category "van": suggested automatically by group size. "suv": only when the customer chooses it.
insert into public.vehicle_types (id, slug, name, category, seats, luggage_capacity, description, sort_order) values
  ('10000000-0000-0000-0000-000000000008', '8-seater', '8-Seater Minivan', 'van', 8, 6,
   'Comfortable air-conditioned minivan for families, small groups and airport runs.', 1),
  ('10000000-0000-0000-0000-000000000014', '14-seater', '14-Seater Minivan', 'van', 14, 10,
   'Spacious van for church groups, weddings, funerals, tours and staff shuttles.', 2),
  ('10000000-0000-0000-0000-000000000007', '7-seater-suv', '7-Seater SUV', 'suv', 7, 4,
   'Toyota Highlander, Acura or similar. Executive comfort for visitors, VIPs and smaller groups, always with a driver.', 3)
on conflict (slug) do nothing;

-- ── Pricing rules (placeholders, GHS) ─────────────────────────────────
-- multi_day: base/included values are PER DAY.
-- outstation: used only for routes that aren't in `destinations` (per-km style pricing).
insert into public.pricing_rules
  (vehicle_type_id, trip_type, base_price, included_km, included_hours, extra_km_rate, extra_hour_rate, night_surcharge_pct)
values
  -- 8-seater
  ('10000000-0000-0000-0000-000000000008', 'airport',            700,  40,  2,  7, 120, 15),
  ('10000000-0000-0000-0000-000000000008', 'half_day',          1200, 100,  5,  7, 120, 15),
  ('10000000-0000-0000-0000-000000000008', 'full_day',          2000, 200, 10,  7, 120, 15),
  ('10000000-0000-0000-0000-000000000008', 'multi_day',         1900, 250, 10,  7, 120, 15),
  ('10000000-0000-0000-0000-000000000008', 'outstation',        1500, 150, 10,  8, 120, 15),
  ('10000000-0000-0000-0000-000000000008', 'event',             1600, 100,  8,  7, 130, 15),
  ('10000000-0000-0000-0000-000000000008', 'corporate_shuttle',  900,  60,  4,  7, 110, 10),
  -- 14-seater
  ('10000000-0000-0000-0000-000000000014', 'airport',           1000,  40,  2, 10, 170, 15),
  ('10000000-0000-0000-0000-000000000014', 'half_day',          1700, 100,  5, 10, 170, 15),
  ('10000000-0000-0000-0000-000000000014', 'full_day',          2800, 200, 10, 10, 170, 15),
  ('10000000-0000-0000-0000-000000000014', 'multi_day',         2650, 250, 10, 10, 170, 15),
  ('10000000-0000-0000-0000-000000000014', 'outstation',        2100, 150, 10, 11, 170, 15),
  ('10000000-0000-0000-0000-000000000014', 'event',             2300, 100,  8, 10, 180, 15),
  ('10000000-0000-0000-0000-000000000014', 'corporate_shuttle', 1300,  60,  4, 10, 160, 10),
  -- 7-seater SUV
  ('10000000-0000-0000-0000-000000000007', 'airport',            900,  40,  2,  9, 150, 15),
  ('10000000-0000-0000-0000-000000000007', 'half_day',          1500, 100,  5,  9, 150, 15),
  ('10000000-0000-0000-0000-000000000007', 'full_day',          2500, 200, 10,  9, 150, 15),
  ('10000000-0000-0000-0000-000000000007', 'multi_day',         2400, 250, 10,  9, 150, 15),
  ('10000000-0000-0000-0000-000000000007', 'outstation',        1800, 150, 10, 10, 150, 15),
  ('10000000-0000-0000-0000-000000000007', 'event',             2000, 100,  8,  9, 160, 15),
  ('10000000-0000-0000-0000-000000000007', 'corporate_shuttle', 1100,  60,  4,  9, 140, 10)
on conflict (vehicle_type_id, trip_type) where active do nothing;

-- ── Outstation destinations from Accra (same-day return) ──────────────
insert into public.destinations (slug, name, region, est_hours, distance_km, lat, lng, description) values
  ('aburi',      'Aburi',          'Eastern',       1.0,  40, 5.8486, -0.1750, 'Botanical gardens and cool mountain air, an easy day out from Accra.'),
  ('shai-hills', 'Shai Hills',     'Greater Accra', 1.0,  55, 5.8960,  0.0630, 'Wildlife reserve with baboons, antelope and caves.'),
  ('akosombo',   'Akosombo',       'Eastern',       2.0, 105, 6.2950,  0.0560, 'Volta Lake, the dam and boat cruises.'),
  ('ada',        'Ada',            'Greater Accra', 2.0, 115, 5.7830,  0.6330, 'Beaches, river estuary and resorts at Ada Foah.'),
  ('cape-coast', 'Cape Coast',     'Central',       3.0, 145, 5.1053, -1.2466, 'Cape Coast Castle and the historic coast.'),
  ('elmina',     'Elmina',         'Central',       3.3, 160, 5.0847, -1.3509, 'Elmina Castle and the fishing harbour.'),
  ('kakum',      'Kakum National Park', 'Central',  3.5, 170, 5.3500, -1.3830, 'Canopy walkway through the rainforest.'),
  ('ho',         'Ho',             'Volta',         3.5, 160, 6.6000,  0.4700, 'Gateway to Volta Region waterfalls and mountains.'),
  ('takoradi',   'Takoradi',       'Western',       4.5, 230, 4.8980, -1.7600, 'Twin city Sekondi-Takoradi and Western Region beaches.'),
  ('kumasi',     'Kumasi',         'Ashanti',       5.0, 250, 6.6885, -1.6244, 'The Garden City: Manhyia Palace, Kejetia and the Ashanti heartland.')
on conflict (slug) do nothing;

-- Fixed price per destination and vehicle type (placeholders, GHS).
insert into public.destination_prices (destination_id, vehicle_type_id, price)
select d.id, vt.id, v.price
  from (values
    ('aburi',      1400, 2000, 1700),
    ('shai-hills', 1400, 2000, 1700),
    ('akosombo',   2000, 2900, 2400),
    ('ada',        2100, 3000, 2500),
    ('cape-coast', 2600, 3700, 3100),
    ('elmina',     2700, 3800, 3200),
    ('kakum',      2800, 3900, 3300),
    ('ho',         2900, 4100, 3400),
    ('takoradi',   3600, 5000, 4200),
    ('kumasi',     4200, 5900, 4900)
  ) as p(slug, van8, van14, suv7)
 cross join lateral (values ('8-seater', p.van8), ('14-seater', p.van14), ('7-seater-suv', p.suv7)) as v(type_slug, price)
  join public.destinations d on d.slug = p.slug
  join public.vehicle_types vt on vt.slug = v.type_slug
on conflict (destination_id, vehicle_type_id) do nothing;

-- ── Add-ons (placeholders) ────────────────────────────────────────────
insert into public.addons (slug, name, description, price, unit) values
  ('extra-stop',  'Extra stop',        'One additional pick-up or drop-off point on the route.', 50, 'per_item'),
  ('decorations', 'Event decorations', 'Ribbons and flowers for weddings and special occasions.', 300, 'per_trip'),
  ('child-seat',  'Child seat',        'Forward-facing child car seat.', 40, 'per_item')
on conflict (slug) do nothing;

-- Temporary destination photos (Unsplash licence). TODO(confirm): replace with Elsasu's own.
update public.destinations d set image_url = 'https://images.unsplash.com/photo-' || v.id || '?auto=format&fit=crop&w=1200&q=75'
from (values
  ('aburi', '1590326218569-ae87b4370b52'),
  ('shai-hills', '1636389396809-c3ab57b60d93'),
  ('akosombo', '1740447342649-8b68b10b42d0'),
  ('ada', '1743004144286-bc05445c7f1a'),
  ('cape-coast', '1651860282137-a59f01d2db7b'),
  ('elmina', '1636783186375-b8bb268df9c0'),
  ('kakum', '1647215480241-b150d74c75c0'),
  ('ho', '1743004144406-e1eb62b5190a'),
  ('takoradi', '1624832040555-d9f92f7be672'),
  ('kumasi', '1506126208421-3345d63a05d8')
) as v(slug, id)
where d.slug = v.slug and d.image_url is null;
