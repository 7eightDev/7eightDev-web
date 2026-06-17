# v1.2.0 — Quote lifecycle & admin filter overhaul

Minor release. Backward compatible. Builds on v1.1.0.

## Highlights

### Quote lifecycle
- **Archive / restore** quotes from the admin list — a soft, reversible state (`archivedAt`) that is orthogonal to the lifecycle status, so an archived quote keeps its original status and can be restored at any time.
- **Delete** is allowed for draft quotes only. Sent quotes are commercial records, so they must be archived instead of deleted.
- **Reject** (`sent → rejected`) and **expire** (`sent → expired`) lifecycle transitions. Expiry is guarded: a quote can only be marked expired once its `validUntil` date has lapsed; a client decline while still valid is a rejection.
- Archiving is blocked for `sent` quotes (a deal still awaiting a client answer), keeping the active list focused.
- All destructive or state-changing actions are confirmed via dialogs.

### Admin quotes filter bar
- Filters regrouped **by priority**: the day-to-day pipeline (all / draft / sent / accepted) stays visible; closed states (rejected / expired) and refinements sit in a secondary group.
- Unified visual language across every filter (ghost icon + accent underline when active).
- **Mobile**: pipeline distributed across the width; secondary filters tucked into an overflow menu; the active filter is shown as a label so it is always clear what is filtered.
- **Desktop**: secondary groups shown inline, separated by dividers.
- Due-date filter simplified to a single **"In scadenza"** toggle (the lapsed case is now covered by the `expired` status).
- Status filter now exposes the `rejected` and `expired` tabs.

## Infrastructure
- New `archivedAt` column on `quotes` with migration `20260616150000_add_quote_archived_at`.
- `prisma.config.ts` now loads `.env.local` with precedence over `.env`, mirroring Next.js. This ensures CLI commands (`migrate dev`, `generate`, `seed`) target the **development** database locally instead of production. Production migrations continue to run via `migrate deploy` on deploy.

## Notes
- No breaking changes; the new column is nullable and additive.
- Production picks up the `archivedAt` column automatically on the next deploy (`prisma migrate deploy`).
