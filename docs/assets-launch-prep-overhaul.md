# Launch-prep visual overhaul assets

Imagine-generated plates and keyed PNG sprites for the Prepare for launch scene (`LaunchPrepScene.tsx`). One-shot keyer: `scripts/key_launch_prep_overhaul.py`.

## Night sky

| File | Role |
|------|------|
| `public/LaunchPrepNightSky.jpg` | Full 16:9 illustrated starry night plate (milky way + baked thin grey cirrus). Background only — no pad/rocket. |
| `public/LaunchPrepCloudA.png` | Long wispy grey cirrus, true alpha |
| `public/LaunchPrepCloudB.png` | Softer elongated grey veil, true alpha |
| `public/LaunchPrepCloudC.png` | Compact distant grey puff, true alpha |
| `public/LaunchPrepStarSparkle.png` | Four-point white sparkle for twinkle overlays, true alpha |

## Crane + payload

| File | Role |
|------|------|
| `public/LaunchPrepCraneBase.png` | Outrigger platform (grey steel, gold hazard, cyan bolts) |
| `public/LaunchPrepCraneCab.png` | Gold operator cab, navy glass, cyan roof beacon, side view |
| `public/LaunchPrepCraneBoom.png` | Vertical grey lattice boom (CSS rotates around bottom) |
| `public/LaunchPrepCraneJib.png` | Horizontal lattice jib, pivot collar on the **left** |
| `public/LaunchPrepCraneHook.png` | Gold/grey hook block |
| `public/LaunchPrepFairing.png` | White ogive fairing, cyan `#00B2E2` band, silver tip |
| `public/LaunchPrepDrone.png` | Navy/gold coaxial payload drone (To-be `payload-drone` path) |

## Fuel flow

Live fill is **CSS-only** (chevron packets on `.lp-umbilical__flow` + a `::after` highlight slug, `lp-umbilical-flow` / `lp-umbilical-slug`). Direction is tank → vehicle. The slug PNGs below are in `public/` for a later pass but are **not wired**.

| File | Role |
|------|------|
| `public/LaunchPrepFuelSlugLox.png` | Icy cyan slug for LOX hose travel — available, unused |
| `public/LaunchPrepFuelSlugRp.png` | Amber-gold slug for RP-1 hose travel — available, unused |

## URL pattern

```ts
`${import.meta.env.BASE_URL}LaunchPrepNightSky.jpg?v=1`
```

HTML labels stay HTML (never bake copy into sprites). Brand colours: navy `#00538A`, gold `#FFC627`, cyan `#00B2E2`, grey `#777779` / `#C9C8C7`.
