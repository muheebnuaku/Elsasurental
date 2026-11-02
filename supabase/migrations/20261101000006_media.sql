-- Media for richer pages: a photo per destination, and videos per van (detail-page gallery).
alter table public.destinations add column image_url text;
alter table public.vehicles add column videos text[] not null default '{}';
