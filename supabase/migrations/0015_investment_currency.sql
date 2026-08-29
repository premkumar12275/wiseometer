-- Per-investment currency. The expense ledger stays NOK-only; only the
-- portfolio is multi-currency.
--
-- Amounts are NEVER converted between currencies — there is no rate anywhere in
-- the app, and inventing one would make every total a guess. Investments are
-- reported per currency instead, so each figure is exactly what was paid or is
-- held in that currency.
--
-- A folder's target_amount is denominated in the folder's own currency, and its
-- progress bar counts only the investments that share it.
--
-- Run against the existing Supabase database (SQL editor or CLI).

alter table investments add column if not exists currency text not null default 'NOK';
alter table investments drop constraint if exists investments_currency_check;
alter table investments add constraint investments_currency_check
  check (currency in ('NOK','USD','INR'));

alter table investment_folders add column if not exists currency text not null default 'NOK';
alter table investment_folders drop constraint if exists investment_folders_currency_check;
alter table investment_folders add constraint investment_folders_currency_check
  check (currency in ('NOK','USD','INR'));
