-- Phase 2 of sharing: share your ENTIRE account with another user (by username
-- or email) with a viewer/editor role. This works by replacing the bodies of
-- can_read_account / can_write_account to consult account_shares — which
-- automatically extends access across transactions/groups/categories/imports,
-- since their RLS already routes through those helpers.
--
-- SECURITY-CRITICAL — review before running. Owners keep full access.
-- Run against the existing Supabase database (SQL editor or CLI).

-- ── account_shares table ────────────────────────────────────────────────────
create table if not exists account_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  owner_username citext,
  owner_name text,
  owner_email text,
  invitee_id uuid references auth.users(id) on delete cascade,
  invitee_username citext,
  invitee_name text,
  invitee_email text,
  role text check (role in ('viewer','editor')) not null default 'viewer',
  created_at timestamptz default now(),
  check (invitee_id is not null or invitee_email is not null),
  unique (owner_id, invitee_id),
  unique (owner_id, invitee_email)
);
create index if not exists account_shares_owner      on account_shares (owner_id);
create index if not exists account_shares_invitee_id on account_shares (invitee_id);
create index if not exists account_shares_invitee_em on account_shares (invitee_email);

-- ── Replace the account helper bodies (were ownership-only in Phase 1) ───────
create or replace function can_read_account(p_owner uuid)
returns boolean language sql security definer stable as $$
  select p_owner = auth.uid()
      or exists (select 1 from account_shares
                 where owner_id = p_owner
                   and (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email'));
$$;

create or replace function can_write_account(p_owner uuid)
returns boolean language sql security definer stable as $$
  select p_owner = auth.uid()
      or exists (select 1 from account_shares
                 where owner_id = p_owner and role = 'editor'
                   and (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email'));
$$;

-- ── account_shares RLS ──────────────────────────────────────────────────────
alter table account_shares enable row level security;

drop policy if exists acc_share_owner on account_shares;
create policy acc_share_owner on account_shares for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists acc_share_invitee_read on account_shares;
create policy acc_share_invitee_read on account_shares for select
  using (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email');

-- ── Backfill both share tables when an email-only invitee signs up ───────────
create or replace function backfill_shares()
returns trigger language plpgsql security definer as $$
begin
  update group_shares
     set invitee_id = new.id, invitee_username = new.username, invitee_name = new.name
   where invitee_id is null and lower(invitee_email) = lower(new.email);
  update account_shares
     set invitee_id = new.id, invitee_username = new.username, invitee_name = new.name
   where invitee_id is null and lower(invitee_email) = lower(new.email);
  return new;
end;
$$;

-- ── statement_imports: account-scoped (now includes account shares) ──────────
drop policy if exists "own imports" on statement_imports;
drop policy if exists imports_select on statement_imports;
create policy imports_select on statement_imports for select using (can_read_account(user_id));
drop policy if exists imports_write on statement_imports;
create policy imports_write on statement_imports for all
  using (can_write_account(user_id)) with check (can_write_account(user_id));
