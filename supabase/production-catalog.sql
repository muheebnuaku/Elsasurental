-- Production starter catalogue: van types, prices, destinations, add-ons.
-- Run ONCE on the live database (Supabase dashboard → SQL Editor → paste → Run).
-- Safe to re-run: existing rows are left alone. No test users, bookings or vans.
-- Copied from seed.sql (keep the two in sync). Add real vans in Admin → Fleet.
-- TODO(confirm): every price is a placeholder. Set real ones in Admin → Pricing.

-- ── Vehicle types ─────────────────────────────────────────────────────
insert into public.vehicle_types (id, slug, name, seats, luggage_capacity, description, sort_order) values
  ('10000000-0000-0000-0000-000000000008', '8-seater', '8-Seater Minivan', 8, 6,
   'Comfortable air-conditioned minivan for families, small groups and airport runs.', 1),
  ('10000000-0000-0000-0000-000000000014', '14-seater', '14-Seater Minivan', 14, 10,
   'Spacious van for church groups, weddings, funerals, tours and staff shuttles.', 2)
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
  ('10000000-0000-0000-0000-000000000014', 'corporate_shuttle', 1300,  60,  4, 10, 160, 10)
on conflict (vehicle_type_id, trip_type) where active do nothing;

-- ── Outstation destinations from Accra (placeholder prices, same-day return) ──
insert into public.destinations (slug, name, region, price_8_seater, price_14_seater, est_hours, distance_km, lat, lng, description) values
  ('aburi',      'Aburi',          'Eastern',       1400, 2000, 1.0,  40, 5.8486, -0.1750, 'Botanical gardens and cool mountain air, an easy day out from Accra.'),
  ('shai-hills', 'Shai Hills',     'Greater Accra', 1400, 2000, 1.0,  55, 5.8960,  0.0630, 'Wildlife reserve with baboons, antelope and caves.'),
  ('akosombo',   'Akosombo',       'Eastern',       2000, 2900, 2.0, 105, 6.2950,  0.0560, 'Volta Lake, the dam and boat cruises.'),
  ('ada',        'Ada',            'Greater Accra', 2100, 3000, 2.0, 115, 5.7830,  0.6330, 'Beaches, river estuary and resorts at Ada Foah.'),
  ('cape-coast', 'Cape Coast',     'Central',       2600, 3700, 3.0, 145, 5.1053, -1.2466, 'Cape Coast Castle and the historic coast.'),
  ('elmina',     'Elmina',         'Central',       2700, 3800, 3.3, 160, 5.0847, -1.3509, 'Elmina Castle and the fishing harbour.'),
  ('kakum',      'Kakum National Park', 'Central',  2800, 3900, 3.5, 170, 5.3500, -1.3830, 'Canopy walkway through the rainforest.'),
  ('ho',         'Ho',             'Volta',         2900, 4100, 3.5, 160, 6.6000,  0.4700, 'Gateway to Volta Region waterfalls and mountains.'),
  ('takoradi',   'Takoradi',       'Western',       3600, 5000, 4.5, 230, 4.8980, -1.7600, 'Twin city Sekondi-Takoradi and Western Region beaches.'),
  ('kumasi',     'Kumasi',         'Ashanti',       4200, 5900, 5.0, 250, 6.6885, -1.6244, 'The Garden City: Manhyia Palace, Kejetia and the Ashanti heartland.')
on conflict (slug) do nothing;

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
