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
create policy "own groups" on groups
  for all using (auth.uid() = user_id);

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
create policy "own categories" on categories
  for all using (auth.uid() = user_id);

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
create policy "own transactions" on transactions
  for all using (auth.uid() = user_id);

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
