-- Data change history / audit trail for transactions. Every insert, update,
-- and delete on `transactions` is logged automatically via a trigger — this
-- is what makes it possible to tell who changed or deleted a transaction now
-- that shared editors can modify each other's data. See docs/TODO.md.
--
-- Run against the existing Supabase database (SQL editor or CLI).

create table if not exists transaction_history (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,          -- no FK: row must survive the tx's own deletion
  owner_id uuid not null,                -- transactions.user_id at time of change
  group_id uuid,                         -- transactions.group_id at time of change (for RLS)
  action text check (action in ('insert','update','delete')) not null,
  changed_by uuid references auth.users(id),
  changed_by_username citext,            -- denormalized, same pattern as group_shares/account_shares
  changed_by_name text,
  old_data jsonb,                        -- null on insert
  new_data jsonb,                        -- null on delete
  changed_at timestamptz default now()
);
create index if not exists transaction_history_tx    on transaction_history (transaction_id);
create index if not exists transaction_history_owner on transaction_history (owner_id, changed_at desc);

create or replace function log_transaction_change()
returns trigger language plpgsql security definer as $$
declare
  v_username citext;
  v_name text;
begin
  select username, name into v_username, v_name from profiles where id = auth.uid();
  insert into transaction_history
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

drop trigger if exists transactions_history_trigger on transactions;
create trigger transactions_history_trigger
  after insert or update or delete on transactions
  for each row execute function log_transaction_change();

alter table transaction_history enable row level security;
drop policy if exists tx_history_select on transaction_history;
create policy tx_history_select on transaction_history for select using (
  can_read_account(owner_id) or (group_id is not null and can_read_group(group_id))
);
