-- Profiles: a unique username + display name per auth user (used for sharing).
create extension if not exists citext;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null,
  name text not null,
  email text not null,
  created_at timestamptz default now(),
  constraint username_format check ((username::text) ~ '^[a-z0-9_]{3,20}$')
);

alter table profiles enable row level security;
create policy "own profile read" on profiles
  for select using (id = auth.uid());
create policy "own profile write" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- NOTE: every `security definer` function below pins `set search_path` and
-- schema-qualifies its tables. This is load-bearing, not style: functions
-- reached from the Auth signup path run as `supabase_auth_admin`, whose
-- search_path excludes `public`, so an unqualified reference fails with a
-- bogus "relation does not exist" and aborts signup. An unpinned search_path
-- is also a privilege-escalation vector. `extensions` is in the path because
-- citext (used by username / invitee_email) lives there on Supabase.
create or replace function username_available(u text)
returns boolean language sql security definer stable
set search_path = public, extensions, pg_temp
as $$
  select not exists (select 1 from public.profiles where username = lower(u));
$$;
grant execute on function username_available(text) to anon, authenticated;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Groups (spending buckets, e.g. "London Trip"). A transaction may optionally
-- belong to one group; grouped transactions still count in the normal totals.
create table groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

alter table groups enable row level security;
-- Policies for groups are defined in the "Sharing" section below.

-- Custom categories (in addition to the built-in defaults in
-- src/constants/categories.js). transactions.category stores the category id:
-- a built-in slug (e.g. 'food') or a custom category's uuid.
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  label text not null,
  emoji text,
  color text,
  created_at timestamptz default now()
);

alter table categories enable row level security;
-- Policies for categories are defined in the "Sharing" section below.

-- Transactions
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  description text,
  amount numeric(12,2) not null,
  type text check (type in ('income','expense','transfer')) not null,
  category text not null,
  account text default 'Main',
  group_id uuid references groups(id) on delete set null,
  source text check (source in ('manual','import')) default 'manual',
  import_file text,
  notes text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

alter table transactions enable row level security;
-- Policies for transactions are defined in the "Sharing" section below.

create index transactions_user_date on transactions(user_id, date desc);
create index transactions_group on transactions(group_id);

-- Data change history / audit trail: every insert/update/delete on
-- transactions is logged via trigger (not application code), so no write
-- path can skip it. Relevant now that shared editors can modify each
-- other's data. group_id is denormalized so history stays visible via
-- can_read_group after the transaction itself is deleted.
create table transaction_history (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  owner_id uuid not null,
  group_id uuid,
  action text check (action in ('insert','update','delete')) not null,
  changed_by uuid references auth.users(id),
  changed_by_username citext,
  changed_by_name text,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz default now()
);
create index transaction_history_tx    on transaction_history (transaction_id);
create index transaction_history_owner on transaction_history (owner_id, changed_at desc);

alter table transaction_history enable row level security;
-- Policy for transaction_history is defined in the "Sharing" section below
-- (can_read_group is not yet defined at this point in the file).

-- Statement import log
create table statement_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  filename text,
  file_path text,
  imported_at timestamptz default now(),
  row_count int
);

alter table statement_imports enable row level security;
-- Policies for statement_imports are defined in the "Sharing" section below.

-- Investments: a separate portfolio ledger (stocks, funds, crypto, real
-- estate, bonds, other), independent of the transactions/expense tracking.
-- Valuation is manual — no market-data API. No group concept.
-- Named container holding several investments (down payment, EMI, renovation),
-- the investments answer to `groups`. target_amount is what progress is
-- measured against — e.g. the full price of the house.
create table investment_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2),
  -- The target is denominated in this currency; amounts are never converted.
  currency text not null default 'NOK' check (currency in ('NOK','USD','INR')),
  notes text,
  created_at timestamptz default now()
);

create table investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  symbol text,
  type text check (type in ('stock','fund','crypto','real_estate','bond','gold','cash','other')) not null default 'other',
  quantity numeric(14,4),
  amount_invested numeric(12,2) not null,
  current_value numeric(12,2) not null,
  -- Portfolio only — the expense ledger is NOK-only. Never converted; totals
  -- are reported per currency.
  currency text not null default 'NOK' check (currency in ('NOK','USD','INR')),
  purchase_date date not null,          -- also the start date of a recurring plan
  notes text,
  folder_id uuid references investment_folders(id) on delete set null,
  -- Recurring contribution plan (e.g. a monthly house EMI). When is_recurring,
  -- the amount paid so far is DERIVED from the schedule in app code and
  -- amount_invested only holds a snapshot of it.
  is_recurring boolean not null default false,
  frequency text check (frequency in ('monthly','quarterly','yearly')),
  contribution_amount numeric(12,2),
  is_ongoing boolean not null default true,
  end_date date,
  source text check (source in ('manual','import')) default 'manual',
  created_at timestamptz default now()
);

-- "From this date the contribution is X." Periods before a change keep the
-- older amount, so a rate reset doesn't rewrite history.
create table investment_contribution_changes (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid references investments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  effective_from date not null,
  amount numeric(12,2) not null,
  note text,
  created_at timestamptz default now()
);
create index investment_contribution_changes_investment_idx
  on investment_contribution_changes (investment_id, effective_from);
create index investments_user on investments(user_id);

alter table investments enable row level security;
alter table investment_folders enable row level security;
alter table investment_contribution_changes enable row level security;
-- Policies for all three are defined in the "Sharing" section below.

-- ── Sharing (group + account) ────────────────────────────────────────────────
-- See docs/sharing-design.md. Account-level sharing (Phase 2) will replace the
-- can_*_account bodies and add account_shares.

create table group_shares (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
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
  unique (group_id, invitee_id),
  unique (group_id, invitee_email)
);
create index group_shares_group      on group_shares (group_id);
create index group_shares_invitee_id on group_shares (invitee_id);
create index group_shares_invitee_em on group_shares (invitee_email);

-- Whole-account share (Phase 2).
create table account_shares (
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
create index account_shares_owner      on account_shares (owner_id);
create index account_shares_invitee_id on account_shares (invitee_id);
create index account_shares_invitee_em on account_shares (invitee_email);

alter table account_shares enable row level security;
create policy acc_share_owner on account_shares for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy acc_share_invitee_read on account_shares for select
  using (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email');

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

-- Distinct tags already used on an owner's transactions, for tag-entry
-- autocomplete.
create or replace function get_transaction_tags(p_owner uuid)
returns text[] language sql security definer stable
set search_path = public, extensions, pg_temp
as $$
  select coalesce(array_agg(distinct tag order by tag), '{}'::text[])
  from public.transactions, unnest(tags) as tag
  where transactions.user_id = p_owner and public.can_read_account(p_owner);
$$;
grant execute on function get_transaction_tags(uuid) to authenticated;

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

alter table group_shares enable row level security;
create policy grp_share_owner on group_shares for all
  using (group_owner(group_id) = auth.uid()) with check (group_owner(group_id) = auth.uid());
create policy grp_share_invitee_read on group_shares for select
  using (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email');

-- Runs during Auth signup as `supabase_auth_admin`, whose search_path excludes
-- `public` — so the table references MUST be schema-qualified and search_path
-- pinned, or the trigger aborts the signup with a bogus "relation does not
-- exist". Same reason handle_new_user writes to public.profiles.
create or replace function backfill_shares()
returns trigger
language plpgsql
security definer
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
create trigger on_profile_created_backfill after insert on profiles
  for each row execute function backfill_shares();

-- transactions
create policy tx_select on transactions for select using (
  can_read_account(user_id) or (group_id is not null and can_read_group(group_id))
);
create policy tx_insert on transactions for insert with check (
  can_write_account(user_id)
  or (group_id is not null and can_write_group(group_id) and user_id = group_owner(group_id))
);
create policy tx_update on transactions for update
  using      (can_write_account(user_id) or (group_id is not null and can_write_group(group_id)))
  with check (can_write_account(user_id) or (group_id is not null and can_write_group(group_id)));
create policy tx_delete on transactions for delete using (
  can_write_account(user_id) or (group_id is not null and can_write_group(group_id))
);

-- transaction_history: logged by trigger (security definer), never written
-- to directly by clients.
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
create trigger transactions_history_trigger
  after insert or update or delete on transactions
  for each row execute function log_transaction_change();

create policy tx_history_select on transaction_history for select using (
  can_read_account(owner_id) or (group_id is not null and can_read_group(group_id))
);

-- groups
create policy groups_select on groups for select using (
  can_read_account(user_id) or is_group_invitee(id)
);
create policy groups_ins on groups for insert with check (can_write_account(user_id));
create policy groups_upd on groups for update using (can_write_account(user_id)) with check (can_write_account(user_id));
create policy groups_del on groups for delete using (can_write_account(user_id));

-- categories
create policy cat_select on categories for select using (
  can_read_account(user_id) or shares_group_of_owner(user_id)
);
create policy cat_write on categories for all
  using (can_write_account(user_id)) with check (can_write_account(user_id));

-- statement_imports (account-scoped)
create policy imports_select on statement_imports for select using (can_read_account(user_id));
create policy imports_write on statement_imports for all
  using (can_write_account(user_id)) with check (can_write_account(user_id));

-- investments (account-scoped, no group concept)
create policy inv_select on investments for select using (can_read_account(user_id));
create policy inv_write on investments for all
  using (can_write_account(user_id)) with check (can_write_account(user_id));

-- investment folders + contribution changes (account-scoped)
create policy inv_folder_select on investment_folders for select using (can_read_account(user_id));
create policy inv_folder_write on investment_folders for all
  using (can_write_account(user_id)) with check (can_write_account(user_id));

create policy inv_change_select on investment_contribution_changes for select
  using (can_read_account(user_id));
create policy inv_change_write on investment_contribution_changes for all
  using (can_write_account(user_id)) with check (can_write_account(user_id));
