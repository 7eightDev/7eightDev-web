# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-06-17

Quote lifecycle & admin filter overhaul. Minor release, backward compatible.

### Added
- **Archive / restore** quotes from the admin list — a soft, reversible state (`archivedAt`) orthogonal to the lifecycle status, so an archived quote keeps its original status and can be restored at any time.
- **Reject** (`sent → rejected`) and **expire** (`sent → expired`) lifecycle transitions. Expiry is guarded: a quote can be marked expired only once its `validUntil` date has lapsed; a client decline while still valid is a rejection.
- `rejected` and `expired` tabs in the admin status filter.
- New `archivedAt` column on `quotes` (migration `20260616150000_add_quote_archived_at`).

### Changed
- Admin quotes filter bar regrouped **by priority**: the day-to-day pipeline (all / draft / sent / accepted) stays visible, while closed states (rejected / expired) and refinements sit in a secondary group.
- Unified filter visual language (ghost icon + accent underline when active).
- Mobile filter bar: pipeline distributed across the width, secondary filters in an overflow menu, active filter shown as a label.
- Due-date filter simplified to a single **"In scadenza"** toggle (the lapsed case is now covered by the `expired` status).
- `prisma.config.ts` now loads `.env.local` with precedence over `.env`, mirroring Next.js, so CLI commands (`migrate dev`, `generate`, `seed`) target the development database locally. Production migrations continue via `migrate deploy` on deploy.

### Notes
- **Delete** remains restricted to draft quotes; sent quotes are commercial records and must be archived instead.
- Archiving is blocked for `sent` quotes (a deal still awaiting a client answer).
- All destructive or state-changing actions are confirmed via dialogs.
- No breaking changes; the new column is nullable and additive. Production picks it up automatically on the next `prisma migrate deploy`.

## [1.1.0] - 2026-06-16

Landing page refinement.

### Changed
- Section eyebrows rendered as JSX component tags.
- Sharpened section headlines.

### Fixed
- Dual track card footers aligned to the bottom.
- Navigation accessibility on the user button.

## [1.0.0] - 2026-06-14

Initial release: landing page and the digital quote system MVP (admin quote composer, public quote view, email delivery).

[1.2.0]: https://github.com/7eightDev/7eightDev-web/releases/tag/v1.2.0
[1.1.0]: https://github.com/7eightDev/7eightDev-web/releases/tag/v1.1.0
[1.0.0]: https://github.com/7eightDev/7eightDev-web/releases/tag/v1.0.0
