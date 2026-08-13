# Backlog / To-do

Deferred items to pick up later.

## Versioning  *(added 2026-06-14)*
We have no versioning today. Two flavors identified:
- **Data change history / audit trail** — track who changed/deleted a transaction and when
  (more relevant now that shared editors can modify each other's data). **Built 2026-08-13**:
  `transaction_history` table + trigger (migration `0007_transaction_history.sql`) logs every
  insert/update/delete; new "Activity" page in the sidebar shows the log, scoped to the active
  account. No undo/restore — read-only history for this pass. Requires running the migration.
- **App release versioning** — **Built 2026-08-13**: `package.json` is the version source
  of truth (bumped to `0.2.0` as the first tracked release), `CHANGELOG.md` +
  `src/constants/changelog.js` hold the changelog (kept in sync by hand), and the sidebar
  footer shows the version behind a changelog modal. `npm run release -- <bump>` wraps
  `npm version` to bump/commit/tag; the user runs it and pushes themselves.

→ Next: run migration `0007_transaction_history.sql` (still pending), then whenever ready,
  cut the `v0.2.0` release with `npm run release -- minor` and `git push --follow-tags`.

---

### Done / dropped
- **Sharing** — Phases 0–2 built (usernames/profiles, group sharing, account sharing).
  Phase 3 (accept-invite step + real invite emails) **dropped** — the email piece needed a
  Supabase Edge Function, which we've decided against. Invites work by username/email match
  with out-of-band notification, which is sufficient.
