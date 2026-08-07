# CLAUDE.md — Orb-it Process Excellence Simulator

## Project Goal
Build a web-based interactive learning tool that teaches Lean Six Sigma concepts through short gameplay loops. The **primary learning measure is lead time** — end-to-end time from starting a unit through launch — and how process design changes improve it across rounds. **Road cost** (Round 2 redesign) is a secondary scored metric on the Data board.

Setting: Orb-it, a fictional satellite constellation company. Learners act as process engineers improving the satellite integration and launch preparation value stream.

Tone: Professional, precise, operational. Light narrative framing only. No cartoonish or overly playful language.

## Core Learning Loop (must be preserved)
1. **Execute** — Visualised, interactive process steps (not auto-play lists). Feel friction and waste as lead time.
2. **Data** — Lap-style board of lead times (and road cost when redesigned). Process mapping is **outside** this app (no Map tab). **No Comparison tab** — comparison of rounds happens on the Data board (e.g. Round 1 average vs Round 2).
3. **Rounds** — Round 1 = as-is (3 launches); Round 2 = redesign then 3 launches; compare outcomes on Data.
4. **Redesign / Validate** — Round 2 workshop locks improvements into the process used for that round’s launches.

---

## Rounds model (settled)

Each round is a self-contained session: process config, lead-time board, chrome, completion scene.

### Goal per round
- Launch **3 rockets** (`ROCKETS_PER_ROUND` / `MAX_RUNS_PER_SESSION` = 3).
- Each full cycle → one **Data** entry (`LeadTimeEntry`: run number, lead time ms, optional `roadCost`, completedAt).
- After the third launch → **orbit complete** scene (Earth + three satellites). No further Run Process.

### Round 1 — As-is
- **Route:** `#/round/1` (default).
- **Config:** `ROUND_CONFIGS[1]` — baseline inefficient process; **no** redesign phase.
- **Complete:** “As-is round complete” + lap times + Continue / share link to Round 2.
- **Persist results:** when all 3 launches are logged, save **Round 1 average** + **per-rocket lead times** via `saveRound1LeadTimeResults` in `lib/roundMetrics.ts` (`localStorage` keys `orbit26.round1.avgLeadTimeMs` and `orbit26.round1.launchLeadTimesMs`).

### Round 2 — Redesign then execute
- **Route:** `#/round/2` (tutor-shareable deep link).
- **Config:** `allowsRedesign: true`.
- **Flow:** `phase: redesign` → `RedesignWorkshop` → confirm (with **are-you-sure**) → `phase: play` (3 launches) → orbit complete.
- **Data comparison (settled):** load Round 1 average + per-rocket times on mount. Data tab shows **Round 1 average lead time** during Round 2. When Round 2's three launches complete, show full visual compare (`RoundLeadTimeCompare`): Round 1 vs Round 2 averages (difference faster/slower) **and** side-by-side bar chart for Rockets 1–3 of both rounds. Same visual on Round 2 **orbit complete** panel.
- **State isolation:** fresh `RoundSession` per `round.id`; redesign must **not** be wiped after lock-in (reset only on round id change). Lap logs do not carry across rounds; Round 1 **average + three launch times** carry via localStorage only.
- **Do not** delete Round 2 or merge it into Round 1.

### Round 2 redesign workshop (`RedesignWorkshop.tsx`)
Tabs (all available before lock-in):

| Tab | Learner actions | Persisted on `ProcessVersion` (and often mirrored on the step) |
|-----|-----------------|----------------------------------------------------------------|
| **1 · Manufacture** | Drag stations for **line order**; **parkOffset** sliders; **auto-transfer** upgrade (open panel on hover/click — **panel stays open** so the enable button is clickable) | `linePosition`, `parkOffset` on machines; `autoMoveBooster` |
| **2 · Haul road** | Paint/erase tiles only (**no** Straight/Reset shortcuts). Endpoints fixed & free. | `haulPath` / `haulPathOverride`; **`roadCost`** = billable tiles × **10** |
| **3 · Launch prep tech** | Invest in **one** of three techs (toggle off by re-selecting) | `launchPrepTech` |
| **4 · Launch sequence** | **Realign** each GO; **info** criticality; Range Safety may be **deleted** from sequence | `launchSeqRealignIds`, `launchSeqRemovedIds` |

**Lock-in UX (settled):**
- Warning banner: finish all tabs before locking; layout is fixed for all three launches.
- **Confirm layout & start launches** opens **Are you sure?** (No = keep editing / Yes = lock in).
- Confirm stamps road path + cost, re-stamps launch-prep tech and launch-seq redesign so fields survive `applyHaulPath`.

**Road cost:** shown live in redesign header; stored on process; copied to each `LeadTimeEntry.roadCost` when a launch is logged; Data board shows a Road cost column / summary.

### Launch-prep tech → play behaviour (`launchPrepTech`)
| Value | Play effect in `LaunchPrepScene` |
|--------|----------------------------------|
| `faster-pumps` | Near-instant LOX/RP-1 fill while holding |
| `auto-power` | Single master **ON** (not four sequential switches); one click completes power-up |
| `payload-drone` | Crane UI → one-step **Deploy payload drone** + drone visual |
| unset / null | Baseline multi-step crane, slow fill, four power switches |

Resolve via `resolveLaunchPrepTech(process)`. Scene must re-read tech when the launch-prep step starts (do not rely on a stale prop only).

### Launch-sequence redesign → play (`resolveLaunchSeqConfig`)
- Filters out `launchSeqRemovedIds` (e.g. `go-range`).
- Builds dynamic actions: remaining GOs → key-arm → liftoff (`keyIndex` / `liftoffIndex` from list length).
- **Realigned** GO rows use CSS that **overrides** stagger (use high enough specificity: `.mc-go-row.mc-go-row--realigned`).
- Non-realigned keep as-is wide gaps + misalignment.
- Round 1: full six GOs, all misaligned.

### Round architecture
| Piece | Role |
|--------|------|
| `App.tsx` | Hash router only |
| `types/round.ts`, `data/rounds.ts` | Round configs |
| `RoundSession.tsx` | redesign / play / orbit-complete for one round |
| `RedesignWorkshop.tsx` | Round 2 pre-play redesign |
| `processEdit.ts`, `roadGrid.ts` | Apply/resolve redesign fields |
| `OrbitCompleteScene.tsx` | End-of-round cutaway |
| `SiteBrand.tsx` | Top banner brand lockup |
| `lib/roundMetrics.ts` | Round 1 avg + per-launch times save/load; averages |
| `RoundLeadTimeCompare.tsx` | Visual R1 vs R2 averages + three-launch bar compare (Data + orbit complete) |
| Views | **Simulation** · **Data** only (**Comparison tab removed**) |

---

## Site chrome & branding (settled)

- **Top banner** on play, redesign, and orbit-complete: **PMI logo** (left) · divider · **Orb-it** + subtitle/round label.
- Logo asset: `public/PMI Logo.svg` → URL `/PMI%20Logo.svg` via `SiteBrand` (`import.meta.env.BASE_URL`).
- Play top bar metrics: **Lead Time** + **Launches x/3** only (no Yield / Flow Efficiency).
- Static site assets belong in **`public/`** (not `src/` unless import-bundled).

---

## Execute phase — interaction model

Hands-on floor/field simulation. Prefer spatial scenes and direct manipulation.

### Principles (do not regress)
- Operator-driven work per step (click, drag, codes, keyboard, hold-to-fill, etc.).
- **As-is friction is intentional** in Round 1; Round 2 redesign reduces it deliberately.
- **Step transitions:**
  - Default: `step_complete` → **Proceed**.
  - Haul: **Mount to launch pad** → auto-advance (no Proceed).
  - Last step liftoff → `completeUnitRun` only (never on intermediate steps).
- Process lives on `RoundSession` state (from redesign or baseline clone).
- No auto-scrolling step lists as Execute UX.

### Run status lifecycle
| Status | Meaning |
|--------|---------|
| `idle` | Armed session; no unit active |
| `running` | Operating current step |
| `machine_working` | Manufacture approach→work→retreat |
| `awaiting_reorient` | Haul on pad; UI **Mount to launch pad** |
| `step_complete` | Proceed when used |
| `complete` | Unit finished (`completeUnitRun`) |

**Round complete** = `orbit-complete` phase after 3 units — not a `RunStatus`.

---

## Baseline process steps (shared template)

### 1. Manufacture (`ManufactureScene.tsx`)
- As-is layout: physical L→R **2 · 1 · 4 · 3**; operate **1 → 2 → 3 → 4**.
- Drag booster to next stop **unless** `autoMoveBooster` (then auto to next after each machine; starts at station 1).
- Access codes + banner; **Activate** only when code + arrival match.
- Codes: `4821`, `7390`, `1564`, `9057`.
- Variable `parkOffset`; Activate → approach → work → retreat.
- Finish → Proceed.

### 2. Haul (`IntegratePayloadScene.tsx`, `pathGeometry.ts`)
- Path from `resolveHaulPath(process)` (`haulPathOverride` / step `haulPath` / default winding `HAUL_PATH`). Remount scene when path changes.
- Arrow keys primary; safe zones: road+margin, assembly, pad; pure grass → explode → reset.
- Mount to pad → auto-advance to launch-prep.

### 3. Launch prep (`LaunchPrepScene.tsx`)
- Mate → payload stack → fuel → power (modified by `launchPrepTech` as above).
- Crane/drone layout close to stack; umbilicals connect to vehicle ports.

### 4. Launch sequence (`LaunchSequenceScene.tsx`)
- GO poll (possibly shortened/realigned from redesign) → hold key → liftoff (~3.2s).
- Liftoff → `completeUnitRun` → Data entry (lead time + road cost if set).

---

## Checklists

### New Execute step
1. Types + constants · 2. Baseline/round process data · 3. Scene · 4. `simulation.ts` transitions · 5. `SimulationView` / `RoundSession` · 6. This file · 7. `npm run build` + commit.

### New / changed redesign field
1. Field on `ProcessVersion` (+ step mirror if needed) · 2. `apply*` / `resolve*` in `processEdit.ts` · 3. RedesignWorkshop UI · 4. Confirm re-stamp if later applies might wipe · 5. Play scene reads via resolve · 6. Docs.

### New round
1. `RoundId` + `ROUND_CONFIGS` · 2. Hash helpers · 3. Distinct process · 4. Keep 3 launches unless product changes · 5. Completion CTA / share link.

---

## Key Constraints
- 3 launches per round; workshop may span rounds.
- Progressive improvement levers mainly via Round 2 redesign.
- Client-side hash routes for deep links.
- Dark professional chrome; operational language.

## Technical Preferences
- TypeScript + React (Vite). Dev: `npm run dev -- --host 127.0.0.1 --port 5173`.
- Key modules: `baselineProcess.ts`, `rounds.ts`, `round.ts`, `RoundSession.tsx`, `RedesignWorkshop.tsx`, `SiteBrand.tsx`, `processEdit.ts`, `roadGrid.ts`, `simulation.ts`, `pathGeometry.ts`, scene components, `SimulationView` / `DataView` / `OrbitCompleteScene`.
- Assets: **`public/`** for logos and static SVGs.
- No heavy game engines.

## Out of Scope for v1
- Full DMAIC / stats suite / multiplayer
- Full instructor authoring (tutor **share links** in scope)
- Mobile-first / in-app process map / waste-tagging UI
- Comparison tab (removed; use Data board for Round 1 vs Round 2 averages)
- Cross-round cloud persistence (localStorage Round 1 average → Round 2 Data is in scope)

## Working Style
- Small incremental working steps; keep app runnable.
- Clear names; comments only when intent is unclear.

## Git Practices
- Local Git active; meaningful commits; clean working tree.
- Remote may be configured (e.g. `origin` → GitHub); prefer push only when the user asks.
