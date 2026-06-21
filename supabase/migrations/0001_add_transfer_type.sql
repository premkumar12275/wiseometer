-- Allow a neutral 'transfer' transaction type, in addition to income/expense.
-- Transfers (e.g. money moved between own accounts, or received from family)
-- are excluded from income and expense totals on the dashboard.
--
-- Run this against the existing Supabase database (SQL editor or CLI).

alter table transactions
  drop constraint if exists transactions_type_check;

alter table transactions
  add constraint transactions_type_check
  check (type in ('income', 'expense', 'transfer'));
