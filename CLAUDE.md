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
  all-time (month filter skipped when `groupId` is set)
- Currency formatting and amount parsing live only in `src/utils/format.js`
  (`formatCurrency`, `parseAmount`) — never inline `Intl.NumberFormat`
- Date-only values from imports are normalized with `toISODate` in
  `src/utils/date.js` (local calendar date — never `toISOString` for date cells)
- Environment variables loaded from `.env` — never hardcode keys

## Database Schema
See full schema in `supabase/schema.sql`

## Coding Conventions
- Functional components only, no class components
- Custom hooks for all data fetching (useTransactions, useAuth)
- storageService functions are all async and return { data, error }
- Tailwind for all styling — no inline styles, no CSS modules
- lucide-react for all icons
- All amounts stored as numeric(12,2), always positive;
  type field ('income'|'expense'|'transfer') determines sign.
  'transfer' is neutral — excluded from income/expense totals in getMonthlySummary
- Import categorization goes through `categorizeImported(description, direction)`
  in `categories.js` (direction 'out'=expense, 'in'=income/transfer).
  Excel mapping captures separate "Money out"/"Money in" columns
- Currency is Norwegian Kroner (NOK), formatted with the `nb-NO` locale;
  the locale/currency are set once in `src/utils/format.js`

## AI Roadmap (not yet implemented)
- aiCategorize(description) → called during import
- aiInsights(transactions) → monthly summary on Dashboard
- aiAnomalyDetect(transactions) → flag unusual spending
These will connect to Supabase Edge Functions → Anthropic API.

## Deployment Target
Vercel. Environment variables set in Vercel dashboard.
A scheduled Vercel Cron (`vercel.json`) hits `api/keep-alive.js` daily to run a
tiny Supabase query, preventing the free-tier project from pausing for inactivity.
