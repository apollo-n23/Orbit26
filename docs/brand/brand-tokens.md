# Brand colour tokens

Official brand palette, added as reusable design tokens so the codebase has
one authoritative source for these colours instead of hardcoded hex values
scattered across components.

## Where the tokens live

This project manages colour with **plain CSS custom properties**, defined
once in a single `:root` block in [`src/index.css`](../../src/index.css) —
there is no Tailwind config, SCSS, or JS theme object in this codebase. The
brand palette follows that existing convention: `--color-brand-<name>`,
grouped under a `PMI brand palette` comment, each with its Pantone
reference as a trailing comment. Hex is authoritative; Pantone/CMYK/RGB
values are print-only reference and are not encoded in code.

```css
/* PMI brand palette (official) — hex is authoritative; Pantone/CMYK/RGB are print-only reference. */
--color-brand-navy: #00538a; /* Pantone 7452 */
--color-brand-orange: #ff8300; /* Pantone 151 */
--color-brand-cyan: #00b2e2; /* Pantone 306 */
--color-brand-lime: #c3d500; /* Pantone 382 */
--color-brand-magenta: #b00060; /* Pantone 227 */

--color-brand-indigo: #1e345d; /* Pantone 534 */
--color-brand-gold: #ffc627; /* Pantone 123 */
--color-brand-blue: #0081c9; /* Pantone Process Blue */
--color-brand-green: #82bc00; /* Pantone 376 */
--color-brand-grey: #777779; /* Pantone Cool Grey 9 */
--color-brand-grey-light: #c9c8c7; /* Pantone Cool Grey 3 */
```

Use them the same way every other design token in this file is used —
`color: var(--color-brand-navy);` etc.

## Palette reference

### Primary

| Token | Pantone | Hex |
|---|---|---|
| `--color-brand-navy` | 7452 | `#00538A` |
| `--color-brand-orange` | 151 | `#FF8300` |
| `--color-brand-cyan` | 306 | `#00B2E2` |
| `--color-brand-lime` | 382 | `#C3D500` |
| `--color-brand-magenta` | 227 | `#B00060` |

### Secondary

| Token | Pantone | Hex |
|---|---|---|
| `--color-brand-indigo` | 534 | `#1E345D` |
| `--color-brand-gold` | 123 | `#FFC627` |
| `--color-brand-blue` | Process Blue | `#0081C9` |
| `--color-brand-green` | 376 | `#82BC00` |
| `--color-brand-grey` | Cool Grey 9 | `#777779` |
| `--color-brand-grey-light` | Cool Grey 3 | `#C9C8C7` |

## Relationship to the existing app tokens

The existing named accent tokens now **alias** the brand palette rather than
carrying their own ad-hoc hex:

| Token | Now aliases | Was |
|---|---|---|
| `--color-orbital` | `var(--color-brand-blue)` | `#3b82c4` |
| `--color-orbital-strong` | `var(--color-brand-cyan)` | `#5ba0db` |
| `--color-amber` | `var(--color-brand-gold)` | `#d4a017` |
| `--color-nav-accent` | `var(--color-brand-orange)` | `#ff7a33` |
| `--color-text-dim` | `var(--color-brand-grey)` | `#6b7685` |

Every hardcoded literal identified as a duplicate or close match of one of
these (across `App.css` and the scene components) was migrated onto the
matching `--color-brand-*` token (or, in `.tsx` SVG attributes — which don't
use `var()` anywhere else in this codebase — the literal brand hex value).

`--color-customer-accent` was originally a standalone purple (`#b073f0`),
intentionally scoped to the Customer Portal page only and unrelated to the
brand palette. It has since been re-themed around `--color-brand-magenta`
(Pantone 227, `#B00060`) instead of purple:

| Token | Value | Use |
|---|---|---|
| `--color-customer-accent-strong` | `var(--color-brand-magenta)` — true Pantone 227 | Solid-fill / high-emphasis use, e.g. the active state of the Customer Portal's nav button |
| `--color-customer-accent` | `color-mix(in srgb, var(--color-brand-magenta) 55%, white)` | Lightened tint, used for most text/icon/border colour so it stays legible on the dark chrome (Pantone 227 itself is too dark for that) |
| `--color-customer-accent-dim` | `color-mix(in srgb, var(--color-customer-accent) 16%, transparent)` | Translucent background wash, same role as before |

It's still scoped to the Customer Portal page only, distinct from the
shared brand-aligned accents above.

The near-black dark-chrome UI tokens (`--color-bg`, `--color-surface`,
`--color-border`, `--color-border-strong`, `--color-surface-raised`) were
**deliberately left alone**, along with the many hand-tuned shading stops in
illustrated scene art (tank/gauge/building gradients, glow shadows). These
are neutral UI chrome and illustrative light/shadow tints, not brand-identity
colours, even where a couple of them land mathematically close to
`brand-indigo` or `brand-grey` — remapping them would visibly clash with the
project's documented "dark professional chrome" look (see `CLAUDE.md`)
without doing anything to make the site more "on brand."

## Naming

Names describe the colour, not its Pantone number, so they read sensibly
in code (`var(--color-brand-orange)` rather than `var(--color-brand-151)`).
Two colours in the palette are both "navy blues" at a glance
(`Pantone 7452` / `#00538A` and `Pantone 534` / `#1E345D`) — the darker,
more desaturated one is named `brand-indigo` to keep the two distinguishable
in code and in conversation.
