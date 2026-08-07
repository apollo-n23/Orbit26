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

This palette is additive — it sits alongside the existing dark-chrome UI
tokens already in `:root` (`--color-bg`, `--color-surface`,
`--color-border`, `--color-text*`) and the existing named accents
(`--color-orbital`, `--color-amber`, `--color-nav-accent`,
`--color-customer-accent`). Those existing tokens were **not** changed or
mapped onto the brand palette as part of adding these tokens — see the
reconciliation report (shared separately) for which hardcoded colours in
the codebase are close to a brand colour and might be worth migrating onto
one of these tokens.

## Naming

Names describe the colour, not its Pantone number, so they read sensibly
in code (`var(--color-brand-orange)` rather than `var(--color-brand-151)`).
Two colours in the palette are both "navy blues" at a glance
(`Pantone 7452` / `#00538A` and `Pantone 534` / `#1E345D`) — the darker,
more desaturated one is named `brand-indigo` to keep the two distinguishable
in code and in conversation.
