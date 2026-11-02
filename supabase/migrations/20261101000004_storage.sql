-- Storage buckets.
--   vehicle-photos  public   fleet photos shown on the site
--   trip-photos     private  driver odometer/condition photos, path: {booking_id}/{file}
--   documents       private  receipts & invoices, served to customers via signed URLs from the server

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('vehicle-photos', 'vehicle-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('trip-photos', 'trip-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "admin manages all storage" on storage.objects
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "driver uploads photos for own trips" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trip-photos'
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and b.driver_id = (select public.current_driver_id())
    )
  );

create policy "driver reads photos for own trips" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'trip-photos'
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and b.driver_id = (select public.current_driver_id())
    )
  );
