-- Phase 1 of sharing: share a single group with another user (by username or
-- email) with a viewer/editor role. Rewrites RLS on transactions/groups/
-- categories so shared users get group-scoped access.
--
-- SECURITY-CRITICAL — review before running. Owners keep FULL access to their
-- own data via the ownership checks in the helper functions. Account-level
-- sharing (Phase 2) will replace the can_*_account bodies and add account_shares.
--
-- Run against the existing Supabase database (SQL editor or CLI).

-- ── group_shares table ──────────────────────────────────────────────────────
-- Identity is denormalized in both directions because profile reads are
-- restricted to self: the owner's member list needs the invitee's name, and the
-- invitee's sidebar needs the owner's name — neither can read the other's profile.
create table if not exists group_shares (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  owner_username citext,
  owner_name text,
  owner_email text,
  invitee_id uuid references auth.users(id) on delete cascade,
  invitee_username citext,
  invitee_name text,
  invitee_email text,                          -- lower-cased; sole id for email-only invites
  role text check (role in ('viewer','editor')) not null default 'viewer',
  created_at timestamptz default now(),
  check (invitee_id is not null or invitee_email is not null),
  unique (group_id, invitee_id),
  unique (group_id, invitee_email)
);
create index if not exists group_shares_group      on group_shares (group_id);
create index if not exists group_shares_invitee_id on group_shares (invitee_id);
create index if not exists group_shares_invitee_em on group_shares (invitee_email);

-- ── SECURITY DEFINER helpers ────────────────────────────────────────────────
-- All cross-table membership checks live here so RLS policies never read another
-- RLS-protected table directly (avoids recursion). They only ever check the
-- current user (auth.uid() / JWT email), so they cannot leak.

-- Resolve a typed identifier (username OR email) to an account, at invite time.
create or replace function find_user(identifier text)
returns table (id uuid, username citext, name text, email text)
language sql security definer stable as $$
  select id, username, name, email from profiles
  where username = identifier or lower(email) = lower(identifier)
  limit 1;
$$;
grant execute on function find_user(text) to authenticated;

-- Account access is ownership-only until Phase 2 replaces these bodies.
create or replace function can_read_account(p_owner uuid)
returns boolean language sql security definer stable as $$
  select p_owner = auth.uid();
$$;

create or replace function can_write_account(p_owner uuid)
returns boolean language sql security definer stable as $$
  select p_owner = auth.uid();
$$;

create or replace function group_owner(p_group uuid)
returns uuid language sql security definer stable as $$
  select user_id from groups where id = p_group;
$$;

create or replace function is_group_invitee(p_group uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from group_shares
                 where group_id = p_group
                   and (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email'));
$$;

create or replace function shares_group_of_owner(p_owner uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from group_shares gs join groups g on g.id = gs.group_id
                 where g.user_id = p_owner
                   and (gs.invitee_id = auth.uid() or gs.invitee_email = auth.jwt() ->> 'email'));
$$;

create or replace function can_read_group(p_group uuid)
returns boolean language sql security definer stable as $$
  select can_read_account(group_owner(p_group)) or is_group_invitee(p_group);
$$;

create or replace function can_write_group(p_group uuid)
returns boolean language sql security definer stable as $$
  select can_write_account(group_owner(p_group))
      or exists (select 1 from group_shares
                 where group_id = p_group and role = 'editor'
                   and (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email'));
$$;

-- ── group_shares RLS ────────────────────────────────────────────────────────
alter table group_shares enable row level security;

drop policy if exists grp_share_owner on group_shares;
create policy grp_share_owner on group_shares for all
  using (group_owner(group_id) = auth.uid())
  with check (group_owner(group_id) = auth.uid());

drop policy if exists grp_share_invitee_read on group_shares;
create policy grp_share_invitee_read on group_shares for select
  using (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email');

-- Backfill invitee_id/username/name when an email-only invitee signs up.
create or replace function backfill_shares()
returns trigger language plpgsql security definer as $$
begin
  update group_shares
     set invitee_id = new.id, invitee_username = new.username, invitee_name = new.name
   where invitee_id is null and lower(invitee_email) = lower(new.email);
  return new;
end;
$$;
drop trigger if exists on_profile_created_backfill on profiles;
create trigger on_profile_created_backfill after insert on profiles
  for each row execute function backfill_shares();

-- ── Rewrite RLS on owner tables ─────────────────────────────────────────────
-- transactions
drop policy if exists "own transactions" on transactions;
drop policy if exists tx_select on transactions;
create policy tx_select on transactions for select using (
  can_read_account(user_id) or (group_id is not null and can_read_group(group_id))
);
drop policy if exists tx_insert on transactions;
create policy tx_insert on transactions for insert with check (
  can_write_account(user_id)
  or (group_id is not null and can_write_group(group_id) and user_id = group_owner(group_id))
);
drop policy if exists tx_update on transactions;
create policy tx_update on transactions for update
  using      (can_write_account(user_id) or (group_id is not null and can_write_group(group_id)))
  with check (can_write_account(user_id) or (group_id is not null and can_write_group(group_id)));
drop policy if exists tx_delete on transactions;
create policy tx_delete on transactions for delete using (
  can_write_account(user_id) or (group_id is not null and can_write_group(group_id))
);

-- groups
drop policy if exists "own groups" on groups;
drop policy if exists groups_select on groups;
create policy groups_select on groups for select using (
  can_read_account(user_id) or is_group_invitee(id)
);
drop policy if exists groups_ins on groups;
create policy groups_ins on groups for insert with check (can_write_account(user_id));
drop policy if exists groups_upd on groups;
create policy groups_upd on groups for update using (can_write_account(user_id)) with check (can_write_account(user_id));
drop policy if exists groups_del on groups;
create policy groups_del on groups for delete using (can_write_account(user_id));

-- categories (read so shared transactions render with the right label/emoji)
drop policy if exists "own categories" on categories;
drop policy if exists cat_select on categories;
create policy cat_select on categories for select using (
  can_read_account(user_id) or shares_group_of_owner(user_id)
);
drop policy if exists cat_write on categories;
create policy cat_write on categories for all
  using (can_write_account(user_id)) with check (can_write_account(user_id));
