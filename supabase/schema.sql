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
