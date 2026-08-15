-- Free-form tags per transaction, settable manually or during import review
-- (same shared form/review components used by the group view, so this
-- covers grouped transactions too). get_transaction_tags() powers
-- autocomplete suggestions from previously-used tags.
--
-- Run against the existing Supabase database (SQL editor or CLI).

alter table transactions add column if not exists tags text[] default '{}';

create or replace function get_transaction_tags(p_owner uuid)
returns text[] language sql security definer stable as $$
  select coalesce(array_agg(distinct tag order by tag), '{}'::text[])
  from transactions, unnest(tags) as tag
  where transactions.user_id = p_owner and can_read_account(p_owner);
$$;
grant execute on function get_transaction_tags(uuid) to authenticated;
