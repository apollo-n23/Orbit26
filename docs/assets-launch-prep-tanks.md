# Launch Prep LOX / RP-1 tank sprites

Transparent PNG replacements for the former CSS blue LOX and gold RP-1 tank shapes on the Launch Prep pad (`.lp-tank` in `LaunchPrepScene.tsx`). **Wired and settled.**

## Files

| File | Role | Approx. pixel size |
|------|------|--------------------|
| `public/LaunchPrepTankLox.png` | Cryogenic LOX GSE tank (frost, blue steel) | ~724×1085 |
| `public/LaunchPrepTankRp1.png` | Matching RP-1 tank (golden bronze) | ~723×1085 |

True alpha. Right-side outlet valves face the booster so hose geometry can attach. Blank metal nameplates — **labels are HTML** (`.lp-tank__label`: “LOX” / “RP-1”) for crisp text.

## Layout decisions (settled)

| Decision | Value |
|----------|--------|
| Arrangement | Side by side: LOX left, RP-1 right (not stacked) |
| Desktop size | ~4.03×4.81 rem per tank (65% of a prior large farm size; was ~4× the original CSS shapes before that trim) |
| Farm position | `.lp-umbilicals` `left: ~13.7%` (farm moved ~30% closer to the pad vs an earlier far-left placement); right edge at mated booster ~42% |
| Hose behaviour | Each `.lp-umbilical` starts at that tank’s valve; **short stub** when disconnected; **width grows** to the vehicle port when connected; flow pulse / full unchanged |

## Live DOM mapping

| DOM | Asset / content |
|-----|-----------------|
| `.lp-tank--lox` → `.lp-tank__sprite` | `LaunchPrepTankLox.png` |
| `.lp-tank--rp` → `.lp-tank__sprite` | `LaunchPrepTankRp1.png` |
| `.lp-tank__label` | HTML “LOX” / “RP-1” over nameplate |
| `.lp-umbilical*`, `.lp-umbilical__port*` | CSS geometry only (not replaced by sprites) |

## Generation notes

- LOX generated first (Imagine); RP-1 via image_edit recolor for form consistency.
- Magenta studio BG chroma-keyed to true alpha (same approach as tower sprites).

## Related

- Tower sprites: `docs/assets-launch-prep-tower.md`
- Inventory row: `docs/assets.md`
- Product rules: `CLAUDE.md` § Launch prep
