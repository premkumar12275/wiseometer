-- Free-text comments/notes per transaction, settable manually or during
-- import (where a bank statement's own comments column can auto-map).
--
-- Run against the existing Supabase database (SQL editor or CLI).

alter table transactions add column if not exists notes text;
