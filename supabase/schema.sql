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
  source text check (source in ('manual','import')) default 'manual',
  import_file text,
  created_at timestamptz default now()
);

alter table transactions enable row level security;
create policy "own transactions" on transactions
  for all using (auth.uid() = user_id);

create index transactions_user_date on transactions(user_id, date desc);

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
