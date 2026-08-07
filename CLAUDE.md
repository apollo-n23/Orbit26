# CLAUDE.md — Orb-it Process Excellence Simulator

## Project Goal
Build a web-based interactive learning tool that teaches Lean Six Sigma concepts through short gameplay loops. The **primary learning measure is lead time** — end-to-end time from starting a unit through launch — and how process design changes improve it across rounds. **Total cost of improvement** (Round 2 redesign, broken down by source) is a secondary scored metric on the Data board.

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
- Each full cycle → one **Data** entry (`LeadTimeEntry`: run number, lead time ms, optional `costBreakdown`, `heightAchievedMiles`, `defectCount`, completedAt).
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

| Tab | Learner actions | Persisted on `ProcessVersion` (and often mirrored on the step) | Cost |
|-----|-----------------|----------------------------------------------------------------|------|
| **1 · Manufacture** | Drag stations for **line order**; **parkOffset** sliders; **auto-transfer** upgrade (open panel on hover/click — **panel stays open** so the enable button is clickable) | `linePosition`, `parkOffset` on machines; `autoMoveBooster` | **15 pts** per machine ever moved from its factory slot · **40 pts** one-time for auto-transfer |
| **2 · Haul road** | Paint/erase tiles only (**no** Straight/Reset shortcuts). Endpoints & tree-cluster tiles fixed and free. | `haulPath` / `haulPathOverride` | The road as it stood when the session started is **free** (0 pts) — only tiles painted **beyond** it cost **10 pts** each; selling an existing tile credits **10 pts** back. The **only** category that can go back down. |
| **3 · Launch prep tech** | Invest in **as many of the four** techs as the budget allows (not mutually exclusive; toggle each on/off independently) | `launchPrepTechs` | **20/25/50/20 pts** (faster-pumps / auto-power / payload-drone / strongback-redesign) — deselecting a tech does not refund a previously-tried one |
| **4 · Launch sequence** | **Realign** each GO; **info** criticality; Range Safety may be **deleted** from sequence; **Key lubrication** toggle (near-instant key-arm hold instead of the long as-is hold) | `launchSeqRealignIds`, `launchSeqRemovedIds`, `keyLubrication` | **10 pts** per GO ever realigned · **35 pts** for removing Range Safety · **15 pts** one-time for key lubrication |

**Lock-in UX (settled):**
- Warning banner: finish all tabs before locking; layout is fixed for all three launches.
- **Confirm layout & start launches** opens **Are you sure?** (No = keep editing / Yes = lock in).
- Confirm stamps road path + `costBreakdown`, re-stamps launch-prep tech and launch-seq redesign so fields survive `applyHaulPath`.

**Total cost of improvement (`lib/redesignCost.ts`):** a prominent banner in the redesign header (visible on every tab, not just Haul road) shows the live running total + a per-category breakdown, and warns that only road tiles are reducible. Starts at **0**. Every category except road tiles is a **one-way ratchet within the redesign session** — tracked via `ever*` state in `RedesignWorkshop.tsx` (`everMovedMachineIds`, `everAutoTransferOn`, `everSelectedTechIds`, `everRealignedGoIds`, `everRangeRemoved`, `everKeyLubricationOn`) that only grows, even if the learner later toggles an investment off — so switching techs or moving a machine back doesn't refund it. Road cost alone is derived live, **relative to the road as it stood at session start** (`roadGrid.ts`'s `roadCostFromTiles(tiles, baselineTiles)`) — that starting road is free, so cost begins at 0 pts; only tiles painted beyond it cost points, and selling an existing tile credits points back (can go negative), while erasing a self-added tile just cancels its own charge. Fixed as `ProcessVersion.costBreakdown` at Confirm; copied to each `LeadTimeEntry.costBreakdown` when a launch is logged. Data board shows a Redesign cost column plus a full breakdown panel (Manufacture / Haul road / Launch prep / Launch sequence) alongside both rounds' lead times. Re-entering the workshop via the stage nav starts a fresh cost session from the carried-over draft (matches the existing reset-on-redesign-reentry behaviour), not a running total across every visit.

**Budget cap (`REDESIGN_BUDGET` = 180 pts, `lib/redesignCost.ts`):** once the running total would exceed the budget, that specific cost-increasing action is blocked — the control (drag-drop, tech card, Realign, Delete from sequence, an unpainted grass tile) is disabled and/or the click is a no-op with a `budgetError` message surfaced in the cost banner. Gating always compares the marginal cost of *that* action against `REDESIGN_BUDGET − costBreakdown.total`, so already-sunk choices (an `ever*`-tracked tech/realign/move) stay freely reversible even at zero budget. Selling road tiles is never blocked — it only frees up room. The cost banner shows a live "Budget remaining" figure and flips to a red exhausted state at 0.

### Gemba walk (`views/GembaWalkthrough.tsx`)

A 4th stage-nav tab, positioned **before** Round 1 — "go to the Gemba" (Lean:
observe the real process directly). Lets a tutor/learner open **any** of
Round 1's as-is process steps directly, in any order, to inspect/demo it —
not a linear Run Process → Proceed playthrough.

- **Route:** `#/gemba`. `AppStage` includes `'gemba'`; `StageNav` lists it first.
- **Fully isolated:** reads `getRoundConfig(1).process` **read-only** (never
  calls an `apply*` mutator — there is no redesign here) and owns its own
  local `run: RunState`, seeded fresh per step via `freshStepRun(index)`
  (`lib/simulation.ts`'s `INITIAL_RUN_STATE` + `currentStepIndex`). It does
  **not** render inside a `RoundSession`, does **not** call
  `onLeadTimeLogChange`/`saveRound1LeadTimeResults`, and is mounted only
  while `stage === 'gemba'` (no state to preserve across hops) — so it can
  never affect Round 1, the redesign workshop, Round 2, or the Data tab.
- **Step nav:** one tab per `process.steps` entry (reuses `.redesign-tabs`
  styling). Selecting a step — including re-selecting the current one —
  bumps a `visitNonce` used in each scene's React `key`, forcing a full
  remount so there's never stale seated/positioned state from a prior visit.
- **Reset step button** (`.gemba-step-toolbar`, next to the status line,
  Gemba-only — no equivalent in Round 1/2 play or the redesign workshop):
  calls `selectStep(stepIndex)` with the *current* step, reusing the exact
  same reset-and-remount path as re-clicking that step's own nav tab. No new
  reset logic — this button just gives that existing behaviour a dedicated,
  discoverable affordance.
- **Reuses the real scene components** (`ManufactureScene`,
  `IntegratePayloadScene`, `LaunchPrepScene`, `LaunchSequenceScene`) and the
  real per-step transition functions (`startMachineWork`,
  `finishMachineWork`, `markOnPad`, `finishLaunchPrepAction`,
  `finishLaunchSequenceAction`) so interaction feels identical to real play.
  Two deliberate differences from `SimulationView`: no Proceed button is
  ever rendered (step nav replaces it), and haul's Mount-to-launch-pad
  handler is a no-op rather than `completeHaulStep` — that function
  auto-advances `currentStepIndex` into the next step, which would fight
  the step nav. The scene's own "seated" visual already shows arrival.

### Customer Portal (`views/CustomerPortalView.tsx`)

A separate stage, deliberately **outside** the Gemba/Round1/Redesign/Round2
learning-loop group — a static, read-only "voice of customer" feed.

- **Route:** `#/customers`. `StageNav` renders it as its own
  `stage-nav__customer-btn` (magenta `--color-customer-accent`, built around
  brand-magenta/Pantone 227 — see below — and distinct from the orange
  stage-group accent), positioned to the side: `.stage-nav__group` takes
  `flex: 1` and centers the 4 main stage buttons, leaving the customer
  button pinned at the far end of the bar rather than in that group.
- **Fictional platform:** "Starfeed" (own name/wordmark/ring-and-dot logo
  mark, `.customer-platform-header` — deliberately distinct from the real
  Orb-it brand, since this page represents a third-party social platform
  Orb-it's customers happen to use). Content is static flavor text
  (`POSTS` array) — not wired to any real app data (lead times, height,
  defects). Posts complain about launch cadence/delays, altitude
  inconsistency, slow end-to-end process, and boosters exploding on the
  haul road; several explicitly ask for **exactly 75 miles**, as fast as
  possible — in the customers' own words, a plain memorable number, however
  the engineering height-achieved metric elsewhere in the app happens to be
  randomised (also miles — this page and that metric use the same unit on
  purpose now; it wasn't always so, see git history if the numbers ever
  look inconsistent again). The empty purple space to
  the right of the title/tagline (`.customer-platform-header__stars`) is
  filled with a fixed `HEADER_STARS` array of small twinkling dots
  (`@keyframes customer-star-twinkle` — opacity/scale pulse, staggered
  `animationDelay`/`animationDuration` per star so they don't sync up) —
  purely decorative, fixed positions rather than randomised so they don't
  jump around on re-render.
- **Left nav** (`.customer-nav`) is a non-functional X/Twitter-style mockup
  (Home/Explore/Notifications/etc. + a decorative "Post" button) establishing
  the platform's UI, purple-themed to match. Its account chip at the bottom
  shows **Orb-it logged in** (`OrbitLogo.png` avatar, `@OrbitOfficial`) — the
  in-fiction premise is that Orb-it is watching this feed as its own account.
- **Replies are interactive** (the one non-static piece): clicking anywhere
  on a post (`role="button"`, keyboard-accessible) toggles `expanded` state
  and reveals that post's `replies` — a few other fictional customers
  agreeing/adding their own take, and, on several key threads, an official
  **Orb-it reply** (`reply.isCompany`, styled with the Orb-it logo as avatar
  via `.customer-reply--company`) apologising and committing to a named
  improvement project (cadence, haul-road safety, altitude consistency,
  process cycle time) — a deliberate nod to the app's own Lean/VOC theme.
- **Company card** (`.customer-company-card`): each `CustomerPost.company`
  names who that customer works for — a realistic mix of telecoms, defence,
  science/research, and other space customers (2 each: NimbusLink/
  Continental, Ironhold/Sentinel, Halcyon/Arcvale, Aegis Orbital Logistics/
  Lumen Constellation). Bios scatter callbacks to the app's own themes
  ("operating at 75 miles", "creating evenly spaced satellite networks",
  "requiring scientific precision" — verbatim, plus creative variations).
  Renders **beside that specific post** — each post is wrapped in a
  `.customer-post-row` (flex row, `flex-wrap: wrap`) containing the
  `<article>` and, only while that post's own `isOpen` is true, an `<aside>`
  companion card right next to it — so it always appears at whatever scroll
  position the post is at, no sticky/absolute positioning and no "scroll
  back up to read it." Wraps to its own line below the post when the
  viewport's too narrow for both side by side (same breakpoint as the nav
  collapsing, 860px). Multiple posts can show their own card at once if more
  than one is expanded — there's no single shared "active" state anymore.
- Mounted only while `stage === 'customers'`, like `GembaWalkthrough` — no
  state to preserve across hops (the expanded-replies state resets each
  time you leave and come back).

### Launch-prep tech → play behaviour (`launchPrepTechs`)
Not mutually exclusive — any combination can be active simultaneously; the only limit is the redesign budget.

| Value | Play effect in `LaunchPrepScene` |
|--------|----------------------------------|
| `faster-pumps` | Near-instant LOX/RP-1 fill while holding |
| `auto-power` | Single master **ON** (not four sequential switches); one click completes power-up |
| `payload-drone` | Crane UI → one-step **Deploy payload drone** + drone visual |
| `strongback-redesign` | Strongback-mate slider's target (and rendered width) halved — `mateTarget = 50` instead of `100` |
| none selected | Baseline multi-step crane, slow fill, four power switches, full-length mate slider |

Resolve via `resolveLaunchPrepTechs(process)` (returns `LaunchPrepTech[]`). Scene must re-read techs when the launch-prep step starts (do not rely on a stale prop only).

### Launch-sequence redesign → play (`resolveLaunchSeqConfig`)
- Filters out `launchSeqRemovedIds` (e.g. `go-range`).
- Builds dynamic actions: remaining GOs → key-arm → liftoff (`keyIndex` / `liftoffIndex` from list length).
- **Realigned** GO rows use CSS that **overrides** stagger (use high enough specificity: `.mc-go-row.mc-go-row--realigned`).
- Non-realigned keep as-is wide gaps + misalignment.
- Round 1: full six GOs, all misaligned.

**Branding + rocket scale in this scene (`LaunchSequenceScene.tsx`, all four contexts it renders in — Round 1 play, Round 2 play, Gemba, and the redesign workshop's own preview below):**
- `.mc-pad-view__brand` — Orb-it logo, upper-left corner of `.mc-pad-view` (the window showing the rocket on the pad / lifting off). Not in `.mc-screen__label` (the "PAD 1 · LIVE" bar above it) — specifically inside the viewport itself, per the brief.
- `.mc-rocket__logo` — small Orb-it decal on the booster hull (`.mc-rocket__body`), above the stripe.
- Rocket assembly (`.mc-pad-view__rocket`, `.mc-rocket__body/__nose/__fin/__exhaust`) sized up from the original baseline (~×1.35 on every dimension) — done via base width/height, not `transform: scale()`, because the liftoff `@keyframes mc-liftoff` sets its own `transform` per keyframe and would silently override (not compose with) a size-only transform once liftoff starts.
- **Redesign workshop preview:** the launch-sequence tab (`RedesignWorkshop.tsx`) renders this same `LaunchSequenceScene` live, driven by a local `previewRun` (fresh `RunState` via `INITIAL_RUN_STATE` + the draft's actual launch-sequence step index) — same self-contained, nothing-logged pattern as `GembaWalkthrough`. `onActionComplete` calls `finishLaunchSequenceAction(draft, prev)` on that local state only. A `useEffect` keyed on `launchSeqRealignIds`/`launchSeqRemovedIds` resets and remounts it (`previewNonce` key) whenever the redesign changes underneath it, so it can never end up mid-sequence pointing at a GO station index that no longer exists after a realign/removal edit. (Toggling key lubrication does **not** trigger this reset — it only changes a timing constant read live from `process`, never a station index.)

**Key lubrication** (`process.keyLubrication` / step mirror; `resolveKeyLubrication` / `applyKeyLubrication` in `processEdit.ts`): a one-time, 15 pt toggle on the launch-sequence tab (own `.redesign-key-lube` card, reusing `.redesign-tech-card` styling — not part of the launch-prep tech's mutually-exclusive set, since it's an independent lever on a different step). In play, `LaunchSequenceScene.tsx` resolves it fresh each render and swaps the hold-to-turn-key duration from `KEY_HOLD_MS_BASELINE` (1400ms) to `KEY_HOLD_MS_LUBRICATED` (120ms) — "almost instantaneous" per the brief — and updates the key-bay hint text accordingly. Costed and gated exactly like the other one-time toggles (`everKeyLubricationOn` sticky tracking, `blockOverBudget`), and re-stamped defensively at Confirm alongside launch-prep tech and launch-seq redesign.

### Round architecture
| Piece | Role |
|--------|------|
| `App.tsx` | Hash router; owns `AppStage`; mounts **both** rounds' `RoundSession` permanently (visibility-toggled, never unmounted) so stage hops keep state; mounts/unmounts `GembaWalkthrough`/`CustomerPortalView` on demand (no cross-stage state to keep); passes `activeStage`/`onNavigateStage` down to each page rather than rendering `StageNav` itself |
| `types/round.ts`, `data/rounds.ts` | Round configs; `AppStage` + `hashForStage` / `stageFromHash` |
| `RoundSession.tsx` | redesign / play / orbit-complete for one round; accepts `hidden`, `requestedPhase`, `onPhaseChange`, `activeStage`, `onNavigateStage`; renders its own `StageNav` beneath its own banner in all three phase branches |
| `views/GembaWalkthrough.tsx` | Gemba walk — see below |
| `StageNav.tsx` | Stage nav: Gemba · Round 1 · Redesign · Round 2, plus a separately-styled Customer Portal button off to the side. Rendered by each page beneath its own PMI banner, not once at the `App.tsx` level — see "Stage nav (settled)" below |
| `views/CustomerPortalView.tsx` | Customer Portal — see below |
| `RedesignWorkshop.tsx` | Round 2 pre-play redesign |
| `processEdit.ts`, `roadGrid.ts` | Apply/resolve redesign fields |
| `lib/redesignCost.ts` | Point costs + `RedesignCostBreakdown` builder for the total cost of improvement |
| `OrbitCompleteScene.tsx` | End-of-round cutaway |
| `SiteBrand.tsx` | Top banner brand lockup |
| `lib/roundMetrics.ts` | Round 1 avg + per-launch times save/load; averages |
| `RoundLeadTimeCompare.tsx` | Visual R1 vs R2 averages + three-launch bar compare (Data + orbit complete) |
| Views | **Simulation** · **Data** only (**Comparison tab removed**) |

### Stage nav (settled)

Persistent stage nav (`StageNav.tsx`) lets a tutor/learner hop directly between **Round 1**, **Redesign**, and **Round 2** — independent of the as-is → redesign → launches linear flow.

- **Position: beneath the PMI brand banner, on every page.** `StageNav` is **not** rendered once at the `App.tsx` level — `App.tsx` only owns the `stage` state and passes `activeStage`/`onNavigateStage` down as props. Each page renders its own `<StageNav>` immediately after its own PMI banner header: `RoundSession` renders it in all three of its phase branches (orbit-complete, redesign, and play — right after `TopBar` in the play branch), and `GembaWalkthrough` / `CustomerPortalView` each render it right after their own `<SiteBrand>` header. This keeps the nav directly under the "PMI · Orb-it" banner everywhere, rather than above it.
- **Routes:** `#/round/1` · `#/redesign` · `#/round/2` (`AppStage` in `types/round.ts`).
- **Both rounds stay mounted for the app's lifetime** (`App.tsx` renders both `RoundSession`s, hidden via inline `display: none` rather than unmounted) — hopping never loses in-progress state (process edits, run in flight, lead-time log).
- **Round 2 phase is nav-controlled** via `requestedPhase`/`onPhaseChange` props on `RoundSession`:
  - Clicking **Redesign** always jumps into the workshop (even mid-round or post-completion) — and **resets that round's play state** (session, run, lead-time log) so it plays out fresh under whatever design is confirmed next.
  - Clicking **Round 2** only *advances* redesign → play; it never regresses an in-progress or completed round back to the workshop.
  - A **fresh deep link** (e.g. tutor share URL landing straight on `#/round/2`) is unaffected — the forcing only reacts to a `requestedPhase` *change after mount*, so first load still lands on the round's natural starting phase (redesign, since Round 2 `allowsRedesign`).
  - Internal auto-advances (Confirm redesign → play) report back via `onPhaseChange` so the nav's active tab stays correct even without a nav click.
- **Round 1 → Round 2 CTA** (`onNavigateRound2` on Round 1's `RoundSession`, used by the orbit-complete "Continue to Round 2" button) navigates to the **Redesign** stage, not Round 2 play — preserves the original "share link lands on the workshop" flow.

---

## Site chrome & branding (settled)

- **Top banner** on play, redesign, and orbit-complete: **PMI logo** (left) · divider · **Orb-it** + subtitle/round label. Overall app branding is PMI — this banner stays PMI-only, never the Orb-it mark.
- Logo asset: `public/PMI Logo.svg` → URL `/PMI%20Logo.svg` via `SiteBrand` (`import.meta.env.BASE_URL`).
- **Orb-it (in-fiction) logo** — `public/OrbitLogo.png` → URL `/OrbitLogo.png`, same `import.meta.env.BASE_URL` pattern. This is the fictional company's own mark, used *inside* the exercise/simulation content (never the top banner): the booster's `.booster__logo` decal (`Booster.tsx` — appears in manufacture, haul, launch-prep, and the redesign workshop, since they all reuse this one component), a small badge on the Assembly building facade in the haul scene (`IntegratePayloadScene.tsx`, SVG `<image>`, 18×18), a **much larger** one (60×60, ≥3× the Assembly badge on purpose) centered on the Launch Pad in that same scene — drawn *before* the dashed pad-seated marker/"Launch Pad" text in SVG order so those stay legible on top — and a brand mark on the orbit-complete panel (`OrbitCompleteScene.tsx`). Add further Orb-it-branded touches to other process-step/simulation content freely — just keep the top banner PMI-only.
- The haul/pad scene (`IntegratePayloadScene.tsx`) didn't render inside the redesign workshop at all until it needed to for this same reason — its Haul road tab now also has a **live preview** (`.redesign-haul-preview`, right after the tile grid) of that scene, driven by a local `haulPreviewRun` against whatever path `pathFromRoadTiles(roadTiles)` currently resolves to (falling back to baseline `HAUL_PATH` if the painted tiles don't yet form a valid connected path). Keyed by the path's own coordinates so repainting the road forces a clean remount instead of leaving the preview booster stranded on a path that no longer exists. Same self-contained, nothing-logged pattern as the launch-sequence preview and `GembaWalkthrough` — `onMountToPad` is a no-op for the same reason `GembaWalkthrough`'s is (the real `completeHaulStep` auto-advances to the next process step, which isn't rendered here).
- Play top bar metrics: **Lead Time** + **Launches x/3** only (no Yield / Flow Efficiency).
- Static site assets belong in **`public/`** (not `src/` unless import-bundled).
- **Brand colour palette:** official PMI Pantone palette lives as `--color-brand-*` CSS custom properties in `src/index.css` (see `docs/brand/brand-tokens.md`). The existing named accent tokens (`--color-orbital`/`--color-orbital-strong`, `--color-amber`, `--color-nav-accent`, `--color-text-dim`) now alias these brand tokens rather than carrying their own hex. `--color-customer-accent`/`--color-customer-accent-strong` are built around `--color-brand-magenta` (Pantone 227, `#B00060`) rather than purple — `-strong` is the true Pantone 227 (solid-fill/high-emphasis use, e.g. the active nav button), the base token is a lightened tint of it for legible text/icon use on the dark chrome. Stays scoped to the Customer Portal only, distinct from the shared accent set. The near-black dark-chrome tokens (`--color-bg`/`--color-surface`/`--color-border*`) and hand-tuned illustrative shading in scene art are intentionally **not** forced onto the brand palette — they're UI neutrals/light-shadow tints, not brand-identity colours. New UI colour choices should use a `--color-brand-*` token (or an existing aliased accent token) rather than a fresh hardcoded hex.

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
- **Each explosion is a logged defect.** `onExplode` fires once the reset animation finishes (renamed from the never-wired `onPathReset`) → threaded through `SimulationView`'s `onHaulExplode` → `RoundSession`'s `defectCountRef`, which accumulates for the current launch attempt and resets to 0 in `handleRunProcess` (new Run Process) and every other run/log reset point. Same `RoundSession` component plays both rounds, so this works identically on Round 1 and Round 2 with no extra wiring. The Gemba walkthrough never passes `onExplode`, so exploding there is purely visual and logs nothing.
- Mount to pad → auto-advance to launch-prep.
- **Coastline (decorative, non-interactive):** the rightmost road-grid column (`roadGrid.ts` `ROAD_COLS=20`, col 19, scene x=760–800) is sea; a narrow sand band (x=746–760) sits between it and the grass, with a wavy coastline stroke at the sand/sea boundary. Drawn as a background layer *before* the `haul-field-vignette` overlay (so the vignette darkens it consistently with the rest of the map) and *before* the road/buildings/pad (which render on top, since the pad's right edge already sits close to this strip). Purely visual — does not extend `SCENE_WIDTH`/`ROAD_COLS` or otherwise touch gameplay geometry, so none of the safety-zone or road-tile logic changes.
- **No-fly zone (decorative, non-interactive):** a dashed red placard rect + four small drone-prohibition markers drawn around `LAUNCH_PAD` (`NO_FLY_MARGIN` = 30, corner markers inset so they stay on-canvas) plus a "NO FLY ZONE" label below the pad. Rendered as its own `<g>` after the pad group so it sits on top; no handlers attached, so it is never interactive (same convention as the tree cluster / building groups).
- **Offices annex:** a small labelled building to the left of Assembly (scene x=8–48), clear of the road (nearest segment runs x=95–220). Assembly's own rect kept its **right edge fixed at x=128** — the `HAUL_START` exit-apron alignment is unchanged — and only lost width off its left side to make room.

### 3. Launch prep (`LaunchPrepScene.tsx`)
- Mate → payload stack → fuel → power (modified by `launchPrepTechs` as above).
- Crane/drone layout close to stack; umbilicals connect to vehicle ports.

### 4. Launch sequence (`LaunchSequenceScene.tsx`)
- GO poll (possibly shortened/realigned from redesign) → hold key → liftoff (~3.2s).
- Liftoff → `completeUnitRun` → Data entry: lead time, redesign cost (if set), a **randomised height achieved** (`lib/flightMetrics.ts`'s `randomHeightAchievedMiles()`, 60–90 **miles** — this app uses miles throughout, never km/kilometers), and this launch's **defect count** (haul-road explosions since the last Run Process). Data board shows both as their own columns per launch, plus a **Total defects** summary stat per round (sum across that round's logged launches).
- **Download CSV** (`DataView.tsx` header, `lib/csvExport.ts`): one row per logged launch across both rounds (round label, rocket #, lead time as m:ss and ms, height achieved, redesign cost total + per-category breakdown, defects, ISO logged-at timestamp). Disabled until at least one launch is logged in either round. Plain browser Blob + temporary `<a download>` — no extra dependency.

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
