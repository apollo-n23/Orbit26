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
| `AssemblyBooster.png` | `Booster` when `showNose={false}` | Transparent bare white booster (payload mount left, engines right). Manufacture line, haul crawler, redesign preview, launch-prep (rotated 90°) |
| `LaunchPrepTowerMast.png` | `LaunchPrepScene` `.lp-tower__mast` | Lattice service mast with red beacon (288×1244, true alpha) |
| `LaunchPrepStrongback.png` | `LaunchPrepScene` `.lp-tower__strongback` | Strongback beam + amber clamps; CSS rotate via `--mate` (387×1007) |
| `LaunchPrepTowerBase.png` | `LaunchPrepScene` `.lp-tower__base` | Concrete/steel foundation plinth (672×353) |
| `LaunchPrepTankLox.png` | `LaunchPrepScene` `.lp-tank--lox` | Cryogenic LOX GSE tank (true alpha); side-by-side farm with RP-1; HTML “LOX” on nameplate. See `assets-launch-prep-tanks.md` |
| `LaunchPrepTankRp1.png` | `LaunchPrepScene` `.lp-tank--rp` | Matching RP-1 tank; umbilicals grow from each valve to the booster |
| `LaunchPrepNightSky.jpg` | `LaunchPrepScene` `.launch-prep-pad__sky` | 16:9 illustrated starry night plate (milky way + baked cirrus). Sky background only. See `assets-launch-prep-overhaul.md` |
| `LaunchPrepCloudA.png` / `LaunchPrepCloudB.png` / `LaunchPrepCloudC.png` | `LaunchPrepScene` `.launch-prep-pad__cloud` | Isolated grey cirrus sprites (true alpha); CSS-only night-wind drift |
| `LaunchPrepStarSparkle.png` | `LaunchPrepScene` `.launch-prep-pad__sparkle` | Four-point sparkle for brighter twinkle overlays |
| `LaunchPrepCraneBase.png` | `LaunchPrepScene` `.lp-crane__base` | Outrigger platform (grey steel, gold hazard, cyan bolts). 1156×466 |
| `LaunchPrepCraneCab.png` | `LaunchPrepScene` `.lp-crane__cab` | Gold cab, navy glass, cyan roof beacon (side view). 743×740 |
| `LaunchPrepCraneBoom.png` | `LaunchPrepScene` `.lp-crane__boom` | Vertical grey lattice; CSS rotates around bottom center. 243×1235 |
| `LaunchPrepCraneJib.png` | `LaunchPrepScene` `.lp-crane__jib` | Horizontal lattice; pivot collar on the **left**. 1219×342 |
| `LaunchPrepCraneHook.png` | `LaunchPrepScene` `.lp-crane__hook-img` | Gold/grey hook block at the jib/cable tip. 299×611 |
| `LaunchPrepFairing.png` | `LaunchPrepScene` `.lp-payload` / hook-load / ground-load / drone load | White ogive + cyan band; seated on booster and carried by crane/drone. 402×1093 |
| `LaunchPrepDrone.png` | `LaunchPrepScene` `.lp-drone` | Navy/gold coaxial payload drone (To-be `payload-drone`). 841×658 |
| `LaunchPrepFuelSlugLox.png` / `LaunchPrepFuelSlugRp.png` | *(available, unused)* | Optional LOX/RP-1 hose slugs. Live fill is CSS chevrons + highlight slug; these PNGs are not wired. See `assets-launch-prep-overhaul.md` |
| `HaulOfficesTop.png` | `HaulRoadScene` | High-angle aerial Offices annex (entrance south) |
| `HaulAssemblyTop.png` | `HaulRoadScene` | High-angle aerial Assembly hangar (bay door south) |
| `HaulGrassField.jpg` | `HaulRoadScene` + redesign haul grid | Full-field grassland plate (1600×960) with gentle mounds and mixed turf. One image, not a repeating tile. |
| `HaulPadDeck.jpg` | `HaulRoadScene` | Square blast-deck concrete under the pad logo/circles (1024²). |
| `HaulErectorArm.png` | `HaulRoadScene` | Strongback lattice arm (hinge collar on the right). Used in the pad-mount erect animation. |
| `HaulErectorBase.png` | `HaulRoadScene` | Yellow hydraulic hinge base at the south pad pivot. |
| `HaulRunwayTile.jpg` | `HaulRoadScene` + redesign haul grid | 2:1 taxiway/runway segment (black asphalt, yellow edges, white technical marks). Stamped along each path segment; rotated on the paint grid. |
| `HaulRunwayCorner.jpg` | `HaulRoadScene` + redesign haul grid | Square crop of a 90° taxiway bend; rotated to match connected neighbors. |
| `HaulCoastStrip.jpg` | `HaulRoadScene` + redesign haul map | Vertical beach→water aerial covering the non-interactive right strip. |
| `HaulTreeA.png` / `HaulTreeB.png` / `HaulTreeC.png` | `HaulRoadScene` + redesign tree cells | Keyed upright live-oak sprites (wide / tall / classic). No lean; map instances are unrotated (some flipped). |
| `OrbitLogo.png` | Booster (with nose), haul map corner badge + pad logo, orbit-complete, Customer Portal, Home, etc. | In-fiction Orb-it mark — never the PMI top banner |
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

## Invoice 5S redesign

Generated training icons and hover-preview illustrations for
`CreateInvoicesView` / `InvoiceLeverImpactPreview`. No baked-in copy —
field labels in the preview miniature are HTML.

| File | Used by |
|------|---------|
| `Invoice5sSortIcon.jpg` | Sort lever card hero |
| `Invoice5sSetInOrderIcon.jpg` | Set in Order lever card hero |
| `Invoice5sShineIcon.jpg` | Shine lever card hero |
| `Invoice5sStandardizeIcon.jpg` | Standardize lever card hero |
| `Invoice5sSustainIcon.jpg` | Sustain lever card hero |
| `Invoice5sSortPreview.jpg` | Sort hover impact scene |
| `Invoice5sSetInOrderPreview.jpg` | Set in Order hover impact scene |
| `Invoice5sShinePreview.jpg` | Shine hover impact scene |
| `Invoice5sStandardizePreview.jpg` | Standardize hover impact scene |
| `Invoice5sSustainPreview.jpg` | Sustain hover impact scene |

## Chrome / misc

| File | Notes |
|------|--------|
| `favicon.svg` | Browser favicon |
| `icons.svg` | Shared icon sheet if referenced |

## Launch-prep detail notes

| Doc | Covers |
|-----|--------|
| [`assets-launch-prep-tower.md`](./assets-launch-prep-tower.md) | Mast / strongback / base sprites, mate animation |
| [`assets-launch-prep-tanks.md`](./assets-launch-prep-tanks.md) | LOX / RP-1 farm size, placement, umbilical behaviour |
| [`assets-launch-prep-overhaul.md`](./assets-launch-prep-overhaul.md) | Night-sky plate, crane/fairing/drone sprites, CSS-only fuel flow (slug PNGs unused) |

## Conventions

- Prefer **transparent PNG** for sprites overlaid on scenes (boosters, haul buildings, monitor bezel, launch-prep tower/tanks).
- Prefer **HTML labels** over baked-in image text when the copy must stay exact (tank nameplates, access-code digits).
- Cache-bust query strings (`?v=N`) are optional on hot-reloaded assets after large art changes.
- New scene art goes in **`public/`**, not under `src/`, unless it must be imported as a module.
- One-shot Imagine keying helpers may live under `scripts/` (not app runtime).
- After adding assets: document here + the relevant section of `CLAUDE.md` + `docs/project-structure.md` where-to-change row.
- Do **not** add superseded haul experiments (`HaulGrassTile.jpg`, `HaulRoadTile.jpg`, `HaulRunwayFill.jpg`, `scripts/make_haul_tiles.py`). Live haul art is `HaulGrassField.jpg` + `HaulRunwayTile.jpg` / `HaulRunwayCorner.jpg`.
