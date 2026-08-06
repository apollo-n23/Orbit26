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

## Execute Phase — Interaction Model (current design)

The Execute phase is a **hands-on floor simulation**. The learner operates the process themselves. Prefer spatial scenes and direct manipulation over passive lists or auto-scroll timelines.

### Principles
- Each **process step** is its own interactive scene with a clear operator task.
- The learner must **perform work** (click, drag, re-orient, sequence controls) to advance — not watch an automated token advance.
- Steps are **gated**: the next step is only available after the current step is complete (e.g. a **Proceed to next step** control).
- Process definitions live in **React state** as a versioned process so redesign can later swap steps and re-run the same session model.
- Keep interactions readable and operable: short animations when machines work, clear affordances for the next required action, operational copy in the status line.
- **Do not** implement Execute as a vertical list of step descriptions that auto-scrolls when the user clicks Run.

### Current process steps (baseline)
1. **Manufacture booster** (`kind: manufacture`)
   - Booster on a production line with **four machines** (robot arms, welder, laser).
   - Physical left-to-right station order may be out of sequence (baseline: **2, 1, 4, 3**); logical click order remains **1 → 2 → 3 → 4**.
   - Booster travels along the belt to the next required station before that machine unlocks.
   - Only the next machine is enabled once the booster arrives; on operate: approach line → work animation → retreat to park, then unlock the next.
   - When all four finish, the step is complete and **Proceed to next step** is offered (if a following step exists).

2. **Integrate payload** (`kind: haul`)
   - Accessible only after manufacture is complete and the learner proceeds.
   - Learner moves the booster from Assembly to the Launch Pad along a **winding outdoor road** (**arrow keys** primary; drag optional).
   - Path corridor is **50% wider than the booster** (short side × 1.5), plus a small grass margin. Assembly apron and launch pad are also safe. Pure grass (outside path/assembly/pad) → **explosion**, then reset to Assembly start.
   - On-screen **re-orient** controls (90° turns / fixed headings) help navigate corners; long axis should follow the corridor.
   - When the booster **touches the pad**, a **Reorient** button appears; confirming seats the booster correctly on the pad and completes the step → **Proceed to next step** (haul is not the final step in baseline).

3. **Prepare for launch** (`kind: launch-prep`)
   - Accessible only after haul/reorient is complete and the learner proceeds.
   - Pad scene with launch tower, strongback, crane, umbilicals, and power panel.
   - Operator sequence: **(1)** slide strongback control to mate booster to tower · **(2)** crane click sequence to stack payload fairing · **(3)** connect LOX/RP-1 umbilicals and hold-to-fill tanks · **(4)** arm power switches in order.
   - Completing all four sub-tasks finishes the full unit run (`complete` + completedRuns++).

### Session / metrics behaviour
- **Start Session** arms the session; **Run Process** starts a unit at the first step.
- Top-bar metrics update from the run: **Cycle Time**, **Yield**, **Flow Efficiency**.
- A full unit run completes only after all process steps for that unit are finished (baseline: manufacture → haul/reorient → launch-prep).
- Cap full unit runs per session (currently 12) so inefficiency remains visible across repeats.
- Map and Comparison views remain placeholders until those learning-loop phases are built.

### Adding new Execute steps
- Define the step on the process version (`id`, `name`, `kind`, times, optional machines / scene config).
- Build a dedicated scene component with **operator-driven** interactions.
- Wire completion into run state (`step_complete` → proceed, or `complete` if last step).
- Prefer CSS/SVG scenes and pointer events; avoid heavy game engines.
- Match dark professional UI (charcoal base, orbital blue, restrained amber accents).

## Key Constraints
- Sessions must stay in the 4–8 minute range.
- Progressive unlocking of improvement levers and analysis tools.
- Client-side first. Prefer deterministic simulation with light stochastic defects where used.
- Dark professional UI: charcoal base, orbital blue, restrained amber accents.
- Clean, minimal controls with operational language.
- Interactive Execute scenes first; polish only where it clarifies the task.

## Technical Preferences
- TypeScript + React (Vite).
- Process map (Map phase): SVG or lightweight canvas (keep it simple).
- Execute scenes: React components + CSS/SVG; pointer-driven interaction; shared process/run state in `App`.
- State: React state for current process version and run; local storage for progress/process versions in v1 later.
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
