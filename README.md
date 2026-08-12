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

## Learning loop (high level)

1. **Home** (`#/home`) — intranet hub (Training and help, Annual Report, Create Invoices).
2. **Training** — looping teaser video + employee instructions.
3. **Regulation** — fictional NSLA rules (Weather / Range optional; Capcom required).
4. **Customer Portal** — Starfeed voice-of-customer.
5. **Gemba** — inspect As-is process steps freely (with context panel).
6. **As-is** — three launches on the baseline process; lead times saved locally.
7. **Redesign** — budgeted improvements (manufacture, haul road, launch-prep tech, launch sequence; 100 pt budget).
8. **To-be** — three launches on the locked design; compare to As-is on Data.
9. **Data** — lead times, defects, redesign cost, Save/Upload Session Data (CSV + restore).

Product rules, routes, redesign costs, and scene conventions live in **[CLAUDE.md](./CLAUDE.md)** (project instructions for agents and contributors). Repository map: **[docs/project-structure.md](./docs/project-structure.md)**. Brand palette: **[docs/brand/brand-tokens.md](./docs/brand/brand-tokens.md)**.

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
| Simulation + Data views | `src/views/SimulationView.tsx`, `DataView.tsx` |
| Intranet + side stages | `src/views/HomeView.tsx`, `GembaWalkthrough.tsx`, `CustomerPortalView.tsx`, `RegulationView.tsx`, … |
| 5S invoice module | `src/views/CreateInvoicesView.tsx` + `src/data/historicLaunches.ts` / `invoiceLevers.ts` |
| Types / baseline / rounds | `src/types/`, `src/data/` |
| Simulation & redesign libs | `src/lib/` |
| Static assets | `public/` |

See [docs/project-structure.md](./docs/project-structure.md) for the full tree and “where to change what” table.

## Deploy

Built for static hosting (e.g. Vercel) from `main`. Production output: `npm run build` → `dist/`.
