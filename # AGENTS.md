# AGENTS.md — Orb-it Process Excellence Simulator

## Project Goal
Build a web-based interactive learning tool that teaches Lean Six Sigma concepts (process mapping, waste identification, process redesign) through short gameplay loops (4–8 minutes).

Setting: Orb-it, a fictional satellite constellation company. Learners act as process engineers improving the satellite integration and launch preparation value stream.

Tone: Professional, precise, operational. Light narrative framing only. No cartoonish or overly playful language.

## Core Learning Loop (must be preserved)
1. **Execute** — Learner runs the current (initially inefficient) process through **visualised, interactive process steps** (not an auto-playing checklist). Focus: experience and improve **lead time** (end-to-end assembly → launch).
2. **Data** — Review logged lead times across runs (lap board). Process mapping / waste tagging is handled **outside** this app for now.
3. **Redesign** — Learner edits the process (remove, merge, resequence, limited parallel paths or automation) — later.
4. **Validate** — Redesigned process is re-run; lead times compared on the Data board; new options unlock over sessions.

---

## Execute Phase — Interaction Model (settled design)

The Execute phase is a **hands-on floor / field simulation**. The learner operates the process themselves. Prefer spatial scenes and direct manipulation over passive lists or auto-scroll timelines.

### Principles (do not regress)
- Each **process step** is its own interactive scene with a clear operator task.
- The learner must **perform work** (click, drag, keyboard, type codes, sequence controls, hold-to-fill, etc.) — not watch an automated token advance through a list.
- **Step transitions (settled):**
  - **Default:** step finishes → `step_complete` → learner clicks **Proceed to next step**.
  - **Haul exception:** after **Mount to launch pad**, auto-advance to the next step (`running` at next index) — **no** Proceed click.
  - **Last step:** finish → `completeUnitRun` (status `complete`, freezes wall-clock Cycle Time). Never complete the unit on an intermediate step.
- Process definitions live in **React state** as a versioned process (`ProcessVersion` in `App`) so redesign can later swap steps and re-run.
- Clear affordances: status line copy, numbered badges, banners for required codes, disabled-until-ready controls, short work animations.
- **Do not** implement Execute as a vertical list of step descriptions that auto-scrolls when the user clicks Run.
- Scenes should **look distinct** by environment (e.g. indoor charcoal assembly line vs outdoor grassy haul road vs pad/tower vs mission control).

### Run status lifecycle
| Status | Meaning |
|--------|---------|
| `idle` | Session may be active; no unit on the floor |
| `running` | Learner is operating the current step |
| `machine_working` | Manufacture machine mid approach→work→retreat |
| `awaiting_reorient` | Haul booster on pad; waiting for **Mount to launch pad** (legacy status id; UI says Mount, not Reorient) |
| `step_complete` | Current step done; show **Proceed** if more steps remain (not used for haul happy path) |
| `complete` | All steps for this unit finished via `completeUnitRun` (`completedRuns++`, `runEndedAt` set) |

Full unit completion happens only on the **last** process step (baseline: launch-sequence liftoff).

### Session / metrics
- **Start Session** arms the session; **Run Process** starts a unit at step index 0 (`beginRun`).
- Top bar (live from run state):
  - **Lead Time** — wall-clock `m:ss` end-to-end from Run Process (`runStartedAt`) through launch (`completeUnitRun` sets `runEndedAt` and freezes the display). Primary learning measure (not process work-minutes).
  - **Yield** — good runs / completed runs.
  - **Flow Efficiency** — process value-add minutes / process work minutes (still simulation-based).
- Cap full unit runs per session (**12**) so baseline inefficiency stays visible across repeats.
- **Primary views:** Simulation · **Data** · Comparison.
  - **Data** — ongoing lead-time board (motorsport lap style): each completed full cycle (assembly → launch) appends one entry; show run #, lead time, delta vs best, best highlighted. Process mapping is **out of scope** here (done separately — do not reintroduce a Map tab).
  - **Comparison** — still a placeholder until Validate/compare UX is built.

---

## Baseline process steps (current)

Order is fixed in `src/data/baselineProcess.ts`. Do not reorder without an explicit product decision.

### 1. Manufacture booster (`kind: manufacture`)
**Scene:** `ManufactureScene.tsx` — indoor production line (charcoal / orbital UI).

- Four stations with **physical L→R order 2 · 1 · 4 · 3** (`linePosition` 0–3).
- Operator sequence remains **1 → 2 → 3 → 4** (`sequence`).
- Booster is **drag-and-drop** along the belt: operator must place it on the next required station stop (no auto-travel between stations). Wrong stop / miss gives feedback and does not unlock the machine.
- Each station has a **4-digit `accessCode`** (baseline: form-press `4821`, seam-welder `7390`, trim-laser `1564`, fit-arm `9057`).
- A **banner** at the top of the manufacture scene shows the code for the **current required** station only.
- Operator types the code into that station’s field. When the code matches **and** the booster is at that stop, **Activate** appears (no bare click-to-run on the machine body).
- Machines park at **variable** `parkOffset` (rem) from the line — some closer, some further. On Activate (required + booster arrived + correct code):
  1. Approach the line (travel distance follows parkOffset)  
  2. Work animation (robot-arm / welder / laser remain distinct)  
  3. Retreat to park  
  4. Unlock the next sequence (booster stays put until the operator drags it)  
- Timing constants in `types/process.ts`: `MACHINE_APPROACH_MS`, `MACHINE_WORK_MS`, `MACHINE_RETREAT_MS`, `MACHINE_CYCLE_MS`, `BOOSTER_TRAVEL_MS`.
- When all four finish → `step_complete` → **Proceed to next step**.

### 2. Integrate payload (`kind: haul`)
**Scene:** `IntegratePayloadScene.tsx` + `pathGeometry.ts` — outdoor grassy field, asphalt road.

- Only after manufacture + Proceed.
- **Primary move:** arrow keys (continuous while held). **Secondary:** on-screen D-pad; drag optional.
- **Re-orient (in-transit):** toolbar ↺/↻ 90° and fixed headings (0° / 90° / 180° / −90°) for corners — not the pad action.
- Map is **aspect-locked** to the scene viewBox so booster position matches the road.
- **Collision / safety (settled):**
  - Safe: road corridor (visual width = short-side × 1.5) **+ grass margin**, **Assembly building/apron**, **Launch pad**, and **corner fillets** at path vertices.
  - Unsafe: pure grass (sample outside all safe regions).
  - Any unsafe footprint sample → **explosion VFX** → reset to Assembly start (not a silent teleport).
- When booster **touches the pad** → status `awaiting_reorient` → button **Mount to launch pad** (not “Reorient”) seats the booster → **`completeHaulStep` auto-advances** to step 3 (`running`, next index; no haul Proceed UI). Must **not** call `completeUnitRun`.

### 3. Prepare for launch (`kind: launch-prep`)
**Scene:** `LaunchPrepScene.tsx` — pad beside launch tower (`lp-` CSS namespace).

- Only after haul mount-to-pad (auto-advance from step 2).
- Operator sub-tasks **in order** (reuses run `nextMachineIndex` / `completedMachineIds` for progress):
  1. **Mate** booster to tower (strongback control / slider)  
  2. **Crane** payload onto the stack (numbered crane sequence 1→4)  
  3. **Fuel** — connect umbilicals, hold-to-fill LOX/RP-1  
  4. **Power up** — arm switches in order  
- **Layout (settled):** crane boom sits **close to the stack** so the payload lowers **onto the booster nose** (not a distant floating crane). LOX/RP-1 have **tank graphics** on the supply end; lines must **visually reach vehicle ports** when connected (not short of the hull).
- Completing the last sub-task → `step_complete` → **Proceed to Launch sequence** (not the final baseline step).

### 4. Launch sequence (`kind: launch-sequence`)
**Scene:** `LaunchSequenceScene.tsx` — mission control room (consoles, pad live feed; `launch-seq` / `mc-` CSS).

- Only after launch-prep + Proceed.
- Operator actions **in order** (reuses run `nextMachineIndex` / `completedMachineIds`; constants in `types/process.ts`):
  1. **GO poll** — Guidance → Capcom → Fuel/Propulsion → Avionics → Range Safety → Weather (only the current station is armed)  
  2. **Launch enable key** — hold-to-turn physical key control  
  3. **Liftoff cutaway** — pad feed: tower/pad, plume, climb (CSS; duration ~`LIFTOFF_MS` / 3.2s — keep JS timer and CSS in sync)  
- Completing liftoff is the **only** baseline path to **full unit run** complete (`completeUnitRun` → freezes wall-clock **Lead Time** and appends one entry to the Data lead-time board).

---

## Adding a new Execute step (checklist)

Use this when extending the baseline process (e.g. a fifth step after launch-sequence).

1. **Types** — Extend `ProcessStepKind` in `src/types/process.ts`; add any step-specific constants/actions.
2. **Process data** — Append a step to `BASELINE_PROCESS.steps` in `src/data/baselineProcess.ts` (`id`, `name`, `kind`, `baseTime`, optional config).
3. **Scene** — New component under `src/components/` with **operator-driven** interactions (match the hands-on style of existing steps). Give the scene a distinct visual environment if it is a new location.
4. **Simulation** — In `src/lib/simulation.ts`:
   - Previous last step must end in `step_complete` + Proceed **or** an explicit auto-advance (like haul) — never `completeUnitRun` when a next step exists.
   - New step’s finish handler: `step_complete` / auto-advance if more steps follow, else `completeUnitRun` (last step only).
   - Wall-clock `runStartedAt` must survive step transitions; only `completeUnitRun` sets `runEndedAt`.
5. **UI wiring** — `SimulationView.tsx` status copy, show/hide scene, Proceed (where used); `App.tsx` handlers; styles in `App.css` under a clear namespace (e.g. `lp-`, `launch-seq` / `mc-`; avoid clobbering manufacture / haul).
6. **Docs** — Update this file’s baseline step list and transition rules.
7. **Verify** — `npm run build`; keep the app runnable; commit with a clear message.

Prefer CSS/SVG + pointer/keyboard events. No heavy game engines.

---

## Key Constraints
- Sessions must stay in the 4–8 minute range.
- Progressive unlocking of improvement levers and analysis tools.
- Client-side first. Prefer deterministic simulation with light stochastic defects where used.
- Dark professional UI chrome: charcoal base, orbital blue, restrained amber accents (step interiors may use themed environments).
- Clean, minimal controls with operational language.
- Interactive Execute scenes first; polish only where it clarifies the task.

## Technical Preferences
- TypeScript + React (Vite).
- Process map (Map phase): SVG or lightweight canvas (keep it simple).
- Execute: React scene components + CSS/SVG; shared process/run state in `App`.
- Key modules: `src/data/baselineProcess.ts`, `src/lib/simulation.ts`, `src/lib/pathGeometry.ts` (haul), `src/types/process.ts`, `src/views/SimulationView.tsx`.
- State: React state for current process version and run; local storage for progress later in v1.
- No heavy game engines.
- Prioritise clarity and maintainability over visual effects.

## Out of Scope for v1
- Full DMAIC project structure
- Statistical analysis tools
- Multiplayer / competitive features
- Instructor authoring tools
- Mobile-first design
- In-app process mapping / Map tab (mapping done separately)
- Waste tagging UI and redesign tools (until Redesign / Validate phases)

## Working Style
- Prefer small, incremental, working steps.
- Always keep the application runnable after each change.
- Use clear, descriptive component and variable names.
- Comment only where intent is not obvious from the code.

## Git Practices
- A **local Git repository** is active in the project root.
- Commit **meaningful working changes** with clear, concise messages.
- Keep the **working tree clean** (no leftover uncommitted noise after a task).
- **No remote** is configured — local-only for now.
