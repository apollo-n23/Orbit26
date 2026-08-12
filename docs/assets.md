# Static assets (`public/`)

All files under `public/` are served as-is (not bundled). Reference them with
`import.meta.env.BASE_URL` (e.g. `` `${import.meta.env.BASE_URL}OrbitLogo.png` ``).

Product behaviour lives in [`CLAUDE.md`](../CLAUDE.md). Tree map:
[`project-structure.md`](./project-structure.md).

## Scene / simulation

| File | Used by | Notes |
|------|---------|--------|
| `AssemblyBG.jpg` | `ManufactureScene` | Top-down assembly floor photo behind machines/belt |
| `AccessCodeMonitor.png` | `ManufactureScene` | Square HD monitor bezel (Orb-it logo + power LED); live code is HTML overlay |
| `AssemblyBooster.png` | `Booster` when `showNose={false}` | Transparent bare white booster (payload mount left, engines right). Manufacture line, haul crawler, redesign preview |
| `HaulOfficesTop.png` | `HaulRoadScene` | 3D isometric cutaway Offices annex (doors/apron south) |
| `HaulAssemblyTop.png` | `HaulRoadScene` | 3D isometric cutaway Assembly plant (bay door south) |
| `OrbitLogo.png` | Booster (with nose), haul Assembly badge, pad logo, orbit-complete, Customer Portal, Home, etc. | In-fiction Orb-it mark — never the PMI top banner |
| `PMI Logo.svg` | `SiteBrand` | PMI lockup in the site chrome banner |
| `UpgradeIconPump.jpg` | Redesign launch-prep tech card | Faster pumps |
| `UpdateIconPowerup.jpg` | Redesign launch-prep tech card | Auto power |
| `UpdateIconDrone.jpg` | Redesign launch-prep tech card | Payload drone |
| `UpdateIconStrongback.jpg` | Redesign launch-prep tech card | Strongback redesign |

## Gemba context panel

| File | Step |
|------|------|
| `AssemblyStep.png` | Manufacture |
| `PadStep.png` | Haul / pad approach |
| `PrepStep.png` | Launch prep |
| `MissContStep.png` | Launch sequence (mission control) |

## Home / Training / Annual Report

| File | Used by |
|------|---------|
| `Orbit26 Teaser.mp4` | `TrainingView` — muted autoplay loop, no controls |
| `OrbitTeam.jpg` | `TrainingView` employee instructions |
| `OrbLaunchPad.png` | `HomeView` marketing image |
| `OrbitBoost.jpg` | `AnnualReportView` full-bleed backdrop |

## Customer Portal avatars

Gender-matched profile photos for Starfeed posts/replies:

- `F Profile 2.png`, `F Profile 4.png`, `F Profile 6.png`, `F Profile 8.png`, `F Profile 9.png`, `F Profile 12.png`, `F Profile 15.png`
- `M Profile 1.png`, `M Profile 3.png`, `M Profile 5.png`, `M Profile 7.png`, `M Profile 10.png`, `M profile 11.png`, `M Profile 13.png`, `M Profile 14.png`

## Chrome / misc

| File | Notes |
|------|--------|
| `favicon.svg` | Browser favicon |
| `icons.svg` | Shared icon sheet if referenced |

## Conventions

- Prefer **transparent PNG** for sprites overlaid on scenes (boosters, cutaway buildings, monitor bezel).
- Cache-bust query strings (`?v=N`) are optional on hot-reloaded assets after large art changes.
- New scene art goes in **`public/`**, not under `src/`, unless it must be imported as a module.
- After adding assets: document here + the relevant section of `CLAUDE.md` + `docs/project-structure.md` public/ row.
