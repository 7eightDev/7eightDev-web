# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-06-23

On-demand line items ("interventi a chiamata"). Minor release, backward compatible.

### Added
- **On-demand line items** (`on_demand`): a third line-item type for on-call work, priced as a starting base (rendered "da €X") but never included in any total — a rate annex for future, on-request work, distinct from one-time deliverables and recurring fees.
  - Public quote page: a dedicated **"Interventi a chiamata"** section, rendered below the total with an explicit "not included in the total" note.
  - Composer: a three-way **Tipo** selector per work item (Una tantum / Ricorrente / A chiamata); the Opzionale flag is disabled for on-demand items.
- **On-demand catalog billing**: catalog items can now use an `on_demand` billing model, so a catalog entry composes straight into an on-demand line. Adds an "A chiamata" option in the catalog admin form, the composer mapping, and a seed placeholder **"Intervento a chiamata"** (€50 starting base).
- New `on_demand` value on the `BillingKind` enum (migration `20260623120000_catalog_on_demand_billing`).

### Changed
- The billing variant CHECK on `catalog_items` was rewritten so an interval is required iff the item is recurring (one-time and on-demand both carry a NULL interval).
- Seed "Manutenzione & monitoring" description softened to continuity-only (security, uptime, backups), aligning with the on-call vs maintenance split.

### Notes
- No breaking changes. The pricing engine sums only one-time and recurring items, so on-demand items are excluded from totals by construction; line items are JSON snapshots, so no data migration was required.

## [1.3.1] - 2026-06-17

Quote composer UI consistency & mobile polish. Patch release, presentation-only, no behavioural or schema changes.

### Changed
- **Work-item rows (step 2)**: the title field is now full-width on its own row, so it is no longer squeezed by the drag handle on narrow screens. Quantity and unit-price fields gained visible labels, the price field fills the available width, and the header reflows on mobile (title on one line, actions below).
- **Add actions** are now consistently placed at the bottom-right of each list: "+ Voce libera" (step 2) mirrors "+ Aggiungi" (step 3), so adding an entry no longer requires scrolling back to the top.
- **Roadmap / terms / tech-stack rows (step 3)** were unified with the work-item styling: each entry is a card matching step 2, with the label/value pair side-by-side on desktop (narrow value field) and stacked on mobile. The drag handle and remove control are vertically centred.
- **Step navigation footers** are now visually separated from their section content with a top divider and consistent spacing across all steps.
- Added breathing room between the timeline and tech-stack sections.

### Added
- **Collapsible catalog on mobile**: a "Catalogo" toggle next to the work-items header opens the service catalog on demand (the catalog stays in the sidebar on desktop).

### Fixed
- The unit-price label (`Prezzo unit. (€)`) no longer wraps onto a second line and misaligns the field row.
- On mobile the remove control adapts to the full height of its row (neutral by default, accent on press); on desktop it keeps the accent border on hover.

## [1.3.0] - 2026-06-17

Quote composer editing & ordering improvements. Minor release, backward compatible.

### Added
- **Drag-and-drop reordering** in the quote composer for work items, timeline phases, terms, and tech-stack entries (built on `@dnd-kit`, with pointer, touch, and keyboard support). The chosen order is persisted and reflected on the public quote.
- **Persistent save in edit mode**: when editing an existing quote the save action is reachable from every step — a sticky button in the desktop sidebar and in the mobile footer — instead of only on the final step. Save errors surface next to the persistent button.

### Fixed
- Public quote **section numbering** now counts only the sections actually rendered, so hiding Roadmap and/or Tech stack no longer leaves a gap in the sequence (e.g. `01 → 04`).

### Notes
- No breaking changes. Dragging is initiated only from a dedicated grip handle, so inline inputs stay editable. A client-side `id` added to composer pair items is presentation-only and is stripped by input validation.

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

[1.3.0]: https://github.com/7eightDev/7eightDev-web/releases/tag/v1.3.0
[1.2.0]: https://github.com/7eightDev/7eightDev-web/releases/tag/v1.2.0
[1.1.0]: https://github.com/7eightDev/7eightDev-web/releases/tag/v1.1.0
[1.0.0]: https://github.com/7eightDev/7eightDev-web/releases/tag/v1.0.0
