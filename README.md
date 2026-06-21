# Wiseometer

A personal expense tracker for Norwegian Kroner (NOK), inspired by Spendee. Import
bank statements, review and categorize transactions before they're saved, and track
spending, income, and transfers on a clean dashboard.

Built with Vite + React, Supabase (PostgreSQL + Auth + Storage), Tailwind CSS, and Recharts.

## Features

- **Statement import** — upload an Excel bank statement, map the columns (auto-detects
  Norwegian/English headers, including separate *Withdrawals*/*Deposits*), then review
  every row on a dedicated screen before importing.
- **Review & correct** — per-row **type** (expense / income / transfer) and **category**,
  with auto-categorization from merchant keywords, include/exclude toggles, and live totals.
- **Transfers as a neutral type** — money moved between accounts is excluded from
  income/expense totals so they don't distort your net.
- **Transactions** — add, edit, filter (by category, type, search, date range), bulk-select,
  and delete; export to CSV.
- **Dashboard** — monthly summary cards, spending-by-category and daily-trend charts,
  and recent activity.
- **NOK throughout** — amounts formatted with the `nb-NO` locale; import parsing handles
  Norwegian number formats (comma decimal, space/period thousands).

## Tech stack

| Layer    | Choice |
|----------|--------|
| Frontend | Vite, React 18, Tailwind CSS, Recharts, lucide-react |
| Backend  | Supabase (PostgreSQL, Auth, Storage) |
| Parsing  | `xlsx` (Excel), `pdfjs-dist` (PDF) |
| Hosting  | Vercel (static build + serverless function + cron) |

## Getting started

### Prerequisites
- Node.js 18+
- A Supabase project

### 1. Install
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```bash
cp .env.example .env
```
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up the database
Run `supabase/schema.sql` in the Supabase SQL editor to create the tables and policies.
If you created the database from an earlier schema, also apply the migrations in
`supabase/migrations/`.

### 4. Run
```bash
npm run dev
```

## Scripts

| Command           | Description                  |
|-------------------|------------------------------|
| `npm run dev`     | Start the dev server         |
| `npm run build`   | Production build to `dist/`   |
| `npm run preview` | Preview the production build  |

## Deployment

Deploys to **Vercel**. Import the repo, set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` (and optionally `CRON_SECRET`) as environment variables,
and deploy — Vercel auto-detects the Vite framework.

A scheduled **Vercel Cron** (`vercel.json`) calls `api/keep-alive.js` daily to run a
tiny Supabase query, preventing the free-tier database from being paused for inactivity.

## Project structure

```
api/                       Serverless functions (keep-alive cron)
src/
  components/              UI: dashboard, transactions, import wizard, layout, auth
  constants/categories.js  Categories + import auto-categorization
  hooks/                  Data-fetching hooks (useTransactions, useAuth)
  services/               Supabase access (storageService) + auth
  utils/                  Currency formatting/parsing, date helpers
supabase/                 schema.sql + migrations
```

All Supabase access goes through `src/services/storageService.js`. Currency formatting
and amount parsing live only in `src/utils/format.js`. See `CLAUDE.md` for the full set
of architecture conventions.
