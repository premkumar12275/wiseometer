# Changelog

All notable changes to Wiseometer are documented here, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Version numbers
follow [SemVer](https://semver.org/).

Mirrored in-app as `src/constants/changelog.js` (shown from the sidebar's
version button) — keep both in sync when adding an entry.

## [0.2.0] - 2026-08-13

### Added
- Group sharing and account sharing (viewer/editor roles)
- Spending groups
- Custom categories
- Transaction activity log — see who changed or deleted a transaction, and when
- App version display + changelog panel

## [0.1.0] - Untracked baseline

Everything before this changelog existed: statement import (Excel/PDF),
transaction CRUD, dashboard, NOK formatting, transfers as a neutral type.
Not individually dated or tagged.

---

## Releasing

1. Add a dated entry above (and to `src/constants/changelog.js`) describing what's new.
2. Run `npm run release -- <patch|minor|major>` — bumps `package.json`, commits, and tags `vX.Y.Z`.
3. `git push --follow-tags` when ready.
