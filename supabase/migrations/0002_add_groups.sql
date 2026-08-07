-- Spending groups (e.g. "London Trip"). A transaction may optionally belong to
-- one group; grouped transactions still count in the normal dashboard totals.
--
-- Run this against the existing Supabase database (SQL editor or CLI).

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

alter table groups enable row level security;

drop policy if exists "own groups" on groups;
create policy "own groups" on groups
  for all using (auth.uid() = user_id);

alter table transactions
  add column if not exists group_id uuid references groups(id) on delete set null;

create index if not exists transactions_group on transactions(group_id);
