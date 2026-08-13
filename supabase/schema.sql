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

create or replace function username_available(u text)
returns boolean language sql security definer stable as $$
  select not exists (select 1 from profiles where username = lower(u));
$$;
grant execute on function username_available(text) to anon, authenticated;

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
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
  created_at timestamptz default now()
);

alter table transactions enable row level security;
-- Policies for transactions are defined in the "Sharing" section below.

create index transactions_user_date on transactions(user_id, date desc);
create index transactions_group on transactions(group_id);

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
create policy "own imports" on statement_imports
  for all using (auth.uid() = user_id);

-- ── Sharing (Phase 1: group sharing) ─────────────────────────────────────────
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

create or replace function find_user(identifier text)
returns table (id uuid, username citext, name text, email text)
language sql security definer stable as $$
  select id, username, name, email from profiles
  where username = identifier or lower(email) = lower(identifier)
  limit 1;
$$;
grant execute on function find_user(text) to authenticated;

create or replace function can_read_account(p_owner uuid)
returns boolean language sql security definer stable as $$ select p_owner = auth.uid(); $$;

create or replace function can_write_account(p_owner uuid)
returns boolean language sql security definer stable as $$ select p_owner = auth.uid(); $$;

create or replace function group_owner(p_group uuid)
returns uuid language sql security definer stable as $$ select user_id from groups where id = p_group; $$;

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

alter table group_shares enable row level security;
create policy grp_share_owner on group_shares for all
  using (group_owner(group_id) = auth.uid()) with check (group_owner(group_id) = auth.uid());
create policy grp_share_invitee_read on group_shares for select
  using (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email');

create or replace function backfill_shares()
returns trigger language plpgsql security definer as $$
begin
  update group_shares
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
