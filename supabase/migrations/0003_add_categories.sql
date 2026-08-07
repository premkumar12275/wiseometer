-- Custom categories, in addition to the built-in defaults in
-- src/constants/categories.js. transactions.category stores the category id:
-- a built-in slug (e.g. 'food') or a custom category's uuid.
--
-- Run this against the existing Supabase database (SQL editor or CLI).

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  label text not null,
  emoji text,
  color text,
  created_at timestamptz default now()
);

alter table categories enable row level security;

drop policy if exists "own categories" on categories;
create policy "own categories" on categories
  for all using (auth.uid() = user_id);
