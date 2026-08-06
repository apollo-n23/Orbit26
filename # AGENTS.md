# AGENTS.md — Orb-it Process Excellence Simulator

## Project Goal
Build a web-based interactive learning tool that teaches Lean Six Sigma concepts through short gameplay loops. The **primary learning measure is lead time** — end-to-end time from starting a unit through launch — and how process design changes improve it across rounds.

Setting: Orb-it, a fictional satellite constellation company. Learners act as process engineers improving the satellite integration and launch preparation value stream.

Tone: Professional, precise, operational. Light narrative framing only. No cartoonish or overly playful language.

## Core Learning Loop (must be preserved)
1. **Execute** — Run the process through **visualised, interactive process steps** (not an auto-playing checklist). Feel friction and waste as lead time.
2. **Data** — Review logged lead times on a lap-style board. Process mapping / waste tagging is done **outside** this app (no Map tab).
3. **Rounds** — Structured progression (see **Rounds model** below). Round 1 = as-is; later rounds redesign and re-measure.
4. **Redesign / Validate** — Change the process (or open a later round with an improved process) and compare lead times.

---

## Rounds model (settled — focus for multi-round work)

Learning is split into **rounds**. Each round is a self-contained play session with its own process config, lead-time board, and completion scene.

### Goal per round
- Launch **exactly 3 rockets** (`ROCKETS_PER_ROUND` / `MAX_RUNS_PER_SESSION` = 3).
- Each full cycle (all process steps through liftoff) logs **one lead time** on that round’s **Data** board.
- After the **third** launch: stop further Run Process for that round and cut to the **orbit complete** scene (Earth + three satellites on orbit paths).

### Round 1 — As-is
- **Route:** `#/round/1` (default when hash is empty).
- **Config:** `ROUND_CONFIGS[1]` in `src/data/rounds.ts` (`id: round-1-as-is`).
- **Process:** baseline inefficient process (`BASELINE_PROCESS` clone).
- **Complete headline:** **“As-is round complete”**.
- After complete: show the three lap times; offer **Continue to Round 2** and a **tutor share URL** for Round 2.

### Round 2 — Separate page / deep link (critical for tutors)
- **Route:** `#/round/2` (e.g. `https://<host>/#/round/2`).
- Tutors can share this link so a learner **starts at Round 2** without replaying Round 1.
- **Config:** `ROUND_CONFIGS[2]` (`id: round-2-baseline-copy`).
- **Process today:** intentional **near-copy of Round 1** (same steps/interactions) with a distinct process `id` / `name` / `version`. **Do not delete Round 2** or fold it back into Round 1.
- **Future:** Round 2 (and later) will hold redesigned process data / reduced waste; keep the routing and `RoundConfig` shape so tweaks are data + scene-driven, not a new app shell.
- **Complete headline:** “Round 2 complete” (orbit scene still used; Round 2 does not need a Round 3 button until that round exists).
- **State isolation:** each round mount uses a fresh `RoundSession` (`key={round.id}`). Lead-time logs **do not** carry across hash navigation; each round has its own board.

### Round architecture (implementation)
| Piece | Role |
|--------|------|
| `src/App.tsx` | Hash router only (`roundIdFromHash` / `hashForRound`) |
| `src/types/round.ts` | `RoundId`, `RoundConfig`, `ROCKETS_PER_ROUND`, hash helpers |
| `src/data/rounds.ts` | `ROUND_CONFIGS` for Round 1 and Round 2 |
| `src/components/RoundSession.tsx` | Full play chrome for one round (sim, data, complete) |
| `src/views/OrbitCompleteScene.tsx` | Post-round cutaway + share link UI |

When adding **Round 3+**: extend `RoundId`, add `ROUND_CONFIGS[n]`, teach `roundIdFromHash` the new path, and wire completion CTAs as needed. Prefer cloning/adapting process data over forking the whole session shell.

---

## Execute Phase — Interaction Model (settled design)

The Execute phase is a **hands-on floor / field simulation**. Prefer spatial scenes and direct manipulation over passive lists or auto-scroll timelines.

### Principles (do not regress)
- Each **process step** is its own interactive scene with a clear operator task.
- The learner must **perform work** (click, drag, keyboard, type codes, sequence controls, hold-to-fill, etc.) — not watch an automated token advance through a list.
- **Deliberate as-is friction is OK** (e.g. out-of-sequence stations, access codes, misaligned GO buttons) so lead time and waste are felt; redesign rounds should reduce that friction intentionally.
- **Step transitions (settled):**
  - **Default:** step finishes → `step_complete` → **Proceed to next step**.
  - **Haul exception:** after **Mount to launch pad**, auto-advance to the next step (`running` at next index) — **no** Proceed.
  - **Last process step:** liftoff → `completeUnitRun` (unit `complete`, freezes **Lead Time**, appends Data board entry). Never `completeUnitRun` on intermediate steps.
- Process definitions live in **React state** as a versioned process on `RoundSession` (from `RoundConfig.process`) so redesign can swap steps per round.
- Clear affordances: status line, badges, access-code banner, short work animations.
- **Do not** implement Execute as a vertical list that auto-scrolls on Run.
- Scenes should **look distinct** by environment (assembly / grassy haul / pad / mission control).

### Run status lifecycle
| Status | Meaning |
|--------|---------|
| `idle` | Session may be active; no unit on the floor |
| `running` | Operating the current step |
| `machine_working` | Manufacture approach→work→retreat |
| `awaiting_reorient` | Haul booster on pad; UI: **Mount to launch pad** (legacy status id) |
| `step_complete` | Step done; **Proceed** if used (not haul happy path) |
| `complete` | This **unit** finished via `completeUnitRun` |

**Round complete** is separate UI phase (`orbit-complete` in `RoundSession`) after **3** unit completes — not a `RunStatus`.

### Session / metrics (per round)
- **Start Session** arms play; **Run Process** starts a unit (`beginRun`, `runStartedAt`).
- Top bar:
  - **Lead Time** — wall-clock `m:ss` end-to-end until launch (`runEndedAt`). Primary metric. **No** Yield or Flow Efficiency on chrome.
  - **Launches** — `completed / 3` for the round.
- **Data** — lap board for **this round only** (run #, lead time, delta vs best, best tag). Goal: 3 rockets.
- **Comparison** — placeholder.
- After 3 launches → **Orbit complete** scene (not more Run Process).

---

## Baseline process steps (shared template)

Order is defined on the process version (from `baselineProcess` / per-round clone). Do not reorder without an explicit product decision.

### 1. Manufacture booster (`kind: manufacture`)
**Scene:** `ManufactureScene.tsx` — indoor line.

- Physical L→R station order **2 · 1 · 4 · 3**; operate **1 → 2 → 3 → 4**.
- **Drag-and-drop** booster to the next required stop (no auto belt travel).
- **4-digit `accessCode`** per station; banner shows code for the **current** required station; **Activate** only when code matches **and** booster is at that stop.
- Baseline codes: form-press `4821`, seam-welder `7390`, trim-laser `1564`, fit-arm `9057`.
- Variable **`parkOffset`**; Activate → approach → work → retreat; booster stays until dragged again.
- Finish → `step_complete` → **Proceed**.

### 2. Integrate payload (`kind: haul`)
**Scene:** `IntegratePayloadScene.tsx` + `pathGeometry.ts` — outdoor road.

- Arrow keys primary; D-pad secondary; drag optional.
- In-transit **re-orient** controls for corners (not the pad action).
- Safe: road (+ grass margin), Assembly apron, Launch pad, corner fillets. Pure grass → explode → Assembly reset.
- Pad: **Mount to launch pad** → **`completeHaulStep` auto-advances** to step 3. No haul Proceed. No `completeUnitRun`.

### 3. Prepare for launch (`kind: launch-prep`)
**Scene:** `LaunchPrepScene.tsx` (`lp-` CSS).

- Mate → crane stack → fuel (LOX/RP-1 tanks + lines **to vehicle ports**) → power switches.
- Crane close to stack so payload seats on the nose.
- Finish → `step_complete` → **Proceed to Launch sequence**.

### 4. Launch sequence (`kind: launch-sequence`)
**Scene:** `LaunchSequenceScene.tsx` (`launch-seq` / `mc-` CSS).

- GO poll in order (Guidance → Capcom → Fuel → Avionics → Range Safety → Weather); only current station armed.
- **As-is friction (settled):** GO rows are **widely spaced** and **slightly misaligned** (offset/rotation) so selecting each GO takes more time/motion — do not “tidy” this away in Round 1 without a redesign decision. Round 2+ may straighten this as an improvement.
- Hold-to-turn **launch key**, then **liftoff** cutaway (~3.2s; keep JS `LIFTOFF_MS` and CSS in sync).
- Liftoff → `completeUnitRun` → Lead Time freezes → Data board entry.

---

## Adding a new Execute step (checklist)

1. **Types** — `ProcessStepKind` + constants in `src/types/process.ts`.
2. **Process data** — `BASELINE_PROCESS` and/or **per-round** process in `src/data/rounds.ts` (Round 2 must stay independently editable).
3. **Scene** — component under `src/components/`; distinct environment.
4. **Simulation** — `src/lib/simulation.ts`: intermediate = Proceed or auto-advance; last step only = `completeUnitRun`; never reset `runStartedAt` mid-unit.
5. **UI** — `SimulationView` / `RoundSession` wiring; CSS namespace.
6. **Docs** — this file.
7. **Verify** — `npm run build`; commit.

Prefer CSS/SVG + pointer/keyboard. No heavy game engines.

## Adding or changing a round (checklist)

1. Extend `RoundId` and `ROUND_CONFIGS` in `types/round.ts` + `data/rounds.ts`.
2. Teach `roundIdFromHash` / `hashForRound` the new path.
3. Supply distinct `process`, labels, and complete copy.
4. Keep **3 launches** unless product explicitly changes `ROCKETS_PER_ROUND`.
5. Wire completion CTA / tutor link if a next round exists.
6. Do not merge round state into a single global log unless product asks for cross-round analytics.

---

## Key Constraints
- Individual unit runs stay short enough that **3 launches** fit a reasonable session; overall workshop may span rounds.
- Progressive unlocking of improvement levers (later rounds).
- Client-side first; hash routes for round deep-links (no backend required for Round 2 entry).
- Dark professional UI chrome; themed step interiors.
- Operational language; interactive scenes over polish for its own sake.

## Technical Preferences
- TypeScript + React (Vite).
- Hash routing for rounds (`App.tsx`); one `RoundSession` per round id.
- Key modules: `src/data/baselineProcess.ts`, `src/data/rounds.ts`, `src/types/round.ts`, `src/components/RoundSession.tsx`, `src/lib/simulation.ts`, `src/lib/pathGeometry.ts`, scene components, `src/views/SimulationView.tsx`, `DataView.tsx`, `OrbitCompleteScene.tsx`.
- Assets (logos, static SVG): prefer `public/` for site-wide files.
- No heavy game engines.
- Clarity and maintainability over visual effects.

## Out of Scope for v1
- Full DMAIC project structure
- Statistical analysis tools
- Multiplayer / competitive features
- Full instructor authoring suite (simple tutor **share links** for rounds are in scope)
- Mobile-first design
- In-app process mapping / Map tab
- Waste tagging UI (until redesign tooling)
- Cross-round persistent cloud saves (local isolation per round is fine)

## Working Style
- Prefer small, incremental, working steps.
- Always keep the application runnable after each change.
- Use clear, descriptive component and variable names.
- Comment only where intent is not obvious from the code.

## Git Practices
- A **local Git repository** is active in the project root.
- Commit **meaningful working changes** with clear, concise messages.
- Keep the **working tree clean**.
- **No remote** is configured — local-only for now.
