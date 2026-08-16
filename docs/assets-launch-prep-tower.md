# Launch Prep tower sprites

Transparent PNG replacements for the former CSS-shape launch tower on the Launch Prep pad (`lp-tower` in `LaunchPrepScene.tsx`). **Wired and settled** — not a draft for a merge agent.

## Files

| File | Role | Approx. pixel size | Aspect |
|------|------|--------------------|--------|
| `public/LaunchPrepTowerMast.png` | Improved vertical lattice service mast | 479×2097 | Tall portrait |
| `public/LaunchPrepStrongback.png` | Slim vertical beam + 3 amber clamps facing right | 262×1454 | Very tall, thin |
| `public/LaunchPrepTowerBase.png` | Concrete/steel foundation plinth | 672×353 | Wide |

All three: true alpha. Flat industrial game-prop style, grey steel + red beacon (mast) / amber clamps (strongback) / yellow hazard + red foot stripe (base). No logos or text labels.

## Live DOM mapping

| DOM / CSS | Asset | Notes |
|-----------|--------|--------|
| `.lp-tower__mast` → `.lp-tower__mast-img` | `LaunchPrepTowerMast.png` | No cross-brace children |
| `.lp-tower__strongback` → `.lp-tower__strongback-img` | `LaunchPrepStrongback.png` | Keep `--mate` rotate on the strongback container |
| `.lp-tower__base` → `.lp-tower__base-img` | `LaunchPrepTowerBase.png` | Fixed under mast |

URL pattern: `` `${import.meta.env.BASE_URL}LaunchPrepTowerMast.png?v=2` `` (bump `?v=` after replacing the PNG).

## Animation

- Mate animation lives on **strongback only** (`transform: rotate(...)` driven by `--mate`). Mast and base stay fixed.
- Strongback art is drawn in the **mated / closed** pose (vertical). Open pose is CSS rotation (~−24°) around `left center`.
- Live box sizes: mast `3.51rem` (~30% over the prior 2.7rem), slim strongback `2.3rem` with `aspect-ratio: 262 / 1454`, base `8.3×2.6rem`, tower box `9.4rem`.
- Strongback opacity may still ease with `--mate`.
- Mated booster sits at `calc(42% + 3rem)` so it nests in the clamps instead of sharing the mast center.

## Generation notes

- Style-anchored mast first; strongback and base derived via image_edit.
- Magenta studio BG keyed out with a local chroma-key pass (`scripts/key-launch-prep-tower.cjs`) — Imagine delivered JPEGs; alpha is post-processed. That script is a one-shot tooling helper, not app runtime.
- Minor: mast lightning rod includes a small bolt glyph (not text/logo).

## Out of scope

- Do **not** replace the mission-control tower in `LaunchSequenceScene` with these assets (different scale/view).
- Booster, fuel tanks, and power lights are separate launch-prep visuals (see `docs/assets.md` and CLAUDE.md step 3).
