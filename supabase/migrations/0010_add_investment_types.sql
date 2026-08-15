-- Widen the investments.type check constraint to add Gold/Metals and
-- Cash/Savings (real_estate already existed).
--
-- Run against the existing Supabase database (SQL editor or CLI).

alter table investments drop constraint if exists investments_type_check;
alter table investments add constraint investments_type_check
  check (type in ('stock','fund','crypto','real_estate','bond','gold','cash','other'));
