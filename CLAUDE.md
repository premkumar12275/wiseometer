# Wiseometer — Claude Code Context

## Project
Personal expense tracking app inspired by Spendee.
Stack: Vite + React 18, Supabase (PostgreSQL + Auth + Storage), Tailwind CSS, Recharts.

## Architecture Decisions
- All Supabase interaction goes through `src/services/storageService.js` only
  (auth calls live in `src/services/authService.js`)
- Auth state managed via `src/hooks/useAuth.js` using Supabase Auth
- Every user has a `profiles` row (unique username + name); signup passes
  username/name as auth metadata → a DB trigger creates the profile. Existing
  users without a profile are routed to `ProfileSetup`. App.jsx gates:
  loading → AuthGate (no user) → ProfileSetup (no profile) → app
- Sharing (group + account): shares (by username/email, viewer|editor) live in
  `group_shares` / `account_shares`. RLS on transactions/groups/categories/imports
  routes through SECURITY DEFINER helpers (`can_read/write_account`,
  `can_read/write_group`, …). `AccountContext` holds the "active account" (own or
  one shared with you); every owner-scoped query uses `activeAccount.ownerId` (not
  `user.id`) and writes are gated on `canWrite`. Switcher lives in the sidebar
  footer. useGroups annotates each group with `access`. Full design in
  `docs/sharing-design.md`. Phase 3 (accept step + invite emails) was DROPPED —
  it needed an Edge Function; invites work by username/email match instead
- AI features are stubbed in `src/services/aiHooks.js` — do not implement yet
- PDF and Excel parsing logic lives in `src/components/import/parsers/`
- Built-in categories live in `src/constants/categories.js`; users add custom ones
  (`categories` table). Components read the merged list + `getCategoryById` from
  `CategoriesContext` (`useCategories`), never by importing CATEGORIES directly.
  A transaction's `category` is a built-in slug ('food') or a custom uuid.
  `categorizeImported`/`autoCategorize` remain keyword-based over built-ins only
- Groups (spending buckets, e.g. "London Trip") are a `groups` table + nullable
  `transactions.group_id`. A group is a tag: grouped transactions still count in the
  monthly dashboard/totals. The group view (TransactionList with a `group` prop) is
  all-time (month filter skipped when `groupId` is set). The group view reuses the
  SAME TransactionForm/ImportWizard/TransactionList — features added there apply to
  groups automatically, no group-specific code needed
- Transactions carry free-text `notes` and `tags text[]`. Both are editable when
  adding manually and per-row in the import review table. Tag autocomplete comes
  from the `get_transaction_tags(owner)` RPC via `useTransactionTags`;
  `src/components/common/TagInput.jsx` is the shared chip input for both surfaces
- Investments are a SEPARATE portfolio ledger (`investments` table) — no link to
  transactions or cash flow, and no group concept. Valuation is MANUAL
  (`amount_invested` vs `current_value`); gain/loss is derived, never fetched from a
  market API. Types are a FIXED list in `src/constants/investmentTypes.js` whose ids
  must match the `investments.type` check constraint — adding one needs a migration.
  Own sidebar page + a Dashboard summary card that is NOT month-scoped. Import
  mirrors the transaction wizard but is Excel-only, under `components/investments/`
- Every insert/update/delete on `transactions` is logged to `transaction_history` by
  a DB trigger (`log_transaction_change`), never by app code — so no write path can
  skip it. The Activity page renders it read-only (no undo/restore). `group_id` is
  denormalized onto history rows so entries stay visible after the transaction is
  deleted
- The Dashboard has a month/year `viewMode` (state in App.jsx, toggle in TopBar).
  Year mode swaps `getMonthlySummary`→`getYearlySummary` and
  `DailyTrend`→`MonthlyTrend`; summary cards / spending chart / recent list are
  reused unchanged. Transactions and group views stay month-scoped
- Currency formatting and amount parsing live only in `src/utils/format.js`
  (`formatCurrency`, `parseAmount`) — never inline `Intl.NumberFormat`
- Date-only values from imports are normalized with `toISODate` in
  `src/utils/date.js` (local calendar date — never `toISOString` for date cells)
- Environment variables loaded from `.env` — never hardcode keys

## Database Schema
Full schema in `supabase/schema.sql`; incremental changes in `supabase/migrations/`.
- Migrations are numbered `NNNN_description.sql` and applied BY HAND by the user in
  the Supabase SQL editor — they routinely lag behind the repo. A "feature is broken"
  report is usually an unapplied migration, not a code bug: check before debugging
- Every migration must ALSO be mirrored into `schema.sql` so fresh installs match
- Write migrations re-runnable: `create table if not exists`, `drop policy if exists`,
  `create or replace function`, `add column if not exists`

## Supabase RLS & SECURITY DEFINER — read before writing any SQL
- Cross-table access checks live in SECURITY DEFINER helpers so RLS policies never
  read another RLS-protected table directly (avoids recursion). They only ever check
  the current user (`auth.uid()` / JWT email), so they cannot leak
- EVERY `security definer` function MUST pin
  `set search_path = public, extensions, pg_temp` AND schema-qualify every table and
  function reference (`public.group_shares`, never bare `group_shares`). This is
  load-bearing, not style: functions reachable from the Auth signup path run as
  `supabase_auth_admin`, whose search_path excludes `public`, so an unqualified
  reference fails with a misleading "relation does not exist" and aborts signup.
  An unpinned search_path is also a privilege-escalation vector. `extensions` is in
  the path because citext (username, invitee_email) lives there
- Signup chain to know when debugging "Database error saving new user":
  `auth.users` insert → `handle_new_user` → `public.profiles` insert →
  `backfill_shares` (fills invitee_id on email-only shares). A failure anywhere in
  that chain aborts the whole signup transaction

## Coding Conventions
- Functional components only, no class components
- Custom hooks for all data fetching (useTransactions, useAuth)
- storageService functions are all async and return { data, error }
- Tailwind for all styling — no inline styles, no CSS modules
- lucide-react for all icons
- Modals are bespoke, not a shared primitive: `fixed inset-0 z-50` backdrop + `card`
  panel + Escape-to-close (see TransactionForm, ChangelogModal, ShareGroupModal)
- UI primitives shared across more than one domain go in `src/components/common/`
- All amounts stored as numeric(12,2), always positive;
  type field ('income'|'expense'|'transfer') determines sign.
  'transfer' is neutral — excluded from income/expense totals in getMonthlySummary
- Import categorization goes through `categorizeImported(description, direction)`
  in `categories.js` (direction 'out'=expense, 'in'=income/transfer).
  Excel mapping captures separate "Money out"/"Money in" columns
- Currency is Norwegian Kroner (NOK), formatted with the `nb-NO` locale;
  the locale/currency are set once in `src/utils/format.js`

## Versioning & Releases
- `package.json` `version` is the source of truth; the sidebar footer shows it and
  opens `ChangelogModal`
- `CHANGELOG.md` and `src/constants/changelog.js` hold the same entries and are kept
  in sync BY HAND — update both when adding a release
- `npm run release -- <patch|minor|major>` bumps/commits/tags. The USER runs it and
  pushes; do not run git commands unless explicitly asked

## AI Roadmap (not yet implemented)
- aiCategorize(description) → called during import
- aiInsights(transactions) → monthly summary on Dashboard
- aiAnomalyDetect(transactions) → flag unusual spending
These will connect to Supabase Edge Functions → Anthropic API.

## Deployment Target
Vercel. Environment variables set in Vercel dashboard.
A scheduled Vercel Cron (`vercel.json`) hits `api/keep-alive.js` daily to run a
tiny Supabase query, preventing the free-tier project from pausing for inactivity.
