# CLAUDE.md — Orb-it Process Excellence Simulator

## Project Goal
Build a web-based interactive learning tool that teaches Lean Six Sigma concepts through short gameplay loops. The **primary learning measure is lead time** — end-to-end time from starting a unit through launch — and how process design changes improve it across rounds. **Total cost of improvement** (To-be redesign, broken down by source) is a secondary scored metric on the Data board.

Setting: Orb-it, a fictional satellite constellation company. Learners act as process engineers improving the satellite integration and launch preparation value stream.

Tone: Professional, precise, operational. Light narrative framing only. No cartoonish or overly playful language.

## Core Learning Loop (must be preserved)
1. **Execute** — Visualised, interactive process steps (not auto-play lists). Feel friction and waste as lead time.
2. **Data** — Lap-style board of lead times (and road cost when redesigned). Process mapping is **outside** this app (no Map tab). **No Comparison tab** — comparison of rounds happens on the Data board (e.g. As-is average vs To-be).
3. **Rounds** — As-is = baseline (3 launches); To-be = redesign then 3 launches; compare outcomes on Data.
4. **Redesign / Validate** — To-be workshop locks improvements into the process used for that round’s launches.

The learning loop above is reached **through** the Home intranet page (see
"Home & intranet pages" below) — it's no longer the thing a learner lands
on directly.

---

## Home & intranet pages (settled)

**Default landing screen (settled):** `#/home` (or an empty/`#` hash,
normalised to it) — an in-fiction Orb-it corporate intranet page, not the
simulator. `views/HomeView.tsx`. Three tiles, each navigating via
`onNavigateStage`:

| Tile | Destination | Behaviour |
|------|--------------|-----------|
| **Training and help** | `#/training` (`views/TrainingView.tsx`) | Loops `public/Orbit26 Teaser.mp4` (muted autoplay, no controls / pointer-events none so the loop cannot be paused), plus **Orb-it Employee Instructions** (stage-nav guide with live stage buttons, team photo `OrbitTeam.jpg`) and a "Jump into the interactive simulator" link (→ `as-is`). |
| **Annual Report** | `#/annual-report` (`views/AnnualReportView.tsx`) | Static in-fiction content: company overview, declining-net-revenue chart (inline SVG, FY21→FY25), three challenge call-outs (customer feedback / lead time / cost), call-to-arms → `gemba`. Full-bleed `public/OrbitBoost.jpg` backdrop with frosted glass content panes; Orb-it logos on white circular badges (masthead + footer). |
| **Create Invoices** | `#/invoices` (`views/CreateInvoicesView.tsx`) | A standalone **5S** teaching module — historic launches to bill, plus a cost-free redesign of the invoicing process itself. See "Invoice process" below. |

- All four (`HomeView`, `TrainingView`, `AnnualReportView`, `CreateInvoicesView`) follow the same **mount-only-while-active, no state to preserve** pattern as `GembaWalkthrough`/`CustomerPortalView`/`RegulationView` — not part of the persistent-`RoundSession` group. (`CreateInvoicesView` is the one exception with meaningful in-page progress — sent invoices and enabled 5S levers — that resets on hop-away; see below.)
- Each renders its own PMI banner (`SiteBrand`) + `StageNav` beneath it, same convention as every other page (see "Stage nav" below).
- `SiteBrand`'s top banner carries **Orb-it Intranet** (Home, orbital-blue), **Regulatory Hub** (Regulation, navy/green), and **Customer Portal** (magenta); `StageNav` beneath it is the ring-fenced **Simulation Navigator** — Gemba · As-is · Redesign · To-be only.
- Orb-it logo on Home (120×120 on white circular badge) and Annual Report (masthead + footer on white badges).
- **Home scenario strip** (`.home-scenario`, full width under stage nav): briefing that the rocket-launch process needs structured improvement under a limited budget and customer requirements.
- **Home banner schematic** + **marketing image** (`OrbLaunchPad.png`, `object-position: center top` so the top of the pad shot is never cropped).

---

## Invoice process (`views/CreateInvoicesView.tsx`) — 5S teaching module

Reached from Home's **Create Invoices** tile. Deliberately **outside** the
Gemba/As-is/Redesign/To-be learning loop — no `ProcessVersion`, no redesign
budget, no read from (or write to) the Data board's `LeadTimeEntry` log.
Where the main loop teaches waste elimination/lead time via the rocket
value stream, this module teaches **5S** (Sort, Set in Order, Shine,
Standardize, Sustain) via a small office/billing task — a deliberately
different Lean tool on a deliberately different kind of process, so the two
don't compete for the same lesson.

- **Barebones v1 (settled starting point, expected to grow):** static, in
  the sense that nothing here is scored or persisted — this is intentionally
  the current stopping point, not a limitation to work around.
- **Two sub-views**, `.view-nav`/`.view-nav__item` tabs reused as-is from the
  Simulation/Data convention: **Process** (default) and **Redesign**. Both
  live entirely in `CreateInvoicesView`'s own local state.
- **Historic launches (`data/historicLaunches.ts`, `HistoricLaunch[]`):** a
  small **static, fictional** dataset — deliberately not derived from either
  round's live `LeadTimeEntry` log, so the module always has something to
  bill even on a fresh session and never depends on (or feeds back into) the
  rocket launch process. Customer companies reuse the Customer Portal's cast
  (NimbusLink, Ironhold, Halcyon, Aegis Orbital Logistics, Lumen
  Constellation, Continental) for narrative consistency. Each record carries
  billing fields (customer, company, mission, launch date, reference, amount
  due) **plus** one deliberately irrelevant `internalNote` field — the 5S
  "Sort" pain point made concrete.
- **Process tab:** pick an unbilled launch → read its **launch-record slip**
  (same field labels as the form, order fixed by
  `SOURCE_SLIP_FIELD_ORDER` in `data/invoiceForm.ts`: mission → customer →
  company → date → reference → amount) → type the matching fields into a
  blank invoice form (nothing is pre-filled — the point is the manual
  transcription) → **Create invoice** (all fields non-empty + a positive
  amount via `parseAmountDueUsd`, which accepts `$186,400` or `186400`) →
  review screen (same slip field order + labels) → **Send invoice** marks
  it sent (`sentInvoices` map, `SentInvoice.sentAt`) and returns to the
  list, where that launch now shows an **✓ Invoiced** pill instead of the
  action button. `Invoices sent: n/N` tracks progress.
- **Field-order contract (settled):** one shared source order
  (`SOURCE_SLIP_FIELD_ORDER` === `SET_IN_ORDER_FIELD_ORDER`) drives the
  launch-record slip, the form when Set in Order is on, the review screen,
  and the Set in Order hover preview. As-is form uses
  `SCRAMBLED_FIELD_ORDER` (deliberately different) so the learner hunts.
  With all 5S levers on, form and slip match top-to-bottom.
- **Redesign tab — 5S levers (`data/invoiceLevers.ts`, `InvoiceLever[]`):**
  five toggleable cards (`InvoiceLeverId`: `sort` / `set-in-order` / `shine`
  / `standardize` / `sustain`), styled in the redesign workshop's tech-card
  shape but in green (`--color-brand-green`) rather than gold/orbital, to
  read as visually distinct from the cost-tracked rocket redesign. Each
  card carries a generated hero illustration (`Invoice5s*Icon.jpg`). An
  explicit **"No cost, no budget"** note heads the tab. Toggling is
  immediate/live — there is no lock-in ceremony here (unlike the rocket
  To-be workshop's Confirm step) since 5S is framed as continuous small
  improvement, not a single locked-in redesign event.
- **Hover impact preview (`InvoiceLeverImpactPreview.tsx`):** hovering or
  focusing a lever card (tap on touch) updates a sticky preview pane
  beside the grid. The pane is visual, not a text tooltip: a cinematic
  before/after illustration (`Invoice5s*Preview.jpg`) plus a miniature of
  the actual invoice UI showing As-is vs that single 5S applied. Isolated
  to the hovered lever — enabling still happens on click and is what the
  Process tab reads. Field-order/placeholder copy in the miniature is HTML
  (not baked into the PNGs) so labels stay exact.
  - **Sort** — hides each launch's `internalNote` from both the list and the
    record slip.
  - **Set in Order** — switches the invoice form from
    `SCRAMBLED_FIELD_ORDER` to `SOURCE_SLIP_FIELD_ORDER` so the form matches
    the launch-record slip (mission → customer → company → date →
    reference → amount).
  - **Shine** — a visually cleaner launch list (`.invoice-launch-list--shine`,
    more breathing room between records).
  - **Standardize** — fills each field's placeholder with an example value
    instead of leaving it blank with no format hint.
  - **Sustain** — turning it on enables Sort, Set in Order, Shine, and
    Standardize together (the discipline of keeping the full 5S system in
    place). Turning any of those four off also drops Sustain.
- **Out of scope for this pass** (candidates for the next iteration, not
  gaps to silently fill in): a scored As-is/To-be comparison of the invoicing
  *task* itself (the Redesign-tab hover preview is in), persistence across
  stage hops or reloads, and any numeric time/error scoring.

---

## Rounds model (settled)

Each round is a self-contained session: process config, lead-time board, chrome, completion scene.

### Goal per round
- Launch **3 rockets** (`ROCKETS_PER_ROUND` / `MAX_RUNS_PER_SESSION` = 3).
- Each full cycle → one **Data** entry (`LeadTimeEntry`: run number, lead time ms, optional `costBreakdown`, `heightAchievedMiles`, `defectCount`, completedAt).
- After the third launch → **orbit complete** scene (Earth + three satellites). No further Run Process.

### As-is
- **Routes:** preferred `#/as-is` (also `#/round/1`, `round1` for legacy tutor links).
- **Stage id:** `as-is` (`AppStage`). Labels everywhere: **As-is** (not "Round 1").
- **Config:** `ROUND_CONFIGS[1]` — baseline inefficient process; **no** redesign phase.
- **Complete:** “As-is complete” + lap times + Continue to To-be / share link / **View detailed results**.
- **Persist results:** when all 3 launches are logged, save **As-is average** + **per-rocket lead times** via `saveRound1LeadTimeResults` in `lib/roundMetrics.ts` (`localStorage` keys still `orbit26.round1.*` for backward compatibility).

### To-be — Redesign then execute
- **Routes:** preferred `#/to-be` (also `#/round/2`, `round2` for legacy).
- **Stage id:** `to-be`. Labels everywhere: **To-be** (not "Round 2").
- **Config:** `allowsRedesign: true`.
- **Flow:** `phase: redesign` → `RedesignWorkshop` → confirm (with **are-you-sure**) → `phase: play` (3 launches) → orbit complete.
- **Data comparison (settled):** load As-is average + per-rocket times on mount. Data tab shows **As-is average lead time** during To-be. When To-be's three launches complete, show full visual compare (`RoundLeadTimeCompare`): As-is vs To-be averages (difference faster/slower) **and** side-by-side bar chart for Rockets 1–3 of both rounds. Same visual on To-be **orbit complete** panel.
- **State isolation:** fresh `RoundSession` per `round.id`; redesign must **not** be wiped after lock-in (reset only on round id change). Lap logs do not carry across rounds; As-is **average + three launch times** carry via localStorage only.
- **Do not** delete To-be or merge it into As-is.

### To-be redesign workshop (`RedesignWorkshop.tsx`)
Tabs (all available before lock-in):

| Tab | Learner actions | Persisted on `ProcessVersion` (and often mirrored on the step) | Cost |
|-----|-----------------|----------------------------------------------------------------|------|
| **1 · Manufacture** | Drag stations for **line order**; **parkOffset** sliders; **auto-transfer** upgrade (open panel on hover/click — **panel stays open** so the enable button is clickable); **repair** the As-is's damaged Form press arm (hover/click the machine — same open-once, **stays-open-until-dismissed** panel pattern with an **×** button, `repairPanelOpen`) | `linePosition`, `parkOffset` on machines; `autoMoveBooster`; `damaged` (cleared to `false` on repair, `applyMachineDamaged` in `processEdit.ts`) | **10 pts** per machine ever moved from its factory slot · **40 pts** one-time for auto-transfer · **10 pts** one-time to repair the Form press arm (`FORM_PRESS_REPAIR_COST`) |
| **2 · Haul road** | Paint/erase tiles only (**no** Straight/Reset shortcuts). Endpoints & tree-cluster tiles fixed and free. | `haulPath` / `haulPathOverride` | The road as it stood when the session started is **free** (0 pts) — only tiles painted **beyond** it cost **10 pts** each; selling an existing tile credits **10 pts** back. The **only** category that can go back down. |
| **3 · Launch prep tech** | Invest in **as many of the four** techs as the budget allows (not mutually exclusive). Each card: full-width **hero icon** above the button (`public/UpgradeIconPump.jpg`, `UpdateIconPowerup.jpg`, `UpdateIconDrone.jpg`, `UpdateIconStrongback.jpg` — note pumps use **Upgrade** prefix), plus smaller on-card icon; **cost pill** with coin SVG (`RedesignTechCostBanner`) | `launchPrepTechs` | **20/25/50/20 pts** (faster-pumps / auto-power / payload-drone / strongback-redesign) — deselecting a tech does not refund a previously-tried one |
| **4 · Launch sequence** | **Realign** each GO; **info** criticality; **Weather**, **Capcom**, and **Range Safety** may be **deleted** (`LAUNCH_SEQ_REMOVABLE_STATION_IDS`); **Key lubrication** toggle; **compliance notice** beside the GO list: "The operation of this interface must comply with regulations." (points learners at `#/regulation`) | `launchSeqRealignIds`, `launchSeqRemovedIds`, `keyLubrication` | **10 pts** per GO ever realigned · **35 pts** per removable GO ever deleted (ratchet) · **15 pts** one-time for key lubrication |

- **Tab nav (settled):** the four tabs render as an icon-led stepper (`.redesign-stepper`, connector lines between numbered steps) rather than plain buttons — same visual language as the Gemba stepper below, via the shared `StepIcon.tsx` glyph component (one simple SVG per `ProcessStepKind`).
- **Manufacture tab machine cards:** large, prominent numbered badge circles (station order) on each card.
- **Damaged Form press arm (As-is only):** baseline `machines[].damaged = true` on `form-press`. In play, Activate has a `MACHINE_DAMAGED_FAILURE_CHANCE` (60%) chance of failing outright — the machine plays a full **approach → glow red ("Malfunction!") → retreat** animation (`MACHINE_FAIL_APPROACH_MS`/`MACHINE_FAIL_GLOW_MS`/`MACHINE_FAIL_RETREAT_MS` in `types/process.ts`, mirrored by `ManufactureScene`'s CSS travel-duration var and `GembaWalkthrough`'s own timer) and never completes; `RunState.pendingRetryMachineId` then guarantees the next Activate on that machine succeeds, but at `MACHINE_HALF_SPEED_MULTIPLIER`× (2×) its normal cycle time (`activeMachineHalfSpeed`). A red **DAMAGED** pill (`.factory-machine__damaged-pill`, `title` tooltip: "Every so often, this machine fails and need to be triggered again. It's a known issue, and it causes defects.") marks the machine whenever `damaged` is true. `startMachineWork`/`failMachineWork`/`finishMachineWork` in `lib/simulation.ts` own the state machine; both `SimulationView` and `GembaWalkthrough` run identical timers so the failed-attempt animation matches in every context. Repairable in To-be redesign (see the Manufacture tab row above) — repaired machines lose the pill and behave like any other station.

**Lock-in UX (settled):**
- Warning banner: finish all tabs before locking; layout is fixed for all three launches.
- Header actions (left → right): **Reset to the as-is** · **Save my current choices** · **Confirm layout & start launches**.
- **Reset to the as-is** (`handleResetToAsIs`): restores `getRoundConfig(1)` baseline (machines, road, techs, launch seq), clears all `ever*` cost ratchets and free-road baseline so budget returns to 0; does **not** confirm or start launches.
- **Confirm layout & start launches** opens **Are you sure?** (No = keep editing / Yes = lock in).
- Confirm stamps road path + `costBreakdown`, re-stamps launch-prep tech and launch-seq redesign so fields survive `applyHaulPath`.
- **Save my current choices**: downloads a plain-text snapshot of current choices + cost breakdown (does not lock in). Shared logic lives in `lib/redesignSummary.ts`'s `buildRedesignChoicesSummary(process, roundLabel, costBreakdown)` — both the workshop (live draft) and To-be **play** call it. **The same option is also offered during To-be play** (`SimulationView`'s `.sim-header__controls`, beside Start Session / Run Process) once a redesign has actually been confirmed for that round — gated purely on `process.costBreakdown` being set (never true for As-is, since it never goes through Confirm), so no separate round-id check is needed. `RoundSession.handleSaveChoices` supplies the handler.

**Total cost of improvement (`lib/redesignCost.ts`):** a prominent banner in the redesign header (visible on every tab, not just Haul road) shows the live running total + a per-category breakdown, and warns that only road tiles are reducible. Rendered as a **tabular, icon-led layout** (`.redesign-cost-table`, `RedesignWorkshop.tsx`'s `CoinStackIcon`/`BudgetGaugeIcon` + the shared `StepIcon.tsx` per category) rather than a plain horizontal strip, with the running total most visually prominent. Starts at **0**. When the total goes **negative** (sold road credits outweighing every other cost), the banner turns green (`.redesign-cost-banner--surplus`) and shows a "Surplus budget" note next to the total so learners understand a negative number is a good thing. Every category except road tiles is a **one-way ratchet within the redesign session** — tracked via `ever*` state in `RedesignWorkshop.tsx` (`everMovedMachineIds`, `everAutoTransferOn`, `everRepairedMachineIds`, `everSelectedTechIds`, `everRealignedGoIds`, `everRemovedGoIds`, `everKeyLubricationOn`) that only grows, even if the learner later toggles an investment off — so switching techs, moving a machine back, or re-damaging a repaired machine doesn't refund it. Road cost alone is derived live, **relative to the road as it stood at session start** (`roadGrid.ts`'s `roadCostFromTiles(tiles, baselineTiles)`) — that starting road is free, so cost begins at 0 pts; only tiles painted beyond it cost points, and selling an existing tile credits points back (can go negative), while erasing a self-added tile just cancels its own charge. Fixed as `ProcessVersion.costBreakdown` at Confirm; copied to each `LeadTimeEntry.costBreakdown` when a launch is logged. Data board shows a Redesign cost column plus a full breakdown panel (Manufacture, including Form press repair / Haul road / Launch prep / Launch sequence) alongside both rounds' lead times; CSV export (`lib/csvExport.ts`) includes a dedicated Form press repair column. Re-entering the workshop via the stage nav starts a fresh cost session from the carried-over draft (matches the existing reset-on-redesign-reentry behaviour), not a running total across every visit.

**Budget cap (`REDESIGN_BUDGET` = 100 pts, `lib/redesignCost.ts`):** once the running total would exceed the budget, that specific cost-increasing action is blocked — the control (drag-drop, tech card, Realign, Delete from sequence, an unpainted grass tile) is disabled and/or the click is a no-op with a `budgetError` message surfaced in the cost banner. Gating always compares the marginal cost of *that* action against `REDESIGN_BUDGET − costBreakdown.total`, so already-sunk choices (an `ever*`-tracked tech/realign/move) stay freely reversible even at zero budget. Selling road tiles is never blocked — it only frees up room. The cost banner shows a live "Budget remaining" figure and flips to a red exhausted state at 0.

### Gemba walk (`views/GembaWalkthrough.tsx`)

A 4th stage-nav tab, positioned **before** As-is — "go to the Gemba" (Lean:
observe the real process directly). Lets a tutor/learner open **any** of
As-is process steps directly, in any order, to inspect/demo it —
not a linear Run Process → Proceed playthrough.

- **Route:** `#/gemba`. `AppStage` includes `'gemba'`; `StageNav` lists it first.
- **Fully isolated:** reads `getRoundConfig(1).process` **read-only** (never
  calls an `apply*` mutator — there is no redesign here) and owns its own
  local `run: RunState`, seeded fresh per step via `freshStepRun(index)`
  (`lib/simulation.ts`'s `INITIAL_RUN_STATE` + `currentStepIndex`). It does
  **not** render inside a `RoundSession`, does **not** call
  `onLeadTimeLogChange`/`saveRound1LeadTimeResults`, and is mounted only
  while `stage === 'gemba'` (no state to preserve across hops) — so it can
  never affect As-is, the redesign workshop, To-be, or the Data tab.
- **Step nav:** one tab per `process.steps` entry, rendered as an icon-led
  stepper (`.gemba-stepper` — numbered circles, connector lines, `StepIcon.tsx`
  glyph per step kind) — same visual language as the Redesign workshop's own
  tab stepper (`.redesign-stepper`), which mirrors it back. Selecting a step
  — including re-selecting the current one — bumps a `visitNonce` used in
  each scene's React `key`, forcing a full remount so there's never stale
  seated/positioned state from a prior visit.
- **Banner** (`.gemba-banner`): Orb-it logo on a white circular badge beside
  the "Gemba walk" heading and lede, with the "Go to the Gemba" explainer
  folded into the banner body (`.gemba-banner__note`) rather than a separate
  warning strip above the stepper.
- **Reset step button** (`.gemba-step-toolbar`, next to the status line,
  Gemba-only — no equivalent in As-is/2 play or the redesign workshop):
  calls `selectStep(stepIndex)` with the *current* step, reusing the exact
  same reset-and-remount path as re-clicking that step's own nav tab. No new
  reset logic — this button just gives that existing behaviour a dedicated,
  discoverable affordance.
- **Reuses the real scene components** (`ManufactureScene`,
  `HaulRoadScene`, `LaunchPrepScene`, `LaunchSequenceScene`) and the
  real per-step transition functions (`startMachineWork`,
  `finishMachineWork`, `markOnPad`, `finishLaunchPrepAction`,
  `finishLaunchSequenceAction`) so interaction feels identical to real play.
  Two deliberate differences from `SimulationView`: no Proceed button is
  ever rendered (step nav replaces it), and haul's Mount-to-launch-pad
  handler is a no-op rather than `completeHaulStep` — that function
  auto-advances `currentStepIndex` into the next step, which would fight
  the step nav. The scene's own "seated" visual already shows arrival.
- **Context panel** (`components/GembaContextPanel.tsx`, copy in
  `data/gembaContext.ts`, Gemba-only): a vertical tab pinned to the right
  edge of the viewport, rendered beside `StageNav`. Expands into an
  `<aside>` with a title, an illustrative image (`public/AssemblyStep.png` /
  `PadStep.png` / `PrepStep.png` / `MissContStep.png`), and 2–3 lay-friendly
  paragraphs explaining *why* the current step exists in Lean/mission terms
  (e.g. what propellant is, why Guidance/Capcom/Propulsion/Avionics each get
  a GO call, a pointer at the Regulation page for the removable stations).
  Copy is keyed by step id (`getGembaContext`), falling back to a
  per-`ProcessStepKind` default so a future step reusing an existing kind
  still gets sensible copy. Auto-collapses on step change (`useEffect` on
  `stepId`) so it never lingers open showing stale context. Purely
  explanatory — no state here is read by or written to As-is, Redesign,
  To-be, or the Data tab.

### Customer Portal (`views/CustomerPortalView.tsx`)

A separate stage, deliberately **outside** the Gemba/As-is/Redesign/To-be
learning-loop group — a static, read-only "voice of customer" feed.

- **Route:** `#/customers`. `SiteBrand`'s top banner renders it as its own
  `top-bar__customer-btn` (magenta `--color-customer-accent`, built around
  brand-magenta/Pantone 227 — see below — and distinct from the orange
  Simulation Navigator accent), alongside Home and Regulation via
  `top-bar__nav`'s `margin-left: auto` — separate from the ring-fenced
  Gemba/As-is/Redesign/To-be group in `StageNav` below it.
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

### Regulation library (`views/RegulationView.tsx`)

A separate stage, deliberately **outside** the Gemba/As-is/Redesign/To-be
learning-loop group — a static, read-only fictional government regulation
site (National Space Launch Authority / NSLA).

- **Route:** `#/regulation`. `SiteBrand`'s top banner renders it as
  `top-bar__regulation-btn` (formal navy/green via `--color-regulation-accent*`,
  distinct from customer magenta and the orange Simulation Navigator accent),
  beside Home and Customer Portal — not in `StageNav`'s ring-fenced
  Gemba/As-is/Redesign/To-be group.
- **Fictional agency site:** light paper aesthetic inside the panel (serif
  headings, dense statute text, TOC side nav, tables, footnotes, footer).
  Parts 1–5 + definitions + fee schedule. **Part 4 — Pre-liftoff GO poll**
  is the narrative payload: required stations include Guidance, Capcom,
  Propulsion, and Avionics; **Weather** and **Range Safety** GO calls are
  buried as optional for Type-C licensed commercial launches (§ 432). Capcom
  is **not** optional. Default open section is Part 4.
- Mounted only while `stage === 'regulation'` — no state to preserve across hops.

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
- Filters out `launchSeqRemovedIds` (removable set: `go-range`, `go-weather`, `go-capcom` — `LAUNCH_SEQ_REMOVABLE_STATION_IDS`).
- Builds dynamic actions: remaining GOs → key-arm → liftoff (`keyIndex` / `liftoffIndex` from list length).
- **Realigned** GO rows use CSS that **overrides** stagger (use high enough specificity: `.mc-go-row.mc-go-row--realigned`).
- Non-realigned keep as-is wide gaps + misalignment.
- As-is: full six GOs, all misaligned; never strips stations or sets `heightStatus`.
- **Capcom removal consequence (To-be only):** if `go-capcom` is in `launchSeqRemovedIds`, `RoundSession` logs each launch with `heightStatus: 'no-capcom'` (no `heightAchievedMiles`). Data board + CSV show **NO CAPCOM** via `formatHeightAchieved` / `csvExport`. Safe removals (Weather + Range) keep normal randomised miles.

**Branding + rocket scale in this scene (`LaunchSequenceScene.tsx`, all four contexts it renders in — As-is play, To-be play, Gemba, and the redesign workshop's own preview below):**
- `.mc-pad-view__header` — a translucent bar across the top of `.mc-pad-view` (the window showing the rocket on the pad / lifting off), behind everything else that sits at the top of the window. Holds `.mc-pad-view__live-feed`: a red pulsing dot (`.mc-pad-view__live-feed-dot`, reuses the `mc-live-pulse` keyframe) + "LIVE FEED" text, right-aligned.
- `.mc-pad-view__brand` — Orb-it logo, **top-right** of `.mc-pad-view` (moved from top-left), `z-index` above `.mc-pad-view__header` so it floats in front of the translucent banner rather than being flush inside it. Not in `.mc-screen__label` (the "PAD 1 · LIVE" bar above the whole window) — specifically inside the viewport itself, per the original brief.
- `.mc-rocket__logo` — Orb-it decal on the booster hull (`.mc-rocket__body`), above the stripe — `0.95rem` (up from `0.62rem`) for visibility on the taller rocket.
- Rocket assembly (`.mc-pad-view__rocket`, `.mc-rocket__body/__nose/__fin/__exhaust`) — height **doubled** from the previous baseline (width unchanged, so the rocket reads taller/more slender): done via base height, not `transform: scale()`, because the liftoff `@keyframes mc-liftoff` sets its own `transform` per keyframe and would silently override (not compose with) a size-only transform once liftoff starts. `.mc-room`/`.mc-pad-view` min-heights bumped slightly (20rem/10rem) so the taller rocket has room without clipping.
- **Launch tower** (`.mc-pad-view__tower`) — height **halved**, width increased for the added detail below. Grey colour scheme throughout, with red accents "from time to time" rather than a uniform red scheme:
  - `.mc-pad-view__tower-rod` — lightning rod at the very top of the mast, with a small red-tipped ball.
  - `.mc-pad-view__tower-beacon` — a red aviation-obstruction light partway up the mast that blinks (reuses `mc-live-pulse`) — the "red from time to time" is literal here.
  - `.mc-pad-view__tower-pipe` — a cable-tray/conduit beside the mast, with a small red fitting clamp.
  - `.mc-pad-view__tower-tank` ×2 — small grey GSE (ground support equipment) tanks beside the tower base, one with a red band.
  - `.mc-pad-view__tower-base::after` — a thin red hazard stripe along the top edge of the base.
- **Night sky**: `.mc-pad-view__cloud` ×3, soft blurred ellipses inside `.mc-pad-view__sky`, alongside the existing stars.
- **Liftoff**: `@keyframes mc-liftoff` travels further (`-20rem` vs `-13.5rem`) and now fades fully to `opacity: 0` (was `0.12`) — reads as "soars high, then fades away" rather than settling at a dim residual. `.mc-pad-view__trail` (the vertical exhaust trail) travels further and also fades fully to `0` (was `0.08`) so it visibly disappears rather than lingering faintly.
- **Redesign workshop preview:** the launch-sequence tab (`RedesignWorkshop.tsx`) renders this same `LaunchSequenceScene` live, driven by a local `previewRun` (fresh `RunState` via `INITIAL_RUN_STATE` + the draft's actual launch-sequence step index) — same self-contained, nothing-logged pattern as `GembaWalkthrough`. `onActionComplete` calls `finishLaunchSequenceAction(draft, prev)` on that local state only. A `useEffect` keyed on `launchSeqRealignIds`/`launchSeqRemovedIds` resets and remounts it (`previewNonce` key) whenever the redesign changes underneath it, so it can never end up mid-sequence pointing at a GO station index that no longer exists after a realign/removal edit. (Toggling key lubrication does **not** trigger this reset — it only changes a timing constant read live from `process`, never a station index.)

**Key lubrication** (`process.keyLubrication` / step mirror; `resolveKeyLubrication` / `applyKeyLubrication` in `processEdit.ts`): a one-time, 15 pt toggle on the launch-sequence tab (own `.redesign-key-lube` card, reusing `.redesign-tech-card` styling — not part of the launch-prep tech's mutually-exclusive set, since it's an independent lever on a different step). In play, `LaunchSequenceScene.tsx` resolves it fresh each render and swaps the hold-to-turn-key duration from `KEY_HOLD_MS_BASELINE` (1400ms) to `KEY_HOLD_MS_LUBRICATED` (120ms) — "almost instantaneous" per the brief — and updates the key-bay hint text accordingly. Costed and gated exactly like the other one-time toggles (`everKeyLubricationOn` sticky tracking, `blockOverBudget`), and re-stamped defensively at Confirm alongside launch-prep tech and launch-seq redesign.

### Round architecture
| Piece | Role |
|--------|------|
| `App.tsx` | Hash router; owns `AppStage`; mounts **both** rounds' `RoundSession` permanently (visibility-toggled, never unmounted) so stage hops keep state; mounts/unmounts `GembaWalkthrough`/`CustomerPortalView`/`RegulationView`/`HomeView`/`TrainingView`/`AnnualReportView`/`CreateInvoicesView` on demand (no cross-stage state to keep); passes `activeStage`/`onNavigateStage` down to each page rather than rendering `StageNav` itself; normalises an empty hash to `#/home` |
| `types/round.ts`, `data/rounds.ts` | Round configs; `AppStage` + `hashForStage` / `stageFromHash` |
| `RoundSession.tsx` | redesign / play / orbit-complete for one round; accepts `hidden`, `requestedPhase`, `onPhaseChange`, `activeStage`, `onNavigateStage`; renders its own `StageNav` beneath its own banner in all three phase branches |
| `views/GembaWalkthrough.tsx` | Gemba walk — see below |
| `components/GembaContextPanel.tsx`, `data/gembaContext.ts` | Gemba-only "why this step exists" context panel — see the Gemba walk section above |
| `StageNav.tsx` | The **Simulation Navigator**: Gemba · As-is · Redesign · To-be, ring-fenced in its own orange-bordered, labeled box, plus (play phase only) the live Lead Time / Launches / Defects metric chips off to the side. Rendered by each page beneath its own `SiteBrand` banner, not once at the `App.tsx` level — see "Stage nav (settled)" below |
| `views/CustomerPortalView.tsx` | Customer Portal — see below |
| `views/RegulationView.tsx` | Regulation library (NSLA) — see above |
| `views/HomeView.tsx`, `views/TrainingView.tsx`, `views/AnnualReportView.tsx`, `views/CreateInvoicesView.tsx` | Home intranet page + its three destinations — see "Home & intranet pages" above |
| `data/historicLaunches.ts`, `data/invoiceLevers.ts`, `data/invoiceForm.ts`, `types/invoice.ts`, `InvoiceLeverImpactPreview.tsx` | Supporting data/types + hover impact preview for `CreateInvoicesView`'s 5S module — see "Invoice process" above (fully standalone; not part of the `RoundSession`/redesign-budget graph) |
| `RedesignWorkshop.tsx` | To-be pre-play redesign |
| `StepIcon.tsx` | Shared per-step-kind glyph — Gemba's stepper and the Redesign workshop's tab stepper both use it so they read as the same visual language |
| `processEdit.ts`, `roadGrid.ts` | Apply/resolve redesign fields |
| `lib/redesignCost.ts` | Point costs + `RedesignCostBreakdown` builder for the total cost of improvement |
| `lib/redesignSummary.ts` | `buildRedesignChoicesSummary()` — shared "Save my current choices" snapshot text, used by both the workshop and To-be play |
| `lib/saveFile.ts` | Builds/parses the save-state row appended to the Data tab's downloaded CSV — see "Save/Upload Session Data round-trip" above |
| `OrbitCompleteScene.tsx` | End-of-round cutaway |
| `SiteBrand.tsx` | Top banner: PMI brand lockup + site-wide Orb-it Intranet (Home) / Regulatory Hub (Regulation) / Customer Portal buttons (no run metrics — those moved to `StageNav`) |
| `lib/roundMetrics.ts` | As-is avg + per-launch times save/load; averages |
| `RoundLeadTimeCompare.tsx` | Visual As-is vs To-be averages + three-launch bar compare (Data + orbit complete) |
| Views | **Simulation** · **Data** only (**Comparison tab removed**) |

### Stage nav (settled)

Persistent Simulation Navigator (`StageNav.tsx`) lets a tutor/learner hop directly between **As-is**, **Redesign**, and **To-be** — independent of the as-is → redesign → launches linear flow. `SiteBrand.tsx` is the separate top banner (PMI logo + Orb-it Intranet/Regulatory Hub/Customer Portal buttons) that always renders above it — see "Site chrome & branding" below for how the two divide responsibilities, including the play-phase metric chips `StageNav` also carries.

- **Position: beneath the PMI brand banner, on every page.** Neither `SiteBrand` nor `StageNav` is rendered once at the `App.tsx` level — `App.tsx` only owns the `stage` state and passes `activeStage`/`onNavigateStage` down as props. Each page renders its own `<SiteBrand>` then `<StageNav>` pair: `RoundSession` renders both in all three of its phase branches (orbit-complete, redesign, and play), and `GembaWalkthrough` / `CustomerPortalView` / `RegulationView` / `HomeView` / `TrainingView` / `AnnualReportView` / `CreateInvoicesView` each render the same pair right after their own subtitle. This keeps the Simulation Navigator directly under the "PMI · Orb-it" banner everywhere, rather than above it.
- **Default route is `#/home`, not `#/round/1`.** An empty/`#` hash is normalised to `#/home` on mount (`App.tsx`) — the intranet Home page is the true landing screen; the round-based learning loop is reached through it (see "Home & intranet pages" above).
- **Routes:** `#/home` · `#/as-is` (legacy `#/round/1`) · `#/redesign` · `#/to-be` (legacy `#/round/2`) · `#/gemba` · `#/customers` · `#/regulation` · `#/training` · `#/annual-report` · `#/invoices` (`AppStage` in `types/round.ts`).
- **Both rounds stay mounted for the app's lifetime** (`App.tsx` renders both `RoundSession`s, hidden via inline `display: none` rather than unmounted) — hopping never loses in-progress state (process edits, run in flight, lead-time log).
- **To-be phase is nav-controlled** via `requestedPhase`/`onPhaseChange` props on `RoundSession`:
  - Clicking **Redesign** always jumps into the workshop (even mid-round or post-completion) — and **resets that round's play state** (session, run, lead-time log) so it plays out fresh under whatever design is confirmed next.
  - Clicking **To-be** only *advances* redesign → play; it never regresses an in-progress or completed round back to the workshop.
  - A **fresh deep link** (e.g. tutor share URL landing straight on `#/round/2`) is unaffected — the forcing only reacts to a `requestedPhase` *change after mount*, so first load still lands on the round's natural starting phase (redesign, since To-be `allowsRedesign`).
  - Internal auto-advances (Confirm redesign → play) report back via `onPhaseChange` so the nav's active tab stays correct even without a nav click.
- **As-is → To-be CTA** (`onNavigateRound2` on As-is `RoundSession`, used by the orbit-complete "Continue to To-be" button) navigates to the **Redesign** stage, not To-be play — preserves the original "share link lands on the workshop" flow.
- **Orbit-complete → Data tab (settled):** the orbit-complete summary is not a dead end — a **View detailed results** button (`onViewResults`, `RoundSession.handleViewResults`) sets `phase` back to `'play'` and `activeView` to `'data'`, landing on that same round's own Data tab with `ViewNav` restored. It never touches `leadTimeLog`, so a completed round's results are never lost by leaving the summary — only the (unrelated, still-intentional) Redesign re-entry reset clears them. Rendered for **both** rounds: alongside "Continue to To-be" (as a secondary `btn--ghost`) on As-is, and as the sole primary CTA on To-be, which previously had no button here at all.

---

## Site chrome & branding (settled)

- **Top banner** on play, redesign, and orbit-complete: **PMI logo** (left) · divider · **Orb-it** + subtitle/round label. Overall app branding is PMI — this banner stays PMI-only, never the Orb-it mark.
- Logo asset: `public/PMI Logo.svg` → URL `/PMI%20Logo.svg` via `SiteBrand` (`import.meta.env.BASE_URL`).
- **Orb-it (in-fiction) logo** — `public/OrbitLogo.png` → URL `/OrbitLogo.png`, same `import.meta.env.BASE_URL` pattern. This is the fictional company's own mark, used *inside* the exercise/simulation content (never the top banner): the booster's `.booster__logo` decal (`Booster.tsx` — appears in manufacture, haul, launch-prep, and the redesign workshop, since they all reuse this one component), a compact site mark on a solid white disc in the haul map's **upper-left corner** (`HaulRoadScene.tsx`), a **larger** one (60×60) centered on the Launch Pad in that same scene — drawn *before* the dashed pad-seated marker/"Launch Pad" text in SVG order so those stay legible on top — and a brand mark on the orbit-complete panel (`OrbitCompleteScene.tsx`). Add further Orb-it-branded touches to other process-step/simulation content freely — just keep the top banner PMI-only.
- The haul/pad scene (`HaulRoadScene.tsx`) didn't render inside the redesign workshop at all until it needed to for this same reason — its Haul road tab now also has a **live preview** (`.redesign-haul-preview`, right after the tile grid) of that scene, driven by a local `haulPreviewRun` against whatever path `pathFromRoadTiles(roadTiles)` currently resolves to (falling back to baseline `HAUL_PATH` if the painted tiles don't yet form a valid connected path). Keyed by the path's own coordinates so repainting the road forces a clean remount instead of leaving the preview booster stranded on a path that no longer exists. Same self-contained, nothing-logged pattern as the launch-sequence preview and `GembaWalkthrough` — `onMountToPad` is a no-op for the same reason `GembaWalkthrough`'s is (the real `completeHaulStep` auto-advances to the next process step, which isn't rendered here).
- **Top banner (`SiteBrand.tsx`, every page):** PMI logo/title lockup (left) plus the site-wide **Orb-it Intranet** (Home) / **Regulatory Hub** (Regulation) / **Customer Portal** buttons (right) — `top-bar__nav`, `margin-left: auto` so they hug the right edge. `SiteBrand` no longer carries any run metrics; it needs only `activeStage`/`onNavigate`, which every page already threads through.
- **Simulation Navigator (`StageNav.tsx`, every page):** the orange-bordered banner beneath the top banner. Ring-fences **Gemba · As-is · Redesign · To-be** (`.stage-nav__label` kicker + `.stage-nav__group`) as its own named menu, separate from the top banner's site-wide buttons. During a round's **play** phase only, `RoundSession` also passes `metrics`/`rocketsLaunched`/`rocketsGoal`/`defectCount` — rendered as icon-led `.stage-nav__metric` chips (clock / rocket / flame SVGs, `--color-nav-accent` themed to match the box) for **Lead Time**, **Launches x/3**, and **Defects**, right-aligned in the same banner. Omitted entirely outside play (redesign workshop, orbit-complete, Gemba, and every non-round page) — no empty placeholder chips.
- **Defects metric:** damaged-machine failures on manufacture (step 1), booster explosions on the haul road (step 2), and missed sweet spots on launch prep's extend-boom slider or swing-over-vehicle hold (step 3, `LaunchPrepScene`'s `onDefect`) — all three increment the same per-launch `defectCountRef` in `RoundSession`, folded into `LeadTimeEntry.defectCount` on completion. The Simulation Navigator's live Defects chip and the Data tab's "Total defects" both sum `defectCount` across a round's logged launches (`roundDefectTotal` in `RoundSession`), so the two numbers always agree by construction. The chip switches to an alert style (`.stage-nav__metric--alert`) once any are logged. `GembaWalkthrough` never wires `onDefect` (or the manufacture/haul equivalents) — Gemba misses stay purely visual, same as everywhere else in that walkthrough.
- **Start Session** and **Run Process** live in `SimulationView`'s own header (`.sim-header__controls`), beside the "Simulation" heading, rather than either banner — Start Session shows a clock icon, a `title` tooltip ("When you click this, the timer will begin."), and swaps its label to "Session Active" once clicked; Run Process shows a distinct right-arrow "go" icon so the two primary buttons don't read as visually interchangeable. **Save my current choices** (see the redesign workshop section above) renders in the same control group once a round's redesign has been confirmed.
- **Pause session** (`SimulationView.tsx`, `lib/simulation.ts`'s `pauseRun`/`resumeRun`/`isPaused`): once a session is active, a **Pause session** / **Resume session** toggle renders next to Start Session (bars icon while running, play-triangle icon while paused). Pausing stops the lead-time wall clock — `RunState.pausedAt`/`pausedMs` track the open pause and accumulated paused time, and `wallClockMs` excludes both — and locks every process-step scene: `ManufactureScene`/`LaunchPrepScene`/`LaunchSequenceScene` fold `!paused` into their single `canInteract` gate (which every control already checks), and `HaulRoadScene` folds it into `canMove` (blocking drag, arrow keys, and the toolbar) plus explicitly guards `handleMountToPad` and pointer/keyboard entry points, since arrow-key movement never round-trips through a parent callback. A dashed `.sim-paused-overlay` covers whichever scene is showing while paused; clicking it (or attempting a keyboard move in the haul scene) calls `onBlockedInteraction`, which surfaces a transient `.sim-pause-notice` reminding the operator to use the pause toggle — `RoundSession` owns that notice's text and auto-clear timer. `Run Process` is separately guarded (`canRun` requires `!paused`) since it lives in the header, outside any scene's own gating.
- Static site assets belong in **`public/`** (not `src/` unless import-bundled).
- **Brand colour palette:** official PMI Pantone palette lives as `--color-brand-*` CSS custom properties in `src/index.css` (see `docs/brand/brand-tokens.md`). The existing named accent tokens (`--color-orbital`/`--color-orbital-strong`, `--color-amber`, `--color-nav-accent`, `--color-text-dim`) now alias these brand tokens rather than carrying their own hex. `--color-customer-accent`/`--color-customer-accent-strong` are built around `--color-brand-magenta` (Pantone 227, `#B00060`) rather than purple — `-strong` is the true Pantone 227 (solid-fill/high-emphasis use, e.g. the active nav button), the base token is a lightened tint of it for legible text/icon use on the dark chrome. Stays scoped to the Customer Portal only, distinct from the shared accent set. `--color-regulation-accent*` (navy/green mix from brand tokens) is scoped to the Regulation nav button the same way. The near-black dark-chrome tokens (`--color-bg`/`--color-surface`/`--color-border*`) and hand-tuned illustrative shading in scene art are intentionally **not** forced onto the brand palette — they're UI neutrals/light-shadow tints, not brand-identity colours. New UI colour choices should use a `--color-brand-*` token (or an existing aliased accent token) rather than a fresh hardcoded hex.

---

## Execute phase — interaction model

Hands-on floor/field simulation. Prefer spatial scenes and direct manipulation.

### Principles (do not regress)
- Operator-driven work per step (click, drag, codes, keyboard, hold-to-fill, etc.).
- **As-is friction is intentional** in As-is; To-be redesign reduces it deliberately.
- **Step transitions:**
  - Default: `step_complete` → **Proceed**.
  - Haul: **Mount to launch pad** plays a strongback erector (~2.4s, booster ends nose-north / engines-south, `PAD_SEATED.rotation = 90`) then auto-advances (no Proceed).
  - Last step liftoff → `completeUnitRun` only (never on intermediate steps).
- Process lives on `RoundSession` state (from redesign or baseline clone).
- No auto-scrolling step lists as Execute UX.
- **Status bar prominence:** the shared `.sim-status` instruction bar (one CSS class, rendered in Gemba, As-is, and To-be alike) is bold and visually prominent by design — a style change here mirrors everywhere automatically.

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
- Used in **As-is, To-be, Gemba, and Redesign manufacture preview** (one component).
- **Floor art:** `public/AssemblyBG.jpg` as full-panel top-down background (`.manufacture-scene__floor-bg`); soft vignette + **opaque dark machine cards**, stronger belt/banner so UI stays legible over the photo.
- As-is layout: physical L→R **2 · 1 · 4 · 3**; operate **1 → 2 → 3 → 4**.
- **Machine bays** (`.station-bay`) are absolutely positioned at the same horizontal `%` as their belt stops (`linePosPercent` from `linePosition`), so each card sits above the production-line slot it serves while still parking at its own `parkOffset` distance from the belt.
- **Sequence badges** (`.factory-machine__badge`, ~4.5rem circles): parked on the **lower-left corner** of each machine card (`left: 0; bottom: 0; transform: translate(-38%, 42%)`) — bold, mostly outside the chrome so they do not cover art/name/code, and low enough that `.manufacture-scene` `overflow: hidden` does not clip them at the top of the pane.
- Drag booster to next stop **unless** `autoMoveBooster` (then auto to next after each machine; starts at station 1). Booster spawns at `ENTRANCE_LEFT_PCT` (**16%**) so the long bare-booster sprite sits fully on the belt rather than under the access-code monitor or clipped by `overflow: hidden`. A glowing dotted guide line (`.manufacture-drag-guide-wrap`, `GUIDE_LINE_*` constants) points from the feedback text up to the booster.
- **Assembly booster** (`Booster` with `showNose={false}`): HD transparent sprite `public/AssemblyBooster.png` — white horizontal bare booster, payload-mount face left, multi-engine cluster right, no fairing/payload. Used on the production line, **haul crawler (step 2)**, redesign preview, **and launch-prep** (same sprite; pad CSS rotates it 90° so engines sit down — see step 3). Display height on the belt is tuned (~`4.49rem` / max-width ~`19.7rem` after successive scale adjustments). Haul keeps `BOOSTER_LENGTH`/`BOOSTER_WIDTH` for collision while the sprite scales relative to the crawler box (`.booster--haul-sprite`, height ~131% of the collision box).
- Access codes + terminal; **Activate** only when code + arrival match. The **STATION ACCESS CODE** readout is a compact floating square **HD flat-screen** (`.manufacture-terminal`, asset `public/AccessCodeMonitor.png`) parked on the **clear mid-left** of the floor above the belt entrance — deliberately **not** a full-width banner. The PNG supplies brushed-metal bezel, **Orb-it logo** on the top chrome, empty glass, and a glowing cyan **power-on** LED; live station name + access code are HTML overlays in `.manufacture-terminal__content` (monospace amber/glow; access-code chip uses a **thick yellow border** so digits stand out). Always rendered (even idle, showing "Standby"); on narrow viewports the monitor drops into normal flow below the belt.
- Codes: `4821`, `7390`, `1564`, `9057`.
- **Movement waste, made to matter (`types/process.ts`, `data/baselineProcess.ts`, `ManufactureScene.tsx`):** distance from a parked machine to the belt is a deliberate Lean teaching lever, so it now costs real time, not just pixels. `MACHINE_APPROACH_MS`/`MACHINE_RETREAT_MS` are both 975ms (30% slower than the original 750ms baseline — CSS's shared `--machine-travel-ms` transition duration covers both, so keeping them equal avoids a visual/logical desync between the two directions). As-is's baseline `parkOffset` values are much further from the belt than before (`form-press` 2.6, `seam-welder` 4.4, `trim-laser` 2.05, `fit-arm` 3.65 rem, up from 1.1/2.9/0.55/2.15) — To-be's redesign sliders (Manufacture tab, range now `0.4`–`4.6`rem) let learners pull them back in, directly demonstrating the waste-reduction lesson. `ManufactureScene.tsx`'s `LINE_APPROACH_Y_REM` (the shared baseline gap every machine travels on top of its own parkOffset) is raised from 5.25rem to 7.75rem, matched by the same +2.5rem gap added between `.station-row` and the belt in `.manufacture-floor` — both move together so the "at-line" transform still lands correctly on the belt.
- Activate → approach → work → retreat.
- **Damaged Form press arm (As-is):** see the redesign workshop's Manufacture tab section above for the failure/retry/repair mechanic — this scene plays the failed-attempt and half-speed-retry animations, and renders the **DAMAGED** pill.
- Finish → Proceed.

### 2. Haul road (`HaulRoadScene.tsx`, `pathGeometry.ts`)
- Path from `resolveHaulPath(process)` (`haulPathOverride` / step `haulPath` / default winding `HAUL_PATH`). Remount scene when path changes.
- **Ground textures:** `public/HaulGrassField.jpg` is a single full-map grassland plate (gentle mounds, mixed turf) under every haul instance — not a repeating tile. The haul path is a **taxiway/runway**: `HaulRunwayTile.jpg` is stamped along each path segment so yellow/white technical marks travel with the road (including user-painted To-be paths); 90° vertices use `HaulRunwayCorner.jpg`. Launch pad deck is `HaulPadDeck.jpg` under the existing yellow/white target and 60×60 Orb-it logo. The non-interactive right strip is `HaulCoastStrip.jpg` (beach → water), not the old SVG sand/sea doodle. The six-tree cluster uses keyed upright live-oak sprites `HaulTreeA/B/C.png` (no lean, no extra rotation; same art on the redesign grid's locked tree cells). Rebuild runway/coast/trees with `scripts/process_haul_overhaul.py`.
- **Campus chrome (visual only):** high-angle aerial `HaulOfficesTop.png` / `HaulAssemblyTop.png` are drawn ~2× the previous box and shifted north/west so south doors still meet the `HAUL_START` apron — `HAUL_PATH`, road tiles, and safe zones are unchanged. Compact **Offices** / **Assembly** labels sit on the roofs (Offices shifted left so the full word stays on-canvas). The site Orb-it mark is a small white-disc badge in the **upper-left corner** of the map (not on the hangar roof). Keying helper: `scripts/key_buildings.py`.
- Arrow keys primary (or click-and-drag); safe zones: road+margin, assembly, pad; pure grass → explode → reset.
- **Crawler platform** (`.haul-crawler`): a black, multi-wheeled transporter rendered beneath the booster. The booster uses the same bare HD sprite as manufacture (`showNose={false}` → `AssemblyBooster.png`; multi-nozzle art is baked into the PNG). Collision box stays `BOOSTER_LENGTH` × `BOOSTER_WIDTH`; visual sprite scales via `.booster--haul-sprite`. A single **Rotate Crawler** button (`.haul-orient__rotate-btn`) rotates 90° per click (no four-way orientation buttons).
- **"Rapid Unplanned Disassembly" counter** (`.haul-rud-counter`, floating top-right of the map, with a glowing warm-toned flame SVG icon): counts explosions (`rudCount`) for the **current turn at this step only** — resets alongside `pose` whenever the scene (re)mounts, same epoch as everything else. Present in every context this scene renders (As-is, To-be, Redesign preview, Gemba — though Gemba explosions are purely visual/unlogged for defects, the RUD counter still ticks locally).
- **Each explosion is a logged defect.** `onExplode` fires once the reset animation finishes (renamed from the never-wired `onPathReset`) → threaded through `SimulationView`'s `onHaulExplode` → `RoundSession`'s `defectCountRef`, which accumulates for the current launch attempt and resets to 0 in `handleRunProcess` (new Run Process) and every other run/log reset point. Same `RoundSession` component plays both rounds, so this works identically on As-is and To-be with no extra wiring. The Gemba walkthrough never passes `onExplode`, so exploding there is purely visual and logs nothing (only the local RUD counter moves).
- Mount to pad → **strongback erector** (`HaulErectorArm.png` / `HaulErectorBase.png`) slides the booster onto a south-pad hinge, then swings it 90° so the payload-mount faces north (engines south — `PAD_SEATED.rotation = 90`). Animation (~2.4s + hold) finishes before `onMountToPad` auto-advances. As-is snap-rotate of −90 (engines up) is gone.
- **Launch pad markings:** a solid yellow ring behind a solid white disc sits directly behind the Orb-it logo on the pad (helipad-target look) so the logo reads clearly against the pad's dark/blue fill.
- **Launch tower:** a fixed, flat-shaded (rudimentary-3D) lattice mast beside the pad on the sea side — foundation block with front/top/side faces, shadowed mast rails, alternating cross-braces, an umbilical arm reaching back toward the pad, a lightning rod, and a blinking red obstruction beacon (`.haul-launch-tower__beacon`, reuses the `mc-live-pulse`-style keyframe). Purely decorative/non-interactive, positioned relative to the pad-seated marker so it lines up consistently.
- **Coastline (decorative, non-interactive):** the rightmost strip (`SAND_X`≈746 through `SCENE_WIDTH`=800) is a single aerial `HaulCoastStrip.jpg` (beach → foam → water). Drawn after the grass plate and before the vignette / road. Purely visual — does not extend `SCENE_WIDTH`/`ROAD_COLS` or otherwise touch gameplay geometry.
- **No-fly zone (decorative, non-interactive):** a dashed red placard rect + four small drone-prohibition markers drawn around `LAUNCH_PAD` (`NO_FLY_MARGIN` = 30, corner markers inset so they stay on-canvas) plus a "NO FLY ZONE" label below the pad. Rendered as its own `<g>` after the pad group so it sits on top; no handlers attached, so it is never interactive (same convention as the tree cluster / building groups).
- **Offices annex / Assembly buildings:** high-angle aerial sprites `public/HaulOfficesTop.png` and `public/HaulAssemblyTop.png` (doors/aprons toward the south for the dirt service track) — not isometric cutaways. SVG `<image>` uses `href` + `xlinkHref` and `preserveAspectRatio="xMidYMax meet"` so the south door stays on the apron. Placement constants are visual-only and keep south doors near the `HAUL_START` apron; road/safe-zone/`HAUL_PATH` logic is unchanged. Settled boxes: Offices `{ x: -6, y: 96, width: 108, height: 132 }`, Assembly `{ x: 52, y: 16, width: 168, height: 228 }`. Roof labels stay compact (`Offices` at x=28, 10px; `Assembly` at building.y+28, 11px). Site Orb-it badge is a 36×36 mark on a white disc at map top-left `(26, 26)` — not on the Assembly roof. Do not re-double these after the last chrome pass.
- **Ambient life (decorative, non-interactive):** a `.haul-npc-traffic` vehicle and a `.haul-npc-people` trio of pedestrians animate near the Offices/Assembly annex. A curved dirt service track (`.haul-npc-dirt-road`) runs from the Offices door, across the yard, into the Assembly door (not gameplay road). Pedestrians periodically walk into/out of those doorways (CSS keyframes `haul-npc-enter-offices` / `haul-npc-enter-offices-b` / `haul-npc-enter-assembly`; drawn *under* the building sprites so they vanish when “inside”). Vehicle shuttles along the horizontal yard stretch. Layer order: dirt → people → buildings → vehicle. All ambient groups are `aria-hidden` and never read by `isBoosterSafe`/`isPointSafe` — purely a "the site is alive" background detail in every context this scene renders (As-is, To-be, Redesign preview, Gemba).

### 3. Launch prep (`LaunchPrepScene.tsx`)
- Mate → payload stack → fuel → power (modified by `launchPrepTechs` as above). Applies identically in As-is play, To-be play, and Gemba (same scene component).
- **Night sky (settled):** `.launch-prep-pad__sky` is a full-bleed plate (`public/LaunchPrepNightSky.jpg`, `object-fit: cover` / `object-position: center top`) plus a decorative `.launch-prep-pad__sky-fx` overlay — 8 CSS-only twinkle dots, 3 `LaunchPrepStarSparkle.png` pulses, and three drifting cirrus sprites (`LaunchPrepCloudA/B/C.png`, `launch-prep-sky-drift`). Sky has **no z-index** so tower (2), booster (3), and crane (4) stay in front. A ground `::after` vignette joins the plate to the pad deck. No React state, timers, or RAF. Detail: `docs/assets-launch-prep-overhaul.md`.
- **Booster art (settled):** `Booster` with `showNose={false}` uses `AssemblyBooster.png` (same as manufacture/haul). Fairing/payload is a separate `.lp-payload` overlay after stack — not the CSS nosecone path. `.booster--launch-prep` keeps a vertical footprint (~2.6×9.5 rem desktop); `.booster__sprite` uses `rotate(90deg)` so engines are down and the payload-mount face is up. Do not reintroduce CSS-shape nose/body/band rules for this class.
- **Launch tower art (settled):** CSS lattice/clamps replaced by transparent PNG sprites — `public/LaunchPrepTowerMast.png`, `LaunchPrepStrongback.png`, `LaunchPrepTowerBase.png` (`<img>` children under `.lp-tower__mast` / `__strongback` / `__base`). Strongback still animates mate via `--mate` rotate (`transform-origin: left center`); mast and base stay fixed. Mission-control tower in `LaunchSequenceScene` is **unchanged** (different view). Detail: `docs/assets-launch-prep-tower.md`.
- **Crane / fairing / drone art (settled):** CSS-box crane, CSS-shape fairing, and CSS-rotor drone replaced by transparent PNG sprites inside the existing wrappers — `LaunchPrepCraneBase.png` / `Cab` / `Boom` / `Jib` / `Hook`, `LaunchPrepFairing.png`, `LaunchPrepDrone.png`. Phase classes `.lp-crane--phase-0` … `--phase-4` are unchanged. Boom transform is `translateX(-50%) rotate(...)` on every phase so the lattice stays centered on the old pivot; jib `object-position: left center` so a short phase-0 jib keeps its collar on the boom. Hook + hook-load stay at the **jib tip**, not the cable end. The cable is still a 2px CSS line. To-be `payload-drone` is one click (`handleDroneDeploy`) + the drone sprite; rotors live in the PNG. Detail: `docs/assets-launch-prep-overhaul.md`.
- **Fuel farm (settled):** CSS tank shapes replaced by `public/LaunchPrepTankLox.png` and `LaunchPrepTankRp1.png`. Tanks sit **side by side** on the pad apron (LOX left, RP-1 right), scaled for readability (desktop ~4.03×4.81 rem after a −35% trim from the large farm size). Farm group `.lp-umbilicals` is anchored left of the mated booster (`left: ~13.7%`, right edge at the hull ~42%) so the farm sits closer to the pad. Crisp **LOX** / **RP-1** labels are HTML over each sprite’s blank nameplate (not baked into the PNG). Each hose (`.lp-umbilical--lox` / `--rp`) originates at that tank’s right-side valve stub; both runs use the **same −4° tilt** (parallel tracks — LOX higher, RP-1 lower). When connected, each hose is pinned `left` at the valve and `right` at the vehicle port so it always spans to the booster hull (not a fixed width that can miss). **Fuel flow (settled):** each hose contains a `.lp-umbilical__flow` overlay. While that line is filling, CSS chevrons (`lp-umbilical-flow`) plus a traveling highlight slug (`lp-umbilical-slug`) move **tank → vehicle**. The old `lp-umbilical-pulse-lox/rp` opacity pulse is gone. `LaunchPrepFuelSlugLox.png` / `LaunchPrepFuelSlugRp.png` exist in `public/` but are unused — flow is CSS-only. Full state stops motion and leaves a charged pipe.
- **Power bus lights (settled):** four small glowing beacons (`.lp-power-lights` / `.lp-power-light`) centered on the booster hull. As-is / Gemba sequential switches arm one light per bus via `powerArmed.length`. To-be **auto-power** master **ON** lights all four at once. Fully powered / completed step keeps all four lit (and syncs `powerArmed` when `power-up` is already in `completedMachineIds`). Ambient `.lp-power-glow` still appears when the step is powered.
- Crane/drone layout close to stack; umbilicals connect to vehicle ports as above.
- **As-is crane complexity (baseline, non-drone path only — `payloadDrone` To-be UI is untouched):** the 4-step "Stack payload with crane" sub-task deliberately mixes interaction types rather than four uniform buttons:
  - **1 · Extend boom** — a small vertical drag slider (`.lp-extend-track`, custom pointer-driven, not a native `<input type="range">`) with a highlighted sweet-spot band (`EXTEND_SWEET_MIN`/`MAX`, 60–78%). Releasing inside the band advances the step (reuses the existing `handleCraneStep(0)` — no separate advance path); releasing outside shows a "Missed the sweet spot — try again." message and resets to 0.
  - **2 · Lift payload** — unchanged simple button click.
  - **3 · Swing over vehicle** — press-and-hold (`startSwingHold`/`stopSwingHold`, mirrors the existing LOX/RP-1 hold-to-fill RAF pattern) with a fill bar and its own sweet-spot band (`SWING_SWEET_MIN`/`MAX`, 55–72%). While holding, a live `swingPhase` ('early' / 'sweet' / 'late') drives a visually unmistakable "let go now" cue — the button and bar turn bright green and pulse, with the button label switching to "Release now!" — and a "Too late — release!" red cue once held past the window, so the operator is never guessing how long to hold. Releasing inside the band advances via the existing `handleCraneStep(2)`; releasing outside shows "Released outside the window — try again." and resets the bar to 0%.
  - **4 · Lower & attach** — unchanged simple button click.
  - Both new mechanics deliberately reuse `handleCraneStep` for success so the crane's visual phase (`craneVisual`, `.lp-crane--phase-0..4`) and completion logic never diverge from the plain-click steps.

### 4. Launch sequence (`LaunchSequenceScene.tsx`)
- GO poll (possibly shortened/realigned from redesign) → hold key → liftoff (~3.2s).
- **Telemetry readout during liftoff:** the mission-control TELEMETRY panel's numbers change live off the liftoff cutaway's own elapsed time (`telemetryMs`, RAF-driven, capped at `LIFTOFF_MS`) rather than showing static placeholder text — a running `T+ss.t` clock, velocity (m/s), altitude (m), fuel %, and a MAX-Q countdown all ramp with `liftoffFraction` (`telemetryMs / LIFTOFF_MS`) and freeze once launched. Resets to idle (`T−HOLD`) with the same epoch effect as the rest of this scene's local state.
- Liftoff → `completeUnitRun` → Data entry: lead time, redesign cost (if set), a **randomised height achieved** (`lib/flightMetrics.ts`'s `randomHeightAchievedMiles()`, 60–90 **miles** — this app uses miles throughout, never km/kilometers) **unless** Capcom was removed in To-be redesign (`heightStatus: 'no-capcom'` → Data/CSV show **NO CAPCOM**), and this launch's **defect count** (haul-road explosions since the last Run Process). Data board shows both as their own columns per launch, plus a **Total defects** summary stat per round (sum across that round's logged launches).
- **Save Session Data** (`DataView.tsx` header, `lib/csvExport.ts`): one row per logged launch across both rounds (round label, rocket #, lead time as m:ss and ms, height achieved, redesign cost total + per-category breakdown, defects, ISO logged-at timestamp). Disabled until at least one launch is logged in either round. Plain browser Blob + temporary `<a download>` — no extra dependency. Icon: downward arrow into a tray (`SaveIcon`, `DataView.tsx`); `title` tooltip explains it also doubles as a save file.
- **Save/Upload Session Data round-trip (`lib/saveFile.ts`):** the file downloaded by Save Session Data doubles as a save file. `buildSaveFileText` appends one machine-readable row after the human-readable CSV rows — a fixed `ORBIT26_SAVE_STATE_V1` marker cell followed by a JSON cell (`SaveFileV1`: version, exportedAt, and each round's full `process` **and** `leadTimeLog`, not just the display-only CSV columns) — so a spreadsheet just sees one extra long row while the app can find and parse it back out. **Upload Session Data**, next to Save Session Data (upward-arrow-out-of-tray `UploadIcon`, mirroring `SaveIcon`; `title` tooltip explains the restore), reads a chosen file via `FileReader`, calls `parseSaveFileText` (returns `null` for anything that isn't a version-1 Orb-it save — wrong marker, corrupted JSON, wrong shape — surfaced as a red inline error, never a crash), and on success restores **both** rounds regardless of which round's Data tab the file was uploaded from. Restoring is only possible because `App.tsx` holds an imperative ref (`RoundSessionHandle.restoreState`, `useImperativeHandle` in `RoundSession.tsx`) to **each** `RoundSession` — the only place that can reach both at once, since each Data tab only owns its own round's live state. `restoreState` replaces `process`/`leadTimeLog`, resets the in-flight `run`/session-active/pause state, and **derives** (rather than stores) the round's phase: a full lead-time log means orbit-complete; otherwise a redesign-capable round with no `costBreakdown` yet is still at the workshop, same rule Confirm itself uses to advance to play. Restoring As-is to a complete log also re-runs `saveRound1LeadTimeResults` so To-be's localStorage-backed comparison stays correct. `RoundLeadTimeSection` (`DataView.tsx`) carries each round's live `process` alongside its entries so a save built from either round's Data tab always contains both rounds' full redesign choices, not just whichever round is currently showing.

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
- Progressive improvement levers mainly via To-be redesign.
- Client-side hash routes for deep links.
- Dark professional chrome; operational language.

## Technical Preferences
- TypeScript + React (Vite). Dev: `npm run dev -- --host 127.0.0.1 --port 5173`.
- Key modules: `baselineProcess.ts`, `rounds.ts`, `round.ts`, `RoundSession.tsx`, `RedesignWorkshop.tsx`, `SiteBrand.tsx`, `StepIcon.tsx`, `processEdit.ts`, `roadGrid.ts`, `simulation.ts`, `pathGeometry.ts`, `lib/redesignCost.ts`, `lib/redesignSummary.ts`, `lib/saveFile.ts`, `lib/fileDownload.ts`, scene components, `Booster.tsx`, `SimulationView` / `DataView` / `OrbitCompleteScene`, invoice module (`CreateInvoicesView`, `InvoiceLeverImpactPreview`, `historicLaunches`, `invoiceLevers`, `invoiceForm`).
- Repository map (tree + “where to change what”): **`docs/project-structure.md`**. Brand tokens: **`docs/brand/brand-tokens.md`**. Static asset inventory: **`docs/assets.md`**.
- Assets: **`public/`** for logos, photos, video, scene sprites, and static SVGs. Key recent sprites: `AccessCodeMonitor.png` (manufacture access-code TV), `AssemblyBooster.png` (bare booster on line + haul), `HaulOfficesTop.png` / `HaulAssemblyTop.png` (high-angle aerial buildings), haul field `HaulGrassField.jpg` / `HaulRunwayTile.jpg` / `HaulCoastStrip.jpg` / `HaulPadDeck.jpg` / `HaulTreeA-C.png` / `HaulErector*.png`, launch-prep tower/tank sprites `LaunchPrepTower*.png` / `LaunchPrepTankLox.png` / `LaunchPrepTankRp1.png`, launch-prep overhaul `LaunchPrepNightSky.jpg` / `LaunchPrepCloud*.png` / `LaunchPrepCrane*.png` / `LaunchPrepFairing.png` / `LaunchPrepDrone.png`. Also `OrbitLogo.png`, `AssemblyBG.jpg`, `Orbit26 Teaser.mp4`, Gemba step images `AssemblyStep.png` / `PadStep.png` / `PrepStep.png` / `MissContStep.png`, launch-prep `UpdateIcon*` / `UpgradeIconPump.jpg`. Full list in `docs/assets.md`.
- No heavy game engines.
- On Windows PowerShell, prefer `npm.cmd` if `npm.ps1` is blocked by execution policy.

## Out of Scope for v1
- Full DMAIC / stats suite / multiplayer
- Full instructor authoring (tutor **share links** in scope)
- Mobile-first / in-app process map / waste-tagging UI
- Comparison tab (removed; use Data board for As-is vs To-be averages)
- Cross-round cloud persistence (localStorage As-is average → To-be Data is in scope)
- Unmuted / user-controlled training video (teaser is muted autoplay loop by design)
- Invoice process: scored As-is/To-be comparison of the invoicing task, cross-session persistence, and numeric time/error scoring (Redesign hover preview + Process field-order alignment are in; see "Invoice process" above)

## Working Style
- Small incremental working steps; keep app runnable.
- Clear names; comments only when intent is unclear.

## Git Practices
- Local Git active; meaningful commits; clean working tree.
- Remote: `origin` → `https://github.com/apollo-n23/Orbit26.git` (branch `main`).
- Prefer push only when the user asks. Push to `main` deploys production on Vercel → **https://orbit26-one.vercel.app**.
