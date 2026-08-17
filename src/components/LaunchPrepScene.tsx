import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Booster } from './Booster'
import type { LaunchPrepTech, ProcessVersion, RunState } from '../types/process'
import { LAUNCH_PREP_ACTIONS } from '../types/process'
import {
  isLaunchPrepTech,
  resolveLaunchPrepTechs,
} from '../lib/processEdit'

interface LaunchPrepSceneProps {
  run: RunState
  onActionComplete: () => void
  /**
   * To-be technology investments (any number — not mutually exclusive).
   * Prefer `process` when available so techs are re-resolved on each run start.
   */
  techs?: LaunchPrepTech[] | null
  /** Full process version — used to re-read launchPrepTechs when the step starts. */
  process?: ProcessVersion | null
  /** Session timer paused — locks every sub-task control until resumed. */
  paused?: boolean
  /** Missed the sweet spot on the extend-boom slider or the swing-over-vehicle hold — a logged defect. */
  onDefect?: () => void
}

const CRANE_STEPS = [
  { id: 'extend', label: '1 · Extend boom' },
  { id: 'lift', label: '2 · Lift payload' },
  { id: 'swing', label: '3 · Swing over vehicle' },
  { id: 'lower', label: '4 · Lower & attach' },
] as const

const POWER_ASSET = (file: string) => `${import.meta.env.BASE_URL}${file}?v=1`

const POWER_SWITCHES = [
  {
    id: 'avionics',
    label: 'Avionics bus',
    short: 'AVIONICS',
    icon: POWER_ASSET('LaunchPrepPowerIconAvionics.png'),
  },
  {
    id: 'flight',
    label: 'Flight computers',
    short: 'FLIGHT COMP',
    icon: POWER_ASSET('LaunchPrepPowerIconFlight.png'),
  },
  {
    id: 'telemetry',
    label: 'Telemetry',
    short: 'TELEMETRY',
    icon: POWER_ASSET('LaunchPrepPowerIconTelemetry.png'),
  },
  {
    id: 'range',
    label: 'Range safety arm',
    short: 'RANGE SAFETY',
    icon: POWER_ASSET('LaunchPrepPowerIconRange.png'),
  },
] as const

const POWER_COVER_SRC = POWER_ASSET('LaunchPrepPowerCover.png')
const POWER_TOGGLE_OFF_SRC = POWER_ASSET('LaunchPrepPowerToggleOff.png')
const POWER_TOGGLE_ON_SRC = POWER_ASSET('LaunchPrepPowerToggleOn.png')
const POWER_TERMINAL_SRC = POWER_ASSET('LaunchPrepPowerTerminal.png')

/** Baseline bus charge after the switch is thrown (~1.4s). */
const POWER_FILL_RATE_PER_MS = 0.072
/** Auto-power master ON — all four buses charge together, much faster. */
const POWER_FILL_RATE_AUTO_PER_MS = 0.42

/** Index of the power-up sub-task in LAUNCH_PREP_ACTIONS (mate/crane/fuel/power). */
const POWER_ACTION_INDEX = 3

const FILL_RATE_PER_MS = 0.045 // % per ms while holding (~2.2s to fill)
/** Faster fuel pumps upgrade — near-instant fill while holding. */
const FAST_FILL_RATE_PER_MS = 1.8

/** Extend-boom slider: release must land inside this band (0–100 scale). */
const EXTEND_SWEET_MIN = 60
const EXTEND_SWEET_MAX = 78
/** Swing-over-vehicle hold: release must land inside this band (0–100 scale). */
const SWING_SWEET_MIN = 55
const SWING_SWEET_MAX = 72
const SWING_FILL_RATE_PER_MS = 0.05 // % per ms while holding

const TOWER_MAST_SRC = `${import.meta.env.BASE_URL}LaunchPrepTowerMast.png?v=2`
const TOWER_STRONGBACK_SRC = `${import.meta.env.BASE_URL}LaunchPrepStrongback.png?v=2`
const TOWER_BASE_SRC = `${import.meta.env.BASE_URL}LaunchPrepTowerBase.png?v=1`
const TANK_LOX_SRC = `${import.meta.env.BASE_URL}LaunchPrepTankLox.png?v=1`
const TANK_RP1_SRC = `${import.meta.env.BASE_URL}LaunchPrepTankRp1.png?v=1`
const NIGHT_SKY_SRC = `${import.meta.env.BASE_URL}LaunchPrepNightSky.jpg?v=1`
const PAD_DECK_SRC = `${import.meta.env.BASE_URL}LaunchPrepPadDeck.jpg?v=2`
const BLAST_PAD_SRC = `${import.meta.env.BASE_URL}LaunchPrepBlastPad.png?v=2`
const SKY_CLOUD_A_SRC = `${import.meta.env.BASE_URL}LaunchPrepCloudA.png?v=1`
const SKY_CLOUD_B_SRC = `${import.meta.env.BASE_URL}LaunchPrepCloudB.png?v=1`
const SKY_CLOUD_C_SRC = `${import.meta.env.BASE_URL}LaunchPrepCloudC.png?v=1`
const SKY_SPARKLE_SRC = `${import.meta.env.BASE_URL}LaunchPrepStarSparkle.png?v=1`
const CRANE_BASE_SRC = `${import.meta.env.BASE_URL}LaunchPrepCraneBase.png?v=1`
const CRANE_CAB_SRC = `${import.meta.env.BASE_URL}LaunchPrepCraneCab.png?v=1`
const CRANE_BOOM_SRC = `${import.meta.env.BASE_URL}LaunchPrepCraneBoom.png?v=1`
const CRANE_JIB_SRC = `${import.meta.env.BASE_URL}LaunchPrepCraneJib.png?v=1`
const CRANE_HOOK_SRC = `${import.meta.env.BASE_URL}LaunchPrepCraneHook.png?v=1`
const FAIRING_SRC = `${import.meta.env.BASE_URL}LaunchPrepFairing.png?v=1`
const DRONE_SRC = `${import.meta.env.BASE_URL}LaunchPrepDrone.png?v=1`

/** Fixed decorative twinkles — CSS animation only; no timers. */
const LAUNCH_PREP_SKY_STARS: {
  top: string
  left: string
  size: number
  delay: string
  duration: string
}[] = [
  { top: '8%', left: '7%', size: 2, delay: '0s', duration: '3.2s' },
  { top: '22%', left: '18%', size: 3, delay: '0.7s', duration: '2.6s' },
  { top: '11%', left: '34%', size: 2, delay: '1.4s', duration: '3.6s' },
  { top: '28%', left: '46%', size: 2, delay: '0.3s', duration: '2.9s' },
  { top: '6%', left: '61%', size: 3, delay: '1.9s', duration: '3.4s' },
  { top: '19%', left: '74%', size: 2, delay: '0.9s', duration: '2.4s' },
  { top: '14%', left: '88%', size: 2, delay: '1.6s', duration: '3.1s' },
  { top: '32%', left: '81%', size: 2, delay: '2.2s', duration: '2.7s' },
]

/** Brighter four-point sparkles — slower fade than the CSS dots. */
const LAUNCH_PREP_SKY_SPARKLES: {
  top: string
  left: string
  size: string
  delay: string
  duration: string
}[] = [
  { top: '12%', left: '24%', size: '0.62rem', delay: '0.4s', duration: '5.4s' },
  { top: '9%', left: '58%', size: '0.78rem', delay: '2.1s', duration: '6.8s' },
  { top: '24%', left: '83%', size: '0.55rem', delay: '3.6s', duration: '5.9s' },
]

function resolveSceneTechs(
  process: ProcessVersion | null | undefined,
  techsProp: LaunchPrepTech[] | null | undefined,
): LaunchPrepTech[] {
  // When process is provided, trust it alone (includes explicit clear → []).
  if (process) return resolveLaunchPrepTechs(process)
  return Array.isArray(techsProp) ? techsProp.filter(isLaunchPrepTech) : []
}

/**
 * Pad-side launch preparation: mate booster to tower, crane-stack payload,
 * fuel umbilicals, power-up checklist. Each sub-task must be completed in order.
 * Optional To-be techs simplify fuel, power, or payload stack.
 */
export function LaunchPrepScene({
  run,
  onActionComplete,
  techs: techsProp = null,
  process = null,
  paused = false,
  onDefect,
}: LaunchPrepSceneProps) {
  // Snapshot techs when launch-prep (re)starts so a mid-step parent re-render cannot drop them.
  const [techs, setTechs] = useState<LaunchPrepTech[]>(() =>
    resolveSceneTechs(process, techsProp),
  )
  const fastPumps = techs.includes('faster-pumps')
  const autoPower = techs.includes('auto-power')
  const payloadDrone = techs.includes('payload-drone')
  const strongbackRedesign = techs.includes('strongback-redesign')
  /** Strongback redesign: mate slider only needs to travel half as far. */
  const mateTarget = strongbackRedesign ? 50 : 100
  const fillRate = fastPumps ? FAST_FILL_RATE_PER_MS : FILL_RATE_PER_MS
  const actionIndex = run.nextMachineIndex
  const locked = run.status === 'complete' || run.status === 'step_complete'
  const canInteract = run.status === 'running' && !locked && !paused

  /** Prevents double-firing complete when pointer/slider events race. */
  const finishGuardRef = useRef(false)

  // —— Sub-task 1: mate ——
  const [mateProgress, setMateProgress] = useState(0)
  const [mateDone, setMateDone] = useState(false)

  // —— Sub-task 2: crane ——
  const [craneStep, setCraneStep] = useState(0)
  const [craneDone, setCraneDone] = useState(false)
  // Extend boom: vertical drag slider — must release inside the sweet spot.
  const [extendValue, setExtendValue] = useState(0)
  const [extendFeedback, setExtendFeedback] = useState<'miss' | null>(null)
  const extendValueRef = useRef(0)
  const extendDraggingRef = useRef(false)
  const extendTrackRef = useRef<HTMLDivElement | null>(null)
  const extendFeedbackTimerRef = useRef<number | null>(null)
  // Swing over vehicle: press-and-hold — must release inside the sweet spot.
  const [swingFill, setSwingFill] = useState(0)
  const [swingHolding, setSwingHolding] = useState(false)
  const [swingFeedback, setSwingFeedback] = useState<'miss' | null>(null)
  const swingFillRef = useRef(0)
  const swingHoldingRef = useRef(false)
  const swingRafRef = useRef<number | null>(null)
  const swingLastRef = useRef(0)
  const swingFeedbackTimerRef = useRef<number | null>(null)

  // —— Sub-task 3: fuel ——
  const [loxConnected, setLoxConnected] = useState(false)
  const [rpConnected, setRpConnected] = useState(false)
  const [loxFill, setLoxFill] = useState(0)
  const [rpFill, setRpFill] = useState(0)
  const [fuelDone, setFuelDone] = useState(false)
  const fillTargetRef = useRef<'lox' | 'rp' | null>(null)
  const fillRafRef = useRef<number | null>(null)
  const fillLastRef = useRef(0)

  // —— Sub-task 4: power (cover → switch → charge bar, in order) ——
  const [powerCoverOpen, setPowerCoverOpen] = useState<string[]>([])
  const [powerSwitched, setPowerSwitched] = useState<string[]>([])
  const [powerFill, setPowerFill] = useState<Record<string, number>>({})
  const [powerArmed, setPowerArmed] = useState<string[]>([])
  const [powerDone, setPowerDone] = useState(false)
  const powerFillRafRef = useRef<number | null>(null)
  const powerFillLastRef = useRef(0)
  const powerSwitchedRef = useRef<string[]>([])
  const powerArmedRef = useRef<string[]>([])
  const powerFillRef = useRef<Record<string, number>>({})
  const powerDoneRef = useRef(false)

  // Re-read redesign techs whenever this step (re)starts for a unit.
  useEffect(() => {
    if (run.status === 'running' && run.currentStepIndex >= 0) {
      setTechs(resolveSceneTechs(process, techsProp))
    }
    // techsProp is a fresh array each render when provided — only its content matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.status, run.currentStepIndex, run.completedRuns, process, techsProp?.join(',')])

  // Reset local interaction state when this step (re)starts (not mid-step tech re-read).
  useEffect(() => {
    if (run.status === 'running' && run.currentStepIndex >= 0) {
      finishGuardRef.current = false
      setMateProgress(0)
      setMateDone(false)
      setCraneStep(0)
      setCraneDone(false)
      setExtendValue(0)
      setExtendFeedback(null)
      extendValueRef.current = 0
      extendDraggingRef.current = false
      if (extendFeedbackTimerRef.current != null) {
        window.clearTimeout(extendFeedbackTimerRef.current)
        extendFeedbackTimerRef.current = null
      }
      setSwingFill(0)
      setSwingHolding(false)
      setSwingFeedback(null)
      swingFillRef.current = 0
      swingHoldingRef.current = false
      if (swingRafRef.current != null) {
        cancelAnimationFrame(swingRafRef.current)
        swingRafRef.current = null
      }
      if (swingFeedbackTimerRef.current != null) {
        window.clearTimeout(swingFeedbackTimerRef.current)
        swingFeedbackTimerRef.current = null
      }
      setLoxConnected(false)
      setRpConnected(false)
      setLoxFill(0)
      setRpFill(0)
      setFuelDone(false)
      setPowerCoverOpen([])
      setPowerSwitched([])
      setPowerFill({})
      setPowerArmed([])
      setPowerDone(false)
      powerSwitchedRef.current = []
      powerArmedRef.current = []
      powerFillRef.current = {}
      powerDoneRef.current = false
      if (powerFillRafRef.current != null) {
        cancelAnimationFrame(powerFillRafRef.current)
        powerFillRafRef.current = null
      }
      fillTargetRef.current = null
      if (fillRafRef.current != null) {
        cancelAnimationFrame(fillRafRef.current)
        fillRafRef.current = null
      }
    }
  }, [run.status, run.currentStepIndex, run.completedRuns])

  // Allow the next sub-task to complete after parent advances actionIndex.
  useEffect(() => {
    finishGuardRef.current = false
  }, [actionIndex])

  useEffect(
    () => () => {
      if (fillRafRef.current != null) cancelAnimationFrame(fillRafRef.current)
      if (swingRafRef.current != null) cancelAnimationFrame(swingRafRef.current)
      if (powerFillRafRef.current != null) cancelAnimationFrame(powerFillRafRef.current)
      if (extendFeedbackTimerRef.current != null) {
        window.clearTimeout(extendFeedbackTimerRef.current)
      }
      if (swingFeedbackTimerRef.current != null) {
        window.clearTimeout(swingFeedbackTimerRef.current)
      }
    },
    [],
  )

  // Sync done flags from completed action ids (e.g. after re-render from parent).
  useEffect(() => {
    const done = new Set(run.completedMachineIds)
    if (done.has('mate-tower')) setMateDone(true)
    if (done.has('crane-payload')) setCraneDone(true)
    if (done.has('fuel-vehicle')) setFuelDone(true)
    if (done.has('power-up')) {
      const ids = POWER_SWITCHES.map((s) => s.id)
      const full = Object.fromEntries(ids.map((id) => [id, 100]))
      setPowerDone(true)
      setPowerCoverOpen(ids)
      setPowerSwitched(ids)
      setPowerArmed(ids)
      setPowerFill(full)
      powerDoneRef.current = true
      powerSwitchedRef.current = ids
      powerArmedRef.current = ids
      powerFillRef.current = full
    }
  }, [run.completedMachineIds])

  const completeCurrent = useCallback(() => {
    if (!canInteract || finishGuardRef.current) return false
    finishGuardRef.current = true
    onActionComplete()
    return true
  }, [canInteract, onActionComplete])

  // —— Mate: drag slider to its target (halved by strongback redesign) ——
  function handleMateChange(value: number) {
    if (!canInteract || actionIndex !== 0 || mateDone) return
    const v = Math.max(0, Math.min(mateTarget, value))
    setMateProgress(v)
    if (v >= mateTarget) {
      setMateDone(true)
      completeCurrent()
    }
  }

  // —— Crane: numbered click sequence (or one-step drone) ——
  function handleCraneStep(step: number) {
    if (!canInteract || actionIndex !== 1 || craneDone) return
    if (step !== craneStep) return
    const next = craneStep + 1
    setCraneStep(next)
    if (next >= CRANE_STEPS.length) {
      setCraneDone(true)
      completeCurrent()
    }
  }

  // —— Extend boom: vertical drag slider, release inside the sweet spot ——
  function extendPercentFromClientY(clientY: number): number {
    const el = extendTrackRef.current
    if (!el) return extendValueRef.current
    const rect = el.getBoundingClientRect()
    const ratio = (rect.bottom - clientY) / rect.height
    return Math.max(0, Math.min(100, ratio * 100))
  }

  function clearExtendFeedbackLater() {
    if (extendFeedbackTimerRef.current != null) {
      window.clearTimeout(extendFeedbackTimerRef.current)
    }
    extendFeedbackTimerRef.current = window.setTimeout(() => {
      setExtendFeedback(null)
    }, 1600)
  }

  function handleExtendPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canInteract || actionIndex !== 1 || craneDone || craneStep !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    extendDraggingRef.current = true
    setExtendFeedback(null)
    const v = extendPercentFromClientY(e.clientY)
    extendValueRef.current = v
    setExtendValue(v)
  }

  function handleExtendPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!extendDraggingRef.current) return
    const v = extendPercentFromClientY(e.clientY)
    extendValueRef.current = v
    setExtendValue(v)
  }

  function handleExtendPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!extendDraggingRef.current) return
    extendDraggingRef.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const v = extendValueRef.current
    extendValueRef.current = 0
    setExtendValue(0)
    if (v >= EXTEND_SWEET_MIN && v <= EXTEND_SWEET_MAX) {
      handleCraneStep(0)
    } else {
      setExtendFeedback('miss')
      clearExtendFeedbackLater()
      onDefect?.()
    }
  }

  // —— Swing over vehicle: press-and-hold, release inside the sweet spot ——
  const tickSwing = useCallback(() => {
    if (!swingHoldingRef.current) return
    const now = performance.now()
    const dt = Math.min(50, now - swingLastRef.current)
    swingLastRef.current = now
    const next = Math.min(100, swingFillRef.current + SWING_FILL_RATE_PER_MS * dt)
    swingFillRef.current = next
    setSwingFill(next)
    swingRafRef.current = requestAnimationFrame(tickSwing)
  }, [])

  function clearSwingFeedbackLater() {
    if (swingFeedbackTimerRef.current != null) {
      window.clearTimeout(swingFeedbackTimerRef.current)
    }
    swingFeedbackTimerRef.current = window.setTimeout(() => {
      setSwingFeedback(null)
    }, 1600)
  }

  function startSwingHold() {
    if (!canInteract || actionIndex !== 1 || craneDone || craneStep !== 2) return
    swingHoldingRef.current = true
    setSwingHolding(true)
    setSwingFeedback(null)
    swingLastRef.current = performance.now()
    if (swingRafRef.current != null) cancelAnimationFrame(swingRafRef.current)
    swingRafRef.current = requestAnimationFrame(tickSwing)
  }

  function stopSwingHold() {
    if (!swingHoldingRef.current) return
    swingHoldingRef.current = false
    setSwingHolding(false)
    if (swingRafRef.current != null) {
      cancelAnimationFrame(swingRafRef.current)
      swingRafRef.current = null
    }
    const fill = swingFillRef.current
    swingFillRef.current = 0
    setSwingFill(0)
    if (fill >= SWING_SWEET_MIN && fill <= SWING_SWEET_MAX) {
      handleCraneStep(2)
    } else {
      setSwingFeedback('miss')
      clearSwingFeedbackLater()
      onDefect?.()
    }
  }

  function handleDroneDeploy() {
    if (!canInteract || actionIndex !== 1 || craneDone || !payloadDrone) return
    // Clear stale guard from a prior sub-task so one click always commits.
    finishGuardRef.current = false
    setCraneStep(CRANE_STEPS.length)
    setCraneDone(true)
    completeCurrent()
  }

  function stopPowerFill() {
    if (powerFillRafRef.current != null) {
      cancelAnimationFrame(powerFillRafRef.current)
      powerFillRafRef.current = null
    }
  }

  const commitPowerComplete = useCallback(() => {
    if (powerDoneRef.current) return
    finishGuardRef.current = false
    const committed = completeCurrent()
    if (!committed) return
    powerDoneRef.current = true
    setPowerDone(true)
  }, [completeCurrent])

  const tickPowerFill = useCallback(() => {
    if (powerDoneRef.current) {
      stopPowerFill()
      return
    }
    const now = performance.now()
    const dt = Math.min(50, now - powerFillLastRef.current)
    powerFillLastRef.current = now
    const rate = autoPower ? POWER_FILL_RATE_AUTO_PER_MS : POWER_FILL_RATE_PER_MS
    const switched = powerSwitchedRef.current
    const nextFill = { ...powerFillRef.current }
    let changed = false
    const newlyArmed: string[] = []
    for (const sw of POWER_SWITCHES) {
      if (!switched.includes(sw.id)) continue
      if ((nextFill[sw.id] ?? 0) >= 100) continue
      const v = Math.min(100, (nextFill[sw.id] ?? 0) + rate * dt)
      nextFill[sw.id] = v
      changed = true
      if (v >= 100 && !powerArmedRef.current.includes(sw.id)) {
        newlyArmed.push(sw.id)
      }
    }
    if (changed) {
      powerFillRef.current = nextFill
      setPowerFill(nextFill)
    }
    if (newlyArmed.length) {
      const armed = [...powerArmedRef.current, ...newlyArmed]
      powerArmedRef.current = armed
      setPowerArmed(armed)
      if (armed.length >= POWER_SWITCHES.length) {
        stopPowerFill()
        commitPowerComplete()
        return
      }
    }
    const stillFilling = POWER_SWITCHES.some(
      (sw) => switched.includes(sw.id) && (nextFill[sw.id] ?? 0) < 100,
    )
    if (stillFilling) {
      powerFillRafRef.current = requestAnimationFrame(tickPowerFill)
    } else {
      powerFillRafRef.current = null
    }
  }, [autoPower, commitPowerComplete])

  function ensurePowerFillTicking() {
    if (powerFillRafRef.current != null || powerDoneRef.current) return
    powerFillLastRef.current = performance.now()
    powerFillRafRef.current = requestAnimationFrame(tickPowerFill)
  }

  function handlePowerCover(id: string, index: number) {
    if (!canInteract || actionIndex !== POWER_ACTION_INDEX || powerDone) return
    if (autoPower) return
    if (powerArmed.length !== index) return
    if (powerCoverOpen.includes(id)) return
    setPowerCoverOpen((prev) => [...prev, id])
  }

  function handlePowerSwitch(id: string, index: number) {
    if (!canInteract || actionIndex !== POWER_ACTION_INDEX || powerDone) return
    if (autoPower) return
    if (powerArmed.length !== index) return
    if (!powerCoverOpen.includes(id)) return
    if (powerSwitched.includes(id)) return
    const next = [...powerSwitched, id]
    powerSwitchedRef.current = next
    setPowerSwitched(next)
    ensurePowerFillTicking()
  }

  function handleMasterPowerOn() {
    if (
      !canInteract ||
      actionIndex !== POWER_ACTION_INDEX ||
      powerDone ||
      !autoPower
    ) {
      return
    }
    // Clear stale guard from fuel complete so a single master ON always starts.
    finishGuardRef.current = false
    const ids = POWER_SWITCHES.map((s) => s.id)
    setPowerCoverOpen(ids)
    powerSwitchedRef.current = ids
    setPowerSwitched(ids)
    ensurePowerFillTicking()
  }

  // —— Fuel: connect umbilicals, hold-to-fill ——
  function stopFill() {
    fillTargetRef.current = null
    if (fillRafRef.current != null) {
      cancelAnimationFrame(fillRafRef.current)
      fillRafRef.current = null
    }
  }

  const tickFill = useCallback(() => {
    const target = fillTargetRef.current
    if (!target) return
    const now = performance.now()
    const dt = Math.min(50, now - fillLastRef.current)
    fillLastRef.current = now
    const delta = fillRate * dt

    if (target === 'lox') {
      setLoxFill((prev) => {
        const next = Math.min(100, prev + delta)
        if (next >= 100) fillTargetRef.current = null
        return next
      })
    } else {
      setRpFill((prev) => {
        const next = Math.min(100, prev + delta)
        if (next >= 100) fillTargetRef.current = null
        return next
      })
    }

    fillRafRef.current = requestAnimationFrame(tickFill)
  }, [fillRate])

  function startFill(which: 'lox' | 'rp') {
    if (!canInteract || actionIndex !== 2 || fuelDone) return
    if (which === 'lox' && (!loxConnected || loxFill >= 100)) return
    if (which === 'rp' && (!rpConnected || rpFill >= 100)) return
    fillTargetRef.current = which
    fillLastRef.current = performance.now()
    if (fillRafRef.current != null) cancelAnimationFrame(fillRafRef.current)
    fillRafRef.current = requestAnimationFrame(tickFill)
  }

  // When both tanks full, complete fuel action.
  useEffect(() => {
    if (!canInteract || actionIndex !== 2 || fuelDone) return
    if (loxFill >= 100 && rpFill >= 100) {
      setFuelDone(true)
      stopFill()
      completeCurrent()
    }
  }, [loxFill, rpFill, canInteract, actionIndex, fuelDone, completeCurrent])

  // Pause mid-charge: freeze the bar; resume continues from the same percent.
  useEffect(() => {
    if (paused) {
      stopPowerFill()
      return
    }
    const filling = powerSwitchedRef.current.some(
      (id) =>
        (powerFillRef.current[id] ?? 0) < 100 &&
        !powerArmedRef.current.includes(id),
    )
    if (filling) ensurePowerFillTicking()
    // ensurePowerFillTicking reads the latest tickPowerFill via the render that set paused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused])

  const stepComplete = locked || powerDone
  const mated = mateDone || mateProgress >= mateTarget || actionIndex > 0
  const payloadStacked = craneDone || actionIndex > 1
  const fueled = fuelDone || actionIndex > 2
  const powered = powerDone || actionIndex > 3 || locked
  /** Hull edge lights: one per power bus; sequential arming or all-on for master ON / complete. */
  const powerLightsLit = powered
    ? POWER_SWITCHES.length
    : powerArmed.length

  // Crane visual phase from completed clicks (0–4).
  const craneVisual = craneDone || actionIndex > 1 ? 4 : craneStep

  // Live cue for the swing hold: tells the operator when to let go.
  const swingPhase: 'idle' | 'early' | 'sweet' | 'late' = !swingHolding
    ? 'idle'
    : swingFill < SWING_SWEET_MIN
      ? 'early'
      : swingFill <= SWING_SWEET_MAX
        ? 'sweet'
        : 'late'

  const checklist = LAUNCH_PREP_ACTIONS.map((action, i) => {
    const done =
      run.completedMachineIds.includes(action.id) ||
      (i === 0 && mateDone) ||
      (i === 1 && craneDone) ||
      (i === 2 && fuelDone) ||
      (i === 3 && powerDone) ||
      i < actionIndex
    const active = canInteract && i === actionIndex && !done
    let label = action.name
    if (i === 1 && payloadDrone) label = 'Stack payload with drone'
    if (i === 2 && fastPumps) label = 'Fuel the vehicle (high-flow pumps)'
    if (i === 3 && autoPower) label = 'Power up for launch (master ON)'
    return { action, done, active, index: i, label }
  })

  function powerFillOf(id: string): number {
    if (powerArmed.includes(id) || powered) return 100
    return powerFill[id] ?? 0
  }

  function powerBayState(
    id: string,
    index: number,
  ): 'locked' | 'ready' | 'open' | 'charging' | 'online' {
    if (powerArmed.includes(id) || powered) return 'online'
    if (powerSwitched.includes(id)) return 'charging'
    if (powerCoverOpen.includes(id)) return 'open'
    if (powerArmed.length === index) return 'ready'
    return 'locked'
  }

  function powerStatusLine(): string {
    if (powered || powerArmed.length >= POWER_SWITCHES.length) {
      return 'ALL BUSES ONLINE · VEHICLE POWER NOMINAL'
    }
    if (autoPower && powerSwitched.length === 0) {
      return 'MASTER ARM READY · PRESS ON TO SEQUENCE ALL BUSES'
    }
    if (autoPower) {
      const pct = Math.round(
        POWER_SWITCHES.reduce((sum, sw) => sum + powerFillOf(sw.id), 0) /
          POWER_SWITCHES.length,
      )
      return `AUTO SEQUENCE · CHARGING ALL BUSES · ${pct}%`
    }
    const i = powerArmed.length
    const sw = POWER_SWITCHES[i]
    const fill = powerFillOf(sw.id)
    if (powerSwitched.includes(sw.id)) {
      return `CHARGING BUS 0${i + 1} · ${sw.short} · ${Math.round(fill)}%`
    }
    if (powerCoverOpen.includes(sw.id)) {
      return `THROW SWITCH · BUS 0${i + 1} ${sw.short}`
    }
    return `LIFT COVER · BUS 0${i + 1} ${sw.short} · INTERLOCK RELEASED`
  }

  return (
    <div
      className={[
        'launch-prep-scene',
        stepComplete ? 'launch-prep-scene--ready' : '',
        payloadDrone ? 'launch-prep-scene--drone' : '',
        ...techs.map((t) => `launch-prep-scene--tech-${t}`),
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="launch-prep-scene__checklist" aria-label="Launch prep tasks">
        {checklist.map(({ action, done, active, index, label }) => (
          <div
            key={action.id}
            className={[
              'lp-check',
              done ? 'lp-check--done' : '',
              active ? 'lp-check--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="lp-check__num" aria-hidden="true">
              {done ? '✓' : index + 1}
            </span>
            <span className="lp-check__label">{label}</span>
          </div>
        ))}
      </div>

      <div className="launch-prep-pad" aria-hidden="true">
        <div className="launch-prep-pad__sky">
          <img
            className="launch-prep-pad__sky-plate"
            src={NIGHT_SKY_SRC}
            alt=""
            draggable={false}
            decoding="async"
          />
          <div className="launch-prep-pad__sky-fx">
            {LAUNCH_PREP_SKY_STARS.map((star, i) => (
              <span
                key={`lp-star-${i}`}
                className="launch-prep-pad__star"
                style={{
                  top: star.top,
                  left: star.left,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  animationDelay: star.delay,
                  animationDuration: star.duration,
                }}
              />
            ))}
            {LAUNCH_PREP_SKY_SPARKLES.map((sparkle, i) => (
              <img
                key={`lp-sparkle-${i}`}
                className="launch-prep-pad__sparkle"
                src={SKY_SPARKLE_SRC}
                alt=""
                draggable={false}
                decoding="async"
                style={{
                  top: sparkle.top,
                  left: sparkle.left,
                  width: sparkle.size,
                  height: sparkle.size,
                  animationDelay: sparkle.delay,
                  animationDuration: sparkle.duration,
                }}
              />
            ))}
            <img
              className="launch-prep-pad__cloud launch-prep-pad__cloud--a"
              src={SKY_CLOUD_A_SRC}
              alt=""
              draggable={false}
              decoding="async"
            />
            <img
              className="launch-prep-pad__cloud launch-prep-pad__cloud--b"
              src={SKY_CLOUD_B_SRC}
              alt=""
              draggable={false}
              decoding="async"
            />
            <img
              className="launch-prep-pad__cloud launch-prep-pad__cloud--c"
              src={SKY_CLOUD_C_SRC}
              alt=""
              draggable={false}
              decoding="async"
            />
          </div>
        </div>
        <div className="launch-prep-pad__ground">
          <img
            className="launch-prep-pad__ground-plate"
            src={PAD_DECK_SRC}
            alt=""
            draggable={false}
            decoding="async"
          />
        </div>
        <div className="lp-blast-pad" title="Launch pad">
          <img
            className="lp-blast-pad__img"
            src={BLAST_PAD_SRC}
            alt=""
            draggable={false}
            decoding="async"
          />
        </div>

        {/* Launch tower + strongback (PNG sprites; strongback rotates via --mate) */}
        <div className={['lp-tower', mated ? 'lp-tower--mated' : ''].join(' ')}>
          <div className="lp-tower__mast">
            <img
              className="lp-tower__mast-img"
              src={TOWER_MAST_SRC}
              alt=""
              draggable={false}
              decoding="async"
            />
          </div>
          <div
            className="lp-tower__strongback"
            style={
              actionIndex === 0 && !mateDone
                ? { ['--mate' as string]: `${mateProgress / mateTarget}` }
                : undefined
            }
          >
            <img
              className="lp-tower__strongback-img"
              src={TOWER_STRONGBACK_SRC}
              alt=""
              draggable={false}
              decoding="async"
            />
          </div>
          <div className="lp-tower__base">
            <img
              className="lp-tower__base-img"
              src={TOWER_BASE_SRC}
              alt=""
              draggable={false}
              decoding="async"
            />
          </div>
        </div>

        {/* Booster: slides from pad side into tower when mating */}
        <div
          className={[
            'lp-booster-slot',
            mated ? 'lp-booster-slot--mated' : 'lp-booster-slot--staging',
          ].join(' ')}
          style={
            actionIndex === 0 && !mateDone
              ? {
                  ['--mate' as string]: `${mateProgress / mateTarget}`,
                }
              : undefined
          }
        >
          <Booster
            className="booster--launch-prep"
            showNose={false}
            ready={stepComplete}
            label={mated ? 'Booster on strongback' : 'Booster staged at pad'}
          />
          {/* Four bus-status lights along the hull — arm one-by-one, or all on master ON */}
          <div
            className="lp-power-lights"
            aria-hidden="true"
            data-lit={powerLightsLit}
          >
            {POWER_SWITCHES.map((sw, i) => {
              const on = i < powerLightsLit
              return (
                <span
                  key={sw.id}
                  className={[
                    'lp-power-light',
                    on ? 'lp-power-light--on' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ ['--light-i' as string]: String(i) }}
                  title={on ? `${sw.label} armed` : sw.label}
                />
              )
            })}
          </div>
          {payloadStacked && (
            <div className="lp-payload" title="Payload / fairing">
              <img
                className="lp-payload__fairing"
                src={FAIRING_SRC}
                alt=""
                draggable={false}
                decoding="async"
              />
            </div>
          )}
        </div>

        {/* Mobile crane — or autonomous payload drone when upgraded */}
        {payloadDrone ? (
          <div
            className={[
              'lp-drone',
              payloadStacked ? 'lp-drone--clear' : '',
              actionIndex === 1 && !payloadStacked ? 'lp-drone--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="lp-drone__body">
              <img
                className="lp-drone__sprite"
                src={DRONE_SRC}
                alt=""
                draggable={false}
                decoding="async"
              />
            </div>
            <div className="lp-drone__cable" />
            {!payloadStacked && (
              <div className="lp-drone__load">
                <img
                  className="lp-payload__fairing lp-payload__fairing--hook"
                  src={FAIRING_SRC}
                  alt=""
                  draggable={false}
                  decoding="async"
                />
              </div>
            )}
          </div>
        ) : (
          <div
            className={[
              'lp-crane',
              `lp-crane--phase-${craneVisual}`,
              payloadStacked ? 'lp-crane--clear' : '',
            ].join(' ')}
          >
            <div className="lp-crane__base">
              <img
                className="lp-crane__base-img"
                src={CRANE_BASE_SRC}
                alt=""
                draggable={false}
                decoding="async"
              />
            </div>
            <div className="lp-crane__cab">
              <img
                className="lp-crane__cab-img"
                src={CRANE_CAB_SRC}
                alt=""
                draggable={false}
                decoding="async"
              />
            </div>
            <div className="lp-crane__boom">
              <img
                className="lp-crane__boom-img"
                src={CRANE_BOOM_SRC}
                alt=""
                draggable={false}
                decoding="async"
              />
              <div className="lp-crane__jib">
                <img
                  className="lp-crane__jib-img"
                  src={CRANE_JIB_SRC}
                  alt=""
                  draggable={false}
                  decoding="async"
                />
                <div className="lp-crane__cable" />
                <img
                  className="lp-crane__hook-img"
                  src={CRANE_HOOK_SRC}
                  alt=""
                  draggable={false}
                  decoding="async"
                />
                {!payloadStacked && craneVisual >= 2 && (
                  <div className="lp-crane__hook-load">
                    <img
                      className="lp-payload__fairing lp-payload__fairing--hook"
                      src={FAIRING_SRC}
                      alt=""
                      draggable={false}
                      decoding="async"
                    />
                  </div>
                )}
              </div>
            </div>
            {craneVisual < 2 && !payloadStacked && (
              <div className="lp-crane__ground-load">
                <img
                  className="lp-payload__fairing"
                  src={FAIRING_SRC}
                  alt=""
                  draggable={false}
                  decoding="async"
                />
              </div>
            )}
          </div>
        )}

        {/* Fuel farm + umbilicals (tank end → booster hull) */}
        <div
          className={[
            'lp-umbilicals',
            loxConnected || fueled ? 'lp-umbilicals--lox' : '',
            rpConnected || fueled ? 'lp-umbilicals--rp' : '',
            loxConnected && loxFill > 0 && loxFill < 100
              ? 'lp-umbilicals--lox-flow'
              : '',
            rpConnected && rpFill > 0 && rpFill < 100
              ? 'lp-umbilicals--rp-flow'
              : '',
            fueled ? 'lp-umbilicals--full' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="lp-tank lp-tank--lox" title="LOX supply">
            <img
              className="lp-tank__sprite"
              src={TANK_LOX_SRC}
              alt=""
              draggable={false}
              decoding="async"
            />
            <span className="lp-tank__label">LOX</span>
          </div>
          <div className="lp-tank lp-tank--rp" title="RP-1 supply">
            <img
              className="lp-tank__sprite"
              src={TANK_RP1_SRC}
              alt=""
              draggable={false}
              decoding="async"
            />
            <span className="lp-tank__label">RP-1</span>
          </div>
          <span className="lp-umbilical lp-umbilical--lox">
            <span className="lp-umbilical__flow" aria-hidden="true" />
          </span>
          <span className="lp-umbilical lp-umbilical--rp">
            <span className="lp-umbilical__flow" aria-hidden="true" />
          </span>
          <span
            className="lp-umbilical__port lp-umbilical__port--lox"
            title="LOX vehicle port"
          />
          <span
            className="lp-umbilical__port lp-umbilical__port--rp"
            title="RP-1 vehicle port"
          />
        </div>

        {/* Power glow when armed */}
        {powered && <div className="lp-power-glow" />}
      </div>

      {/* Operator controls for the active sub-task */}
      <div className="launch-prep-controls">
        {canInteract && actionIndex === 0 && (
          <div className="lp-panel">
            <p className="lp-panel__title">1 · Mate booster to tower</p>
            <p className="lp-panel__hint">
              {strongbackRedesign
                ? 'Redesigned clamp geometry — the slide is half as long now. Slide the control to raise and mate the booster with the launch tower.'
                : 'Slide the strongback control to raise and mate the booster with the launch tower.'}
            </p>
            <label className="lp-slider">
              <span className="lp-slider__label">Strongback mate</span>
              <input
                type="range"
                min={0}
                max={mateTarget}
                step={1}
                value={mateProgress}
                onChange={(e) => handleMateChange(Number(e.target.value))}
                aria-valuetext={`${Math.round((mateProgress / mateTarget) * 100)}% mated`}
                className={
                  strongbackRedesign ? 'lp-slider__input lp-slider__input--short' : 'lp-slider__input'
                }
              />
              <span className="lp-slider__value">
                {Math.round((mateProgress / mateTarget) * 100)}%
              </span>
            </label>
          </div>
        )}

        {canInteract && actionIndex === 1 && (
          <div className="lp-panel">
            <p className="lp-panel__title">
              {payloadDrone
                ? '2 · Stack payload with drone'
                : '2 · Stack payload with crane'}
            </p>
            {payloadDrone ? (
              <>
                <p className="lp-panel__hint">
                  Command the autonomous payload drone to lift the fairing and
                  seat it on the booster in one action.
                </p>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleDroneDeploy}
                >
                  Deploy payload drone
                </button>
              </>
            ) : (
              <>
                <p className="lp-panel__hint">
                  Operate the pad crane in sequence to lift the payload fairing
                  and place it on the booster.
                </p>
                <div
                  className="lp-crane-controls"
                  role="group"
                  aria-label="Crane sequence"
                >
                  {/* 1 · Extend boom — drag the lift into the sweet spot and release */}
                  <div
                    className={[
                      'lp-extend',
                      craneStep === 0 ? 'lp-extend--next' : '',
                      craneStep > 0 ? 'lp-extend--done' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="lp-extend__label">
                      {craneStep > 0 ? `✓ ${CRANE_STEPS[0].label}` : CRANE_STEPS[0].label}
                    </span>
                    <div className="lp-extend-row">
                      <div
                        ref={extendTrackRef}
                        className={[
                          'lp-extend-track',
                          craneStep !== 0 ? 'lp-extend-track--disabled' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onPointerDown={handleExtendPointerDown}
                        onPointerMove={handleExtendPointerMove}
                        onPointerUp={handleExtendPointerUp}
                        onPointerCancel={handleExtendPointerUp}
                        role="slider"
                        aria-label="Extend boom lift"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(extendValue)}
                        aria-disabled={craneStep !== 0}
                      >
                        <span
                          className="lp-extend-track__sweet"
                          style={{
                            bottom: `${EXTEND_SWEET_MIN}%`,
                            height: `${EXTEND_SWEET_MAX - EXTEND_SWEET_MIN}%`,
                          }}
                        />
                        <span
                          className="lp-extend-track__fill"
                          style={{ height: `${extendValue}%` }}
                        />
                        <span
                          className="lp-extend-track__handle"
                          style={{ bottom: `${extendValue}%` }}
                        />
                      </div>
                      <span className="lp-extend-feedback" aria-live="polite">
                        {craneStep > 0
                          ? 'Boom extended.'
                          : extendFeedback === 'miss'
                            ? 'Missed the sweet spot — try again.'
                            : 'Drag up, release inside the band.'}
                      </span>
                    </div>
                  </div>

                  {/* 2 · Lift payload — unchanged simple click */}
                  <button
                    type="button"
                    className={[
                      'btn btn--ghost lp-crane-btn',
                      craneStep === 1 ? 'lp-crane-btn--next' : '',
                      craneStep > 1 ? 'lp-crane-btn--done' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={craneStep !== 1}
                    onClick={() => handleCraneStep(1)}
                  >
                    {craneStep > 1 ? `✓ ${CRANE_STEPS[1].label}` : CRANE_STEPS[1].label}
                  </button>

                  {/* 3 · Swing over vehicle — hold, release inside the sweet spot */}
                  <div
                    className={[
                      'lp-swing',
                      craneStep === 2 ? 'lp-swing--next' : '',
                      craneStep > 2 ? 'lp-swing--done' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <button
                      type="button"
                      className={[
                        'btn btn--primary lp-hold-btn lp-swing-btn',
                        swingHolding ? 'lp-swing-btn--holding' : '',
                        swingPhase === 'sweet' ? 'lp-swing-btn--sweet' : '',
                        swingPhase === 'late' ? 'lp-swing-btn--late' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={craneStep !== 2}
                      onPointerDown={startSwingHold}
                      onPointerUp={stopSwingHold}
                      onPointerLeave={stopSwingHold}
                      onPointerCancel={stopSwingHold}
                    >
                      {craneStep > 2
                        ? `✓ ${CRANE_STEPS[2].label}`
                        : swingPhase === 'sweet'
                          ? 'Release now!'
                          : swingPhase === 'late'
                            ? 'Too late — release!'
                            : 'Hold to swing over vehicle'}
                    </button>
                    <div
                      className={[
                        'lp-swing-bar',
                        swingPhase === 'sweet' ? 'lp-swing-bar--sweet' : '',
                        swingPhase === 'late' ? 'lp-swing-bar--late' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-hidden="true"
                    >
                      <span
                        className="lp-swing-bar__sweet"
                        style={{
                          left: `${SWING_SWEET_MIN}%`,
                          width: `${SWING_SWEET_MAX - SWING_SWEET_MIN}%`,
                        }}
                      />
                      <span
                        className="lp-swing-bar__fill"
                        style={{ width: `${swingFill}%` }}
                      />
                      <span className="lp-swing-bar__readout">
                        {Math.round(swingFill)}%
                      </span>
                    </div>
                    <span
                      className={[
                        'lp-swing-feedback',
                        swingPhase === 'sweet' ? 'lp-swing-feedback--sweet' : '',
                        swingPhase === 'late' ? 'lp-swing-feedback--late' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-live="polite"
                    >
                      {craneStep > 2
                        ? 'Swung into position.'
                        : swingPhase === 'sweet'
                          ? 'In the band — let go now!'
                          : swingPhase === 'early'
                            ? 'Keep holding…'
                            : swingPhase === 'late'
                              ? 'Past the window — release and try again.'
                              : swingFeedback === 'miss'
                                ? 'Released outside the window — try again.'
                                : 'Hold, release inside the band.'}
                    </span>
                  </div>

                  {/* 4 · Lower & attach — unchanged simple click */}
                  <button
                    type="button"
                    className={[
                      'btn btn--ghost lp-crane-btn',
                      craneStep === 3 ? 'lp-crane-btn--next' : '',
                      craneStep > 3 ? 'lp-crane-btn--done' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={craneStep !== 3}
                    onClick={() => handleCraneStep(3)}
                  >
                    {craneStep > 3 ? `✓ ${CRANE_STEPS[3].label}` : CRANE_STEPS[3].label}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {canInteract && actionIndex === 2 && (
          <div className="lp-panel">
            <p className="lp-panel__title">3 · Fuel the vehicle</p>
            <p className="lp-panel__hint">
              {fastPumps
                ? 'Connect LOX and RP-1 umbilicals, then hold fill — high-flow pumps fill almost instantly.'
                : 'Connect LOX and RP-1 umbilicals, then hold each fill control until tanks are full.'}
            </p>
            <div className="lp-fuel-grid">
              <div className="lp-fuel-col">
                <button
                  type="button"
                  className={[
                    'btn btn--ghost',
                    loxConnected ? 'btn--ghost-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={loxConnected}
                  onClick={() => setLoxConnected(true)}
                >
                  {loxConnected ? '✓ LOX umbilical' : 'Connect LOX'}
                </button>
                <div className="lp-gauge" aria-label={`LOX ${Math.round(loxFill)}%`}>
                  <div
                    className="lp-gauge__fill lp-gauge__fill--lox"
                    style={{ transform: `scaleY(${loxFill / 100})` }}
                  />
                  <span className="lp-gauge__readout">{Math.round(loxFill)}%</span>
                </div>
                <button
                  type="button"
                  className="btn btn--primary lp-hold-btn"
                  disabled={!loxConnected || loxFill >= 100}
                  onPointerDown={() => startFill('lox')}
                  onPointerUp={stopFill}
                  onPointerLeave={stopFill}
                  onPointerCancel={stopFill}
                >
                  {loxFill >= 100 ? 'LOX full' : 'Hold to fill LOX'}
                </button>
              </div>
              <div className="lp-fuel-col">
                <button
                  type="button"
                  className={[
                    'btn btn--ghost',
                    rpConnected ? 'btn--ghost-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={rpConnected}
                  onClick={() => setRpConnected(true)}
                >
                  {rpConnected ? '✓ RP-1 umbilical' : 'Connect RP-1'}
                </button>
                <div className="lp-gauge" aria-label={`RP-1 ${Math.round(rpFill)}%`}>
                  <div
                    className="lp-gauge__fill lp-gauge__fill--rp"
                    style={{ transform: `scaleY(${rpFill / 100})` }}
                  />
                  <span className="lp-gauge__readout">{Math.round(rpFill)}%</span>
                </div>
                <button
                  type="button"
                  className="btn btn--primary lp-hold-btn"
                  disabled={!rpConnected || rpFill >= 100}
                  onPointerDown={() => startFill('rp')}
                  onPointerUp={stopFill}
                  onPointerLeave={stopFill}
                  onPointerCancel={stopFill}
                >
                  {rpFill >= 100 ? 'RP-1 full' : 'Hold to fill RP-1'}
                </button>
              </div>
            </div>
          </div>
        )}

        {canInteract && actionIndex === POWER_ACTION_INDEX && (
          <div
            className="lp-panel lp-panel--power"
            data-lp-tech={autoPower ? 'auto-power' : 'none'}
          >
            <p className="lp-panel__title">
              {autoPower
                ? '4 · Power up for launch (master ON)'
                : '4 · Power up for launch'}
            </p>
            <p className="lp-panel__hint">
              {autoPower
                ? 'Automatic power-up sequence installed — arm every bus from the master control.'
                : 'Open the red cover, throw the switch, and wait for that bus to charge to 100% before the next interlock releases.'}
            </p>
            <div
              className={[
                'lp-power-term',
                autoPower ? 'lp-power-term--master' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-lp-action={autoPower ? 'master-power-on' : 'power-switches'}
            >
              <img
                className="lp-power-term__bezel"
                src={POWER_TERMINAL_SRC}
                alt=""
                draggable={false}
                decoding="async"
              />
              <div className="lp-power-term__screen">
                <header className="lp-power-term__hdr">
                  <span className="lp-power-term__live">
                    <span className="lp-power-term__live-dot" aria-hidden="true" />
                    LIVE
                  </span>
                  <span className="lp-power-term__title">VEHICLE POWER BUS</span>
                  <span className="lp-power-term__sys">
                    SYS 04 · {autoPower ? 'AUTO SEQ' : 'INTERLOCK'}
                  </span>
                </header>

                <div
                  className="lp-power-term__bays"
                  role="group"
                  aria-label="Vehicle power buses"
                >
                  {POWER_SWITCHES.map((sw, i) => {
                    const state = powerBayState(sw.id, i)
                    const fill = powerFillOf(sw.id)
                    const coverOpen = powerCoverOpen.includes(sw.id) || autoPower
                    const switched = powerSwitched.includes(sw.id) || state === 'online'
                    const stateLabel =
                      state === 'online'
                        ? 'ONLINE'
                        : state === 'charging'
                          ? `CHARGING ${Math.round(fill)}%`
                          : state === 'open'
                            ? 'SWITCH READY'
                            : state === 'ready'
                              ? 'LIFT COVER'
                              : 'INTERLOCK'
                    return (
                      <div
                        key={sw.id}
                        className={[
                          'lp-pwr-bay',
                          `lp-pwr-bay--${state}`,
                        ].join(' ')}
                        data-bus={sw.id}
                        data-bus-state={state}
                      >
                        <div className="lp-pwr-bay__top">
                          <span className="lp-pwr-bay__id">BUS 0{i + 1}</span>
                          <span
                            className={[
                              'lp-pwr-bay__led',
                              state === 'online' ? 'lp-pwr-bay__led--on' : '',
                              state === 'charging' ? 'lp-pwr-bay__led--chg' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            aria-hidden="true"
                          />
                        </div>
                        <img
                          className="lp-pwr-bay__icon"
                          src={sw.icon}
                          alt=""
                          draggable={false}
                          decoding="async"
                        />
                        <p className="lp-pwr-bay__name">{sw.label}</p>
                        {autoPower ? (
                          <div className="lp-pwr-bay__auto-slot" aria-hidden="true">
                            <img
                              className="lp-pwr-bay__toggle-img"
                              src={
                                switched
                                  ? POWER_TOGGLE_ON_SRC
                                  : POWER_TOGGLE_OFF_SRC
                              }
                              alt=""
                              draggable={false}
                              decoding="async"
                            />
                          </div>
                        ) : (
                          <div className="lp-pwr-well">
                            <button
                              type="button"
                              className={[
                                'lp-pwr-toggle',
                                switched ? 'lp-pwr-toggle--on' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              disabled={state !== 'open'}
                              onClick={() => handlePowerSwitch(sw.id, i)}
                              aria-pressed={switched}
                              aria-label={`Activate ${sw.label}`}
                            >
                              <img
                                src={
                                  switched
                                    ? POWER_TOGGLE_ON_SRC
                                    : POWER_TOGGLE_OFF_SRC
                                }
                                alt=""
                                draggable={false}
                                decoding="async"
                              />
                            </button>
                            <button
                              type="button"
                              className={[
                                'lp-pwr-cover',
                                coverOpen ? 'lp-pwr-cover--open' : '',
                                state === 'ready' ? 'lp-pwr-cover--ready' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              disabled={state !== 'ready'}
                              onClick={() => handlePowerCover(sw.id, i)}
                              aria-expanded={coverOpen}
                              aria-label={`Open protective cover, ${sw.label}`}
                            >
                              <img
                                src={POWER_COVER_SRC}
                                alt=""
                                draggable={false}
                                decoding="async"
                              />
                            </button>
                          </div>
                        )}
                        <div
                          className="lp-pwr-bar"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(fill)}
                          aria-label={`${sw.label} charge`}
                        >
                          <div
                            className="lp-pwr-bar__fill"
                            style={{ transform: `scaleX(${fill / 100})` }}
                          />
                          <span className="lp-pwr-bar__readout">
                            {Math.round(fill)}%
                          </span>
                        </div>
                        <p className="lp-pwr-bay__state">{stateLabel}</p>
                      </div>
                    )
                  })}
                </div>

                {autoPower && (
                  <div className="lp-power-term__master">
                    <button
                      type="button"
                      className="btn btn--primary lp-master-on"
                      onClick={handleMasterPowerOn}
                      disabled={powerSwitched.length > 0}
                      aria-label="Master power ON"
                    >
                      ON
                    </button>
                  </div>
                )}

                <p className="lp-power-term__status" aria-live="polite">
                  {powerStatusLine()}
                </p>
              </div>
            </div>
          </div>
        )}

        {stepComplete && (
          <div className="lp-panel lp-panel--complete">
            <p className="lp-panel__title">Launch preparation complete</p>
            <p className="lp-panel__hint">
              Vehicle is stacked, fueled, and powered. Proceed to Launch
              sequence.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
