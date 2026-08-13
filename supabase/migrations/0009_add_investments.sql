-- Investments: a separate portfolio ledger (stocks, funds, crypto, real
-- estate, bonds, other), independent of the transactions/expense tracking.
-- Valuation is manual — no market-data API. No group concept; shares the
-- same account-level RLS helpers as everything else.
--
-- Run against the existing Supabase database (SQL editor or CLI).

create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  symbol text,
  type text check (type in ('stock','fund','crypto','real_estate','bond','other')) not null default 'other',
  quantity numeric(14,4),
  amount_invested numeric(12,2) not null,
  current_value numeric(12,2) not null,
  purchase_date date not null,
  notes text,
  source text check (source in ('manual','import')) default 'manual',
  created_at timestamptz default now()
);
create index if not exists investments_user on investments(user_id);

alter table investments enable row level security;
drop policy if exists inv_select on investments;
create policy inv_select on investments for select using (can_read_account(user_id));
drop policy if exists inv_write on investments;
create policy inv_write on investments for all
  using (can_write_account(user_id)) with check (can_write_account(user_id));
