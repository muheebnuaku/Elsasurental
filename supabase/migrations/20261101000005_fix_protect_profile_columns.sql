-- Fix: protect_profile_columns ran as SECURITY DEFINER, so `current_user` was always the owner
-- ('postgres') and the guard never fired — any customer could set their own role to 'admin'.
-- It must run as the caller (SECURITY INVOKER) so current_user is the real role ('authenticated').
-- is_admin() is still SECURITY DEFINER, so the admin check works.

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.company_id is distinct from old.company_id)
     and coalesce((select auth.role()), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
     and not public.is_admin() then
    raise exception 'Only an admin can change role or company'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
