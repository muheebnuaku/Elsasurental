-- Public bucket for short van videos shown in the van gallery (uploaded by admins; storage RLS: admins only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-videos', 'vehicle-videos', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;
