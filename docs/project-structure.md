# Project structure

Agent-oriented map of the Orbit26 / Orb-it Process Excellence Simulator
repository. Product rules and settled behaviour live in [`CLAUDE.md`](../CLAUDE.md);
this file only orients you in the tree. Asset inventory: [`assets.md`](./assets.md).
Brand palette: [`brand/brand-tokens.md`](./brand/brand-tokens.md).

## Root

| Path | Role |
|------|------|
| `CLAUDE.md` | **Source of truth** for product behaviour, routes, redesign costs, and constraints. Prefer this over chat history when implementing. |
| `README.md` | Quick start, high-level learning loop, deploy notes. |
| `package.json` | Scripts: `dev`, `build` (`tsc -b && vite build`), `lint` (oxlint), `preview`. |
| `vite.config.ts` / `tsconfig*.json` / `index.html` | Vite + TypeScript app shell. |
| `public/` | Static assets — see [`assets.md`](./assets.md). Served as-is via `import.meta.env.BASE_URL`. |
| `docs/` | This map, brand tokens, asset inventory. |
| `.gitignore` | Ignores `node_modules/`, `dist/`, env files, editor noise, `.tmp-screenshots/`; keeps `CLAUDE.md`. |

## `src/` layout

```
src/
  main.tsx                 App mount
  App.tsx                  Hash router, both RoundSessions kept mounted, stage pages
  App.css                  Global + scene UI styles (large)
  index.css                Design tokens (brand + chrome)
  types/
    process.ts             ProcessVersion, machines, steps, RunState, timing constants
    round.ts               RoundId, AppStage, hash helpers, ROCKETS_PER_ROUND
    views.ts               Simulation / Data view ids
    invoice.ts             5S invoice module types
  data/
    baselineProcess.ts     As-is process template
    rounds.ts              ROUND_CONFIGS (As-is / To-be)
    gembaContext.ts        Gemba step explainers
    historicLaunches.ts    Static invoice billing dataset
    invoiceLevers.ts       5S redesign levers
  lib/
    simulation.ts          Run transitions, pause/resume, lead-time entries
    processEdit.ts         apply*/resolve* redesign fields
    roadGrid.ts            Haul road tile paint / free baseline cost
    redesignCost.ts        Point costs, REDESIGN_BUDGET (100), cost breakdown
    redesignSummary.ts     "Save my current choices" text snapshot
    roundMetrics.ts        As-is average → localStorage for To-be compare
    flightMetrics.ts       Height achieved (miles)
    csvExport.ts           Data board CSV
    saveFile.ts            Save/Upload Session Data round-trip (ORBIT26_SAVE_STATE_V1)
    fileDownload.ts        Shared text download helper
    pathGeometry.ts        Haul map geometry / safety zones
  components/
    RoundSession.tsx       One round: redesign / play / orbit-complete
    RedesignWorkshop.tsx   To-be four-tab workshop + cost banner
    StageNav.tsx           Simulation Navigator (Gemba · As-is · Redesign · To-be)
    SiteBrand.tsx          Top banner (PMI + Intranet / Regulation / Customers)
    ViewNav.tsx            Simulation | Data tabs
    StepIcon.tsx           Shared step-kind glyphs (Gemba + Redesign steppers)
    GembaContextPanel.tsx  Gemba-only context rail
    ManufactureScene.tsx   Step 1 — belt, machines, access-code monitor, booster sprite
    HaulRoadScene.tsx      Step 2 — map, cutaway buildings, crawler, NPC ambient life
    LaunchPrepScene.tsx    Step 3
    LaunchSequenceScene.tsx Step 4
    Booster.tsx            Shared booster art (sprite when bare; CSS when nosed)
    RoundLeadTimeCompare.tsx As-is vs To-be visual compare
  views/
    HomeView.tsx           Default landing `#/home`
    TrainingView.tsx       Teaser video + employee instructions
    AnnualReportView.tsx   In-fiction annual report
    CreateInvoicesView.tsx Standalone 5S invoice module
    GembaWalkthrough.tsx   Free step inspection (isolated)
    CustomerPortalView.tsx Starfeed VOC feed
    RegulationView.tsx     NSLA regulation library
    SimulationView.tsx     Execute chrome (Start / Pause / Run Process)
    DataView.tsx           Lead-time board + save/upload
    OrbitCompleteScene.tsx End-of-round cutaway
```

## Routing (`AppStage`)

| Hash | Stage id | Mount pattern |
|------|----------|---------------|
| `#/home` (default) | `home` | Mount while active |
| `#/training` | `training` | Mount while active |
| `#/annual-report` | `annual-report` | Mount while active |
| `#/invoices` | `invoices` | Mount while active (local progress resets on leave) |
| `#/gemba` | `gemba` | Mount while active; read-only As-is process |
| `#/as-is` (`#/round/1`) | `as-is` | Persistent `RoundSession` (id 1) |
| `#/redesign` | `redesign` | To-be session, workshop phase |
| `#/to-be` (`#/round/2`) | `to-be` | Persistent `RoundSession` (id 2), play phase |
| `#/customers` | `customers` | Mount while active |
| `#/regulation` | `regulation` | Mount while active |

Both round sessions stay mounted for the app lifetime (`display: none` when inactive)
so process edits, in-flight runs, and lead-time logs survive stage hops.

## Chrome convention

Every page renders its own:

1. `SiteBrand` — PMI lockup + Orb-it Intranet / Regulatory Hub / Customer Portal
2. `StageNav` — ring-fenced Simulation Navigator; play phase may show Lead Time / Launches / Defects chips

`App.tsx` owns `stage` only and passes `activeStage` / `onNavigateStage`.

## Where to change what

| Goal | Start here |
|------|------------|
| New process step | `types/process.ts` → `baselineProcess.ts` → scene → `simulation.ts` → `SimulationView` / `RoundSession` → `CLAUDE.md` |
| Redesign lever | `ProcessVersion` field → `processEdit.ts` → `RedesignWorkshop` → cost in `redesignCost.ts` → play scene resolve → `CLAUDE.md` |
| Lead-time / Data board | `simulation.ts` (`LeadTimeEntry`), `DataView`, `csvExport`, `saveFile`, `roundMetrics` |
| Brand colour | `src/index.css` + `docs/brand/brand-tokens.md` |
| Nav / stages | `types/round.ts` (`AppStage`, hash helpers) + `App.tsx` + `StageNav` / `SiteBrand` |
| Invoice 5S module | `CreateInvoicesView`, `historicLaunches`, `invoiceLevers`, `types/invoice.ts` (standalone; no round budget) |
| Manufacture layout / monitor / machine badges | `ManufactureScene.tsx` + `App.css` (`.manufacture-*`, `.factory-machine*`) + `public/AccessCodeMonitor.png` |
| Bare booster art | `Booster.tsx` + `public/AssemblyBooster.png` + `.booster__sprite` / `.booster--haul-sprite` / `.booster--launch-prep` in `App.css` |
| Haul buildings / NPC ambient / dirt track | `HaulRoadScene.tsx` + `public/HaulOfficesTop.png` / `HaulAssemblyTop.png` + `.haul-npc-*` in `App.css` |
| Launch-prep pad visuals | `LaunchPrepScene.tsx` + tower PNGs + tank PNGs + `.lp-tower*` / `.lp-tank*` / `.lp-umbilical*` / `.lp-power-light*` in `App.css` — see `docs/assets-launch-prep-tower.md` + `docs/assets-launch-prep-tanks.md` |
| Imagine chroma-key helper (optional) | `scripts/key-launch-prep-tower.cjs` (not runtime) |

## Deploy & remotes

| Item | Value |
|------|--------|
| Git remote | `origin` → `https://github.com/apollo-n23/Orbit26.git` |
| Default branch | `main` |
| Production (Vercel) | https://orbit26-one.vercel.app |
| Build | `npm run build` → static `dist/` |
| Vercel project | GitHub-connected; push to `main` deploys production |

## Local git notes

- Prefer meaningful local commits; push only when asked (unless the user requests deploy).
- On Windows PowerShell, use `npm.cmd` if `npm.ps1` is blocked by execution policy.
- `dist/` and `node_modules/` are gitignored; do not commit build output.
