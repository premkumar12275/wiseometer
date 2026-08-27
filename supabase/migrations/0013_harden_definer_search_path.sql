-- Hardening follow-up to 0012. That migration fixed only the two functions in
-- the signup path; a diagnostic showed is_group_invitee, shares_group_of_owner
-- and can_write_group carry the identical defect — SECURITY DEFINER with no
-- pinned search_path and unqualified table references.
--
-- Those three don't break today because they're only reached through PostgREST
-- (where search_path already includes `public`), but they are the same latent
-- bug, and an unpinned search_path on a SECURITY DEFINER function is a
-- privilege-escalation vector (Supabase lints this as function_search_path_mutable).
--
-- This migration re-declares EVERY security definer function with:
--   * set search_path = public, extensions, pg_temp
--   * fully schema-qualified table and function references
--
-- `extensions` is included because citext lives there on Supabase, and these
-- functions compare citext columns (username, invitee_email) — pinning to bare
-- `public` would leave the citext operators unresolvable. Non-existent schemas
-- in a search_path are ignored, so this is safe either way.
--
-- Supersedes 0012 (which used `public, pg_temp`); re-running is harmless.
-- Run against the existing Supabase database (SQL editor or CLI).

-- ── Signup path ─────────────────────────────────────────────────────────────
create or replace function username_available(u text)
returns boolean
language sql security definer stable
set search_path = public, extensions, pg_temp
as $$
  select not exists (select 1 from public.profiles where username = lower(u));
$$;
grant execute on function username_available(text) to anon, authenticated;

create or replace function handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public, extensions, pg_temp
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

create or replace function backfill_shares()
returns trigger
language plpgsql security definer
set search_path = public, extensions, pg_temp
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

-- ── Sharing helpers ─────────────────────────────────────────────────────────
create or replace function find_user(identifier text)
returns table (id uuid, username citext, name text, email text)
language sql security definer stable
set search_path = public, extensions, pg_temp
as $$
  select id, username, name, email from public.profiles
  where username = identifier or lower(email) = lower(identifier)
  limit 1;
$$;
grant execute on function find_user(text) to authenticated;

create or replace function can_read_account(p_owner uuid)
returns boolean language sql security definer stable
set search_path = public, extensions, pg_temp
as $$
  select p_owner = auth.uid()
      or exists (select 1 from public.account_shares
                 where owner_id = p_owner
                   and (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email'));
$$;

create or replace function can_write_account(p_owner uuid)
returns boolean language sql security definer stable
set search_path = public, extensions, pg_temp
as $$
  select p_owner = auth.uid()
      or exists (select 1 from public.account_shares
                 where owner_id = p_owner and role = 'editor'
                   and (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email'));
$$;

create or replace function group_owner(p_group uuid)
returns uuid language sql security definer stable
set search_path = public, extensions, pg_temp
as $$ select user_id from public.groups where id = p_group; $$;

create or replace function is_group_invitee(p_group uuid)
returns boolean language sql security definer stable
set search_path = public, extensions, pg_temp
as $$
  select exists (select 1 from public.group_shares
                 where group_id = p_group
                   and (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email'));
$$;

create or replace function shares_group_of_owner(p_owner uuid)
returns boolean language sql security definer stable
set search_path = public, extensions, pg_temp
as $$
  select exists (select 1 from public.group_shares gs join public.groups g on g.id = gs.group_id
                 where g.user_id = p_owner
                   and (gs.invitee_id = auth.uid() or gs.invitee_email = auth.jwt() ->> 'email'));
$$;

create or replace function can_read_group(p_group uuid)
returns boolean language sql security definer stable
set search_path = public, extensions, pg_temp
as $$
  select public.can_read_account(public.group_owner(p_group)) or public.is_group_invitee(p_group);
$$;

create or replace function can_write_group(p_group uuid)
returns boolean language sql security definer stable
set search_path = public, extensions, pg_temp
as $$
  select public.can_write_account(public.group_owner(p_group))
      or exists (select 1 from public.group_shares
                 where group_id = p_group and role = 'editor'
                   and (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email'));
$$;

-- ── Tags + audit trail ──────────────────────────────────────────────────────
create or replace function get_transaction_tags(p_owner uuid)
returns text[] language sql security definer stable
set search_path = public, extensions, pg_temp
as $$
  select coalesce(array_agg(distinct tag order by tag), '{}'::text[])
  from public.transactions, unnest(tags) as tag
  where transactions.user_id = p_owner and public.can_read_account(p_owner);
$$;
grant execute on function get_transaction_tags(uuid) to authenticated;

create or replace function log_transaction_change()
returns trigger
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_username citext;
  v_name text;
begin
  select username, name into v_username, v_name from public.profiles where id = auth.uid();
  insert into public.transaction_history
    (transaction_id, owner_id, group_id, action, changed_by, changed_by_username, changed_by_name, old_data, new_data)
  values (
    coalesce(new.id, old.id),
    coalesce(new.user_id, old.user_id),
    coalesce(new.group_id, old.group_id),
    lower(tg_op),
    auth.uid(), v_username, v_name,
    case when tg_op <> 'INSERT' then to_jsonb(old) else null end,
    case when tg_op <> 'DELETE' then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;
