# Ghost Scroll Audit — MS-1.3

_Generated 2026-09-12 15:26:26 UTC · **feat/responsive-ui-testing** · base URL `http://localhost:3000` · Node v22.22.3 · Playwright chromium 1.63.0_

## Parametri

| Pagina | Viewport |
|---|---|
| `/admin/quotes` | 375×667, 768×1024, 1280×800 |
| `/admin/leads` | 375×667, 768×1024, 1280×800 |
| `/admin/catalog` | 375×667, 768×1024, 1280×800 |
| `/admin/leads?status=qualified` | 375×667, 768×1024, 1280×800 |

> Viewport **widths** imported at runtime from `presentation/lib/breakpoints.ts` (`DEVICE_PROFILES`); heights follow the roadmap convention (desktop 800 / tablet 1024 / mobile 667). Detection: `scrollWidth > clientWidth + 1` on every visible element. Auth: profilo persistente `.e2e/ghost-scroll-profile`.

## Esito per vista

| Pagina | Viewport | Status | Note | Tempo |
|---|---|---|---|---|
| `/admin/quotes` | mobile 375×667 | OK | — | 2756ms |
| `/admin/leads` | mobile 375×667 | OK | — | 1714ms |
| `/admin/catalog` | mobile 375×667 | OK | — | 1350ms |
| `/admin/leads?status=qualified` | mobile 375×667 | OK | — | 1713ms |
| `/admin/quotes` | tablet 768×1024 | OK | — | 1510ms |
| `/admin/leads` | tablet 768×1024 | OK | — | 1827ms |
| `/admin/catalog` | tablet 768×1024 | OK | — | 1376ms |
| `/admin/leads?status=qualified` | tablet 768×1024 | OK | — | 1497ms |
| `/admin/quotes` | desktop 1280×800 | OK | — | 1328ms |
| `/admin/leads` | desktop 1280×800 | OK | — | 1875ms |
| `/admin/catalog` | desktop 1280×800 | OK | — | 1368ms |
| `/admin/leads?status=qualified` | desktop 1280×800 | OK | — | 1700ms |

## Sospetti (possibile ghost scroll)

| Pagina | Viewport | Selector | Tag | scrollWidth | clientWidth | overflowPx | Classi |
|---|---|---|---|---|---|---|---|
| `/admin/quotes` | tablet 768×1024 | `div.flex.h-dvh.flex-col.overflow-hidden:nth-of-type(2) main.flex-1.min-h-0.overflow-y-auto div.w-full.mx-auto.px-4.sm\:px-8.max-w-\[1400px\].py-12 div.flex.items-end.justify-between.gap-x-3.sm\:justify-start.sm\:gap-x-5.border-b.border-border.mb-5.data-\[pending\]\:opacity-60.transition-opacity:nth-of-type(2)` | `div` | 892 | 689 | **203** | `flex items-end justify-between gap-x-3 sm:justify-start sm:gap-x-5 border-b border-border mb-5 data-[pending]:opacity-60 transition-opacity` |
| `/admin/quotes` | tablet 768×1024 | `div.flex.h-dvh.flex-col.overflow-hidden:nth-of-type(2) main.flex-1.min-h-0.overflow-y-auto` | `main` | 924 | 753 | **171** | `flex-1 min-h-0 overflow-y-auto` |
| `/admin/quotes` | tablet 768×1024 | `div.flex.h-dvh.flex-col.overflow-hidden:nth-of-type(2) main.flex-1.min-h-0.overflow-y-auto div.w-full.mx-auto.px-4.sm\:px-8.max-w-\[1400px\].py-12` | `div` | 924 | 753 | **171** | `w-full mx-auto px-4 sm:px-8 max-w-[1400px] py-12` |

## Contenuti deliberati (non bug — elementi che clip/scroll/fixed, raggruppati per classe)

<details><summary>8 gruppi · 102 elementi totali</summary>

| # | overflowPx (max) | Conteggio | Motivo | Classi (esempio) |
|---|---|---|---|---|
| 45 | **356** | 45 | overflow-x hidden container (clips children) | `grid grid-cols-[110px_1fr_auto_150px_auto_auto] gap-5 items-center overflow-hidden rounded-xl border border-border bg-surface px-5 py-4 transition-colors` |
| 6 | **248** | 6 | overflow-x hidden container (clips children) | `no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-surface` |
| 9 | **247** | 9 | overflow-x hidden container (clips children) | `font-space text-[13.5px] font-semibold text-foreground block truncate` |
| 8 | **181** | 8 | overflow-x hidden container (clips children) | `font-space text-[13.5px] font-semibold text-foreground truncate` |
| 12 | **56** | 12 | overflow-x hidden container (clips children) | `cl-internal-1y7k3pi` |
| 6 | **32** | 6 | overflow-x hidden container (clips children) | `flex h-full flex-col gap-3 overflow-hidden` |
| 15 | **18** | 15 | overflow-x hidden container (clips children) | `font-mono text-[10.5px] text-soft border border-border rounded px-1.5 py-[1px] truncate` |
| 1 | **10** | 1 | overflow-x hidden container (clips children) | `px-3 py-2.5 align-middle text-sm whitespace-nowrap overflow-hidden` |

</details>

Esempio per gruppo di overflow maggiore

- **`grid grid-cols-[110px_1fr_auto_150px_auto_auto] gap-5 items-center overflow-hidden rounded-xl border border-border bg-surface px-5 py-4 transition-colors`** · 45 elementi · overflowPx max 356 — es. `div.flex.h-dvh.flex-col.overflow-hidden:nth-of-type(2) main.flex-1.min-h-0.overflow-y-auto div.w-full.mx-auto.px-4.sm\:px-8.max-w-\[1400px\].py-12 div.flex.flex-col.gap-3:nth-of-type(3) div.grid.grid-cols-\[110px_1fr_auto_150px_auto_auto\].gap-5.items-center.overflow-hidden.rounded-xl.border.border-border.bg-surface.px-5.py-4.transition-colors:nth-of-type(2)`
- **`no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-surface`** · 6 elementi · overflowPx max 248 — es. `div.flex.h-dvh.flex-col.overflow-hidden:nth-of-type(2) main.flex-1.min-h-0.overflow-y-auto div.w-full.mx-auto.px-4.sm\:px-8.h-full.max-w-\[1400px\].py-4 section.flex.h-full.flex-col.gap-3.overflow-hidden div.flex.min-h-0.flex-1.flex-col.gap-3.overflow-hidden:nth-of-type(2) div.no-scrollbar.min-h-0.flex-1.overflow-y-auto.overflow-x-hidden.rounded-xl.border.border-border.bg-surface`
- **`font-space text-[13.5px] font-semibold text-foreground block truncate`** · 9 elementi · overflowPx max 247 — es. `div.flex.min-h-0.flex-1.flex-col.gap-3.overflow-hidden:nth-of-type(2) div.no-scrollbar.min-h-0.flex-1.overflow-y-auto.overflow-x-hidden.rounded-xl.border.border-border.bg-surface div.hidden.max-\[820px\]\:grid.gap-0:nth-of-type(2) div.grid.grid-cols-\[1fr_auto\].gap-x-3.gap-y-2\.5.border-b.border-border.px-4.py-3\.5.transition-colors.hover\:bg-foreground\/\[0\.04\].last\:border-b-0.cursor-pointer:nth-of-type(1) div.min-w-0:nth-of-type(1) span.font-space.text-\[13\.5px\].font-semibold.text-foreground.block.truncate`


## Classificazione provvisoria

La convalida definitiva avviene nel triage **MS-1.4**. Euristiche applicate qui:

- Sospetti che si fermano su un **document edge** (html/body con overflow visibile) → **ghost scroll reale** (la pagina scorrerebbe in orizzontale).
- Elemento con overflow clipato da un **clipping ancestor** → falso positivo (niente scrollbar visibile, ma contenuto nascosto: da triagare come regressione di layout).
- Elemento con `overflow-x: scroll/auto/hidden` proprio → contenuto deliberato (scroll interno o clip progettata).
- `position: fixed` · form control → esclusi di default.

> Note emerse dall'audit (da validare nel triage **MS-1.4**):
- Il candidato `lead-filter-bar.tsx` riga filtri **NON produce ghost scroll a 375**: i select `w-[170px]` vengono compressi dal `flex-nowrap` (flex-shrink), la riga resta 328px ≤ contenuto 343px anche con clear attivo (`?status=qualified`, 0 sospetti). Sospetto roadmap **falso positivo**.
- Unico sospetto reale: header della lista quote a **tablet 768×1024** (overflowPx ~171-203 su `main`/header) → candidato MS-1.4.

---

> Questo report va gestito a mano (non committato via git secondo istruzione del committente).
