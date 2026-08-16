# Orbit26 — Orb-it Process Excellence Simulator

Web-based Lean Six Sigma learning tool set at **Orb-it**, a fictional satellite constellation company. Learners improve a satellite integration and launch value stream; the primary metric is **lead time** across **As-is** and **To-be** rounds. Total cost of improvement is a secondary scored metric on the Data board.

## Quick start

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/). On Windows PowerShell, use `npm.cmd` if `npm` is blocked by execution policy.

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Oxlint |

## Live production

- **Site:** [https://orbit26-one.vercel.app](https://orbit26-one.vercel.app)
- **Repo:** [github.com/apollo-n23/Orbit26](https://github.com/apollo-n23/Orbit26)
- Push to `main` triggers a Vercel production deploy.

## Learning loop (high level)

1. **Home** (`#/home`) — intranet hub (Training and help, Annual Report, Create Invoices).
2. **Training** — looping teaser video + employee instructions.
3. **Regulation** — fictional NSLA rules (Weather / Range optional; Capcom required).
4. **Customer Portal** — Starfeed voice-of-customer.
5. **Gemba** — inspect As-is process steps freely (with context panel).
6. **As-is** — three launches on the baseline process; lead times saved locally.
7. **Redesign** — budgeted improvements (manufacture, haul road, launch-prep tech, launch sequence; **100 pt** budget).
8. **To-be** — three launches on the locked design; compare to As-is on Data.
9. **Data** — lead times, defects, redesign cost, Save/Upload Session Data (CSV + restore).

## Process steps (Execute)

| Step | Scene | Highlights |
|------|--------|------------|
| 1 · Manufacture | `ManufactureScene` | Machines aligned to belt stops; floating access-code monitor (`AccessCodeMonitor.png`); bare booster sprite; sequence badges on lower-left of machine cards |
| 2 · Haul road | `HaulRoadScene` | Grassland plate + taxiway stamps; high-angle aerial Offices/Assembly; coastal strip; pad erector (nose-north); dirt service track + NPC ambient |
| 3 · Launch prep | `LaunchPrepScene` | Night-sky plate + raised blast pad; PNG crane/fairing/drone (crane exits right after stack); improved tower + slim strongback; PNG tanks; CSS fuel-flow chevrons; sequential or master-ON power lights — redesigned by launch-prep techs |
| 4 · Launch sequence | `LaunchSequenceScene` | GO poll, key arm, liftoff; optional Capcom removal → NO CAPCOM height |

## Documentation

| Doc | Contents |
|-----|----------|
| **[CLAUDE.md](./CLAUDE.md)** | Full product rules, routes, redesign costs, scene conventions (source of truth for agents) |
| **[docs/project-structure.md](./docs/project-structure.md)** | Repository tree, routing table, where-to-change map |
| **[docs/assets.md](./docs/assets.md)** | `public/` asset inventory |
| **[docs/assets-launch-prep-tower.md](./docs/assets-launch-prep-tower.md)** | Launch-prep tower sprites + mate animation notes |
| **[docs/assets-launch-prep-tanks.md](./docs/assets-launch-prep-tanks.md)** | LOX / RP-1 farm layout + umbilical behaviour |
| **[docs/assets-launch-prep-overhaul.md](./docs/assets-launch-prep-overhaul.md)** | Night-sky, blast pad, crane/fairing/drone sprites, CSS-only fuel flow |
| **[docs/brand/brand-tokens.md](./docs/brand/brand-tokens.md)** | PMI brand palette ↔ CSS tokens |

## Stack

- TypeScript + React 19 + Vite 8
- Client-side hash routing (`AppStage` / `stageFromHash`)
- No heavy game engines or charting libraries

## Source layout (summary)

| Area | Path |
|------|------|
| Router / dual-round mount | `src/App.tsx` |
| Round lifecycle | `src/components/RoundSession.tsx` |
| Redesign workshop | `src/components/RedesignWorkshop.tsx` |
| Process scenes | `src/components/*Scene.tsx` |
| Shared booster art | `src/components/Booster.tsx` |
| Simulation + Data views | `src/views/SimulationView.tsx`, `DataView.tsx` |
| Intranet + side stages | `src/views/HomeView.tsx`, `GembaWalkthrough.tsx`, `CustomerPortalView.tsx`, `RegulationView.tsx`, … |
| 5S invoice module | `src/views/CreateInvoicesView.tsx`, `src/components/InvoiceLeverImpactPreview.tsx`, `src/data/historicLaunches.ts` / `invoiceLevers.ts` / `invoiceForm.ts` |
| Types / baseline / rounds | `src/types/`, `src/data/` |
| Simulation & redesign libs | `src/lib/` |
| Static assets | `public/` (see [docs/assets.md](./docs/assets.md)) |

## Deploy

Built for static hosting (Vercel) from `main`. Production output: `npm run build` → `dist/`.
