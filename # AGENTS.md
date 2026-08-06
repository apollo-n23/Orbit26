# AGENTS.md — Orb-it Process Excellence Simulator

## Project Goal
Build a web-based interactive learning tool that teaches Lean Six Sigma concepts (process mapping, waste identification, process redesign) through short gameplay loops (4–8 minutes).

Setting: Orb-it, a fictional satellite constellation company. Learners act as process engineers improving the satellite integration and launch preparation value stream.

Tone: Professional, precise, operational. Light narrative framing only. No cartoonish or overly playful language.

## Core Learning Loop (must be preserved)
1. **Execute** — Learner runs the current (initially inefficient) process through **visualised, interactive process steps** (not an auto-playing checklist).
2. **Map & Analyse** — Learner builds/adjusts a process map and tags the eight wastes.
3. **Redesign** — Learner edits the process (remove, merge, resequence, limited parallel paths or automation).
4. **Validate** — Redesigned process is re-run; metrics compared; new options unlock over sessions.

---

## Execute Phase — Interaction Model (settled design)

The Execute phase is a **hands-on floor / field simulation**. The learner operates the process themselves. Prefer spatial scenes and direct manipulation over passive lists or auto-scroll timelines.

### Principles (do not regress)
- Each **process step** is its own interactive scene with a clear operator task.
- The learner must **perform work** (click, drag, keyboard, sequence controls, hold-to-fill, etc.) — not watch an automated token advance through a list.
- Steps are **gated**: finish the current step → **Proceed to next step** (unless it is the last step, which completes the unit run).
- Process definitions live in **React state** as a versioned process (`ProcessVersion` in `App`) so redesign can later swap steps and re-run.
- Clear affordances: status line copy, numbered badges, disabled-until-ready controls, short work animations.
- **Do not** implement Execute as a vertical list of step descriptions that auto-scrolls when the user clicks Run.
- Scenes should **look distinct** by environment (e.g. indoor charcoal assembly line vs outdoor grassy haul road vs pad/tower).

### Run status lifecycle
| Status | Meaning |
|--------|---------|
| `idle` | Session may be active; no unit on the floor |
| `running` | Learner is operating the current step |
| `machine_working` | Manufacture machine mid approach→work→retreat |
| `awaiting_reorient` | Haul booster on pad; waiting for **Mount to launch pad** |
| `step_complete` | Current step done; show **Proceed** if more steps remain (haul auto-advances instead) |
| `complete` | All steps for this unit finished (`completedRuns++`) |

Full unit completion happens only on the **last** process step. Intermediate steps end in `step_complete` + Proceed.

### Session / metrics
- **Start Session** arms the session; **Run Process** starts a unit at step index 0 (`beginRun`).
- Top bar (live from run state):
  - **Cycle Time** — wall-clock `m:ss` from Run Process (`runStartedAt`) until the unit finishes (`completeUnitRun` sets `runEndedAt` and freezes the display). Not process work-minutes.
  - **Yield** — good runs / completed runs.
  - **Flow Efficiency** — process value-add minutes / process work minutes (still simulation-based).
- Cap full unit runs per session (**12**) so baseline inefficiency stays visible across repeats.
- Map and Comparison views remain placeholders until those learning-loop phases are built.

---

## Baseline process steps (current)

Order is fixed in `src/data/baselineProcess.ts`. Do not reorder without an explicit product decision.

### 1. Manufacture booster (`kind: manufacture`)
**Scene:** `ManufactureScene.tsx` — indoor production line (charcoal / orbital UI).

- Four stations with **physical L→R order 2 · 1 · 4 · 3** (`linePosition` 0–3).
- Operator sequence remains **1 → 2 → 3 → 4** (`sequence`).
- Booster is **drag-and-drop** along the belt: operator must place it on the next required station stop (no auto-travel between stations). Wrong stop / miss gives feedback and does not unlock the machine.
- Each station has a **4-digit `accessCode`**. A banner at the top of the manufacture scene shows the code for the **current required** station.
- Operator enters the code in that station’s text field. When the code matches **and** the booster is at that stop, an **Activate** control appears (no bare click-to-run).
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
- **Re-orient:** toolbar ↺/↻ 90° and fixed headings (0° / 90° / 180° / −90°). Long axis should follow the corridor at corners.
- Map is **aspect-locked** to the scene viewBox so booster position matches the road.
- **Collision / safety (settled):**
  - Safe: road corridor (visual width = short-side × 1.5) **+ grass margin**, **Assembly building/apron**, **Launch pad**, and **corner fillets** at path vertices.
  - Unsafe: pure grass (sample outside all safe regions).
  - Any unsafe footprint sample → **explosion VFX** → reset to Assembly start (not a silent teleport).
- When booster **touches the pad** → status `awaiting_reorient` → **Mount to launch pad** seats the booster on the pad → **auto-advances** to the next step (`running` at next index; no haul **Proceed**). Haul is **not** the final baseline step and must **not** call `completeUnitRun`.

### 3. Prepare for launch (`kind: launch-prep`)
**Scene:** `LaunchPrepScene.tsx` — pad beside launch tower.

- Only after haul mount-to-pad (auto-advance from step 2).
- Operator sub-tasks **in order** (reuses run `nextMachineIndex` / `completedMachineIds` for progress):
  1. **Mate** booster to tower (strongback control / slider)  
  2. **Crane** payload onto the stack (numbered crane sequence)  
  3. **Fuel** — connect umbilicals, hold-to-fill LOX/RP-1  
  4. **Power up** — arm switches in order  
- Completing the last sub-task → `step_complete` → **Proceed to Launch sequence** (launch-prep is **not** the final baseline step).

### 4. Launch sequence (`kind: launch-sequence`)
**Scene:** `LaunchSequenceScene.tsx` — mission control room (consoles, pad live feed).

- Only after launch-prep + Proceed.
- Operator actions **in order** (reuses run `nextMachineIndex` / `completedMachineIds`; constants in `types/process.ts`):
  1. **GO poll** — Guidance → Capcom → Fuel/Propulsion → Avionics → Range Safety → Weather (only the current station is armed)  
  2. **Launch enable key** — hold-to-turn physical key control  
  3. **Liftoff cutaway** — pad feed rocket leaves the tower (CSS animation)  
- Completing liftoff finishes the **full unit run** (`complete` + `completedRuns` / `goodRuns` via `completeUnitRun`, freezes wall-clock cycle time).

---

## Adding a new Execute step (checklist)

Use this when extending the baseline process (e.g. a fifth step after launch-sequence).

1. **Types** — Extend `ProcessStepKind` in `src/types/process.ts`; add any step-specific constants/actions.
2. **Process data** — Append a step to `BASELINE_PROCESS.steps` in `src/data/baselineProcess.ts` (`id`, `name`, `kind`, `baseTime`, optional config).
3. **Scene** — New component under `src/components/` with **operator-driven** interactions (match the hands-on style of existing steps). Give the scene a distinct visual environment if it is a new location.
4. **Simulation** — In `src/lib/simulation.ts`:
   - Previous last step must end in `step_complete` + Proceed (not `complete`) when a next step exists.
   - New step’s finish handler: `step_complete` if more steps follow, else `completeUnitRun` (last step).
5. **UI wiring** — `SimulationView.tsx` status copy, show/hide scene, Proceed button; `App.tsx` handlers; styles in `App.css` under a clear namespace (e.g. `launch-seq` / `mc-`; avoid clobbering manufacture / haul / launch-prep).
6. **Docs** — Update this file’s baseline step list.
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
- Waste tagging UI and redesign tools (until Map / Redesign phases)

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
