-- Fix: signup failed with `relation "group_shares" does not exist` (42P01)
-- even though public.group_shares exists.
--
-- backfill_shares() runs from the on_profile_created_backfill trigger during
-- an Auth signup, i.e. as `supabase_auth_admin`, whose search_path does NOT
-- include `public`. A SECURITY DEFINER function inherits the caller's
-- search_path unless it pins its own, so the unqualified `group_shares` /
-- `account_shares` references resolved against the wrong schema and aborted
-- the whole signup transaction.
--
-- Fixed by schema-qualifying both tables AND pinning search_path (the latter
-- is also the recommended hardening for SECURITY DEFINER functions, since an
-- unpinned search_path is a privilege-escalation vector).
--
-- Run against the existing Supabase database (SQL editor or CLI).

create or replace function backfill_shares()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.group_shares
     set invitee_id = new.id, invitee_username = new.username, invitee_name = new.name
   where invitee_id is null and lower(invitee_email) = lower(new.email);
  update public.account_shares
     set invitee_id = new.id, invitee_username = new.username, invitee_name = new.name
   where invitee_id is null and lower(invitee_email) = lower(new.email);
  return new;
end;
$$;

-- Same hardening for the other function in the signup path. It already
-- qualified public.profiles, so it worked — but pin it for consistency.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.raw_user_meta_data ? 'username' then
    insert into public.profiles (id, username, name, email)
    values (
      new.id,
      lower(new.raw_user_meta_data ->> 'username'),
      coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), new.raw_user_meta_data ->> 'username'),
      new.email
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
