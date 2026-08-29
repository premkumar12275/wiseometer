-- Investment folders + recurring contribution plans.
--
-- Two additions, both driven by the same use case ("House investment 1"):
--
--   1. investment_folders — a named container holding several investments
--      (down payment, loan EMI, renovation), mirroring how `groups` work for
--      transactions. A folder carries an optional target_amount: the total
--      price of the thing being paid for, which progress is measured against.
--
--   2. Recurring plans on investments — an investment can be a repeating
--      contribution (a monthly EMI) rather than a one-off purchase. The amount
--      paid so far is DERIVED from the schedule, so it grows on its own as
--      months pass without anything having to write to the row.
--
--      investment_contribution_changes records EMI changes: "from this date the
--      amount is X". Periods before a change keep the older amount, so the
--      historical total stays correct after a rate reset.
--
-- Run against the existing Supabase database (SQL editor or CLI).

-- ── Folders ─────────────────────────────────────────────────────────────────
create table if not exists investment_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2),
  notes text,
  created_at timestamptz default now()
);

alter table investment_folders enable row level security;

drop policy if exists inv_folder_select on investment_folders;
create policy inv_folder_select on investment_folders for select
  using (can_read_account(user_id));

drop policy if exists inv_folder_write on investment_folders;
create policy inv_folder_write on investment_folders for all
  using (can_write_account(user_id)) with check (can_write_account(user_id));

-- Deleting a folder keeps its investments; they fall back to Ungrouped.
alter table investments add column if not exists folder_id uuid
  references investment_folders(id) on delete set null;

-- ── Recurring plan ──────────────────────────────────────────────────────────
-- purchase_date doubles as the plan's start date; amount_invested holds a
-- snapshot of the derived total (the app always recomputes for display).
alter table investments add column if not exists is_recurring boolean not null default false;
alter table investments add column if not exists frequency text
  check (frequency in ('monthly','quarterly','yearly'));
alter table investments add column if not exists contribution_amount numeric(12,2);
alter table investments add column if not exists is_ongoing boolean not null default true;
alter table investments add column if not exists end_date date;

create table if not exists investment_contribution_changes (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid references investments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  effective_from date not null,
  amount numeric(12,2) not null,
  note text,
  created_at timestamptz default now()
);

create index if not exists investment_contribution_changes_investment_idx
  on investment_contribution_changes (investment_id, effective_from);

alter table investment_contribution_changes enable row level security;

drop policy if exists inv_change_select on investment_contribution_changes;
create policy inv_change_select on investment_contribution_changes for select
  using (can_read_account(user_id));

drop policy if exists inv_change_write on investment_contribution_changes;
create policy inv_change_write on investment_contribution_changes for all
  using (can_write_account(user_id)) with check (can_write_account(user_id));
