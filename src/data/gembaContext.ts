import type { ProcessStepKind } from '../types/process'

/** Narrative "why does this step exist" copy for the Gemba Context panel. */
export interface GembaContextEntry {
  title: string
  paragraphs: string[]
  /** Illustrative image filename (public/), rendered above the paragraphs. */
  imageSrc: string
  imageAlt: string
}

/**
 * Keyed by process step id first (most specific — lets two steps of the
 * same kind ever diverge), with a kind-level fallback below so a future
 * step reusing an existing kind still gets sensible copy without a data
 * update. Gemba-only: this narrative framing has no bearing on As-is,
 * Redesign, or To-be, and isn't read by any of them.
 */
const GEMBA_CONTEXT_BY_STEP_ID: Record<string, GembaContextEntry> = {
  'manufacture-booster': {
    title: 'Manufacture booster',
    imageSrc: 'AssemblyStep.png',
    imageAlt: 'The booster moving through Orb-it’s assembly line stations',
    paragraphs: [
      "The booster is the main body of the rocket — the tall metal shell with engines at the base that lifts everything off the ground. Orb-it doesn't build that shell from scratch: an unfinished booster arrives from an outside supplier, and this station is where Orb-it finishes it and makes it safe to fly.",
      "You're moving that supplier-built booster along Orb-it's assembly line, station by station. Each machine performs a distinct check or modification — shaping the metal shell, welding its seams together, trimming away excess material, and fitting the final parts — so that by the time the booster leaves this line, it meets Orb-it's own safety and quality standards, not just the supplier's.",
      "Only once manufacture is complete does the booster move on to the haul road, and from there to the launch pad, where it will be joined with its payload — the satellites it's actually carrying — ahead of launch.",
    ],
  },
  'haul-road': {
    title: 'Haul road',
    imageSrc: 'PadStep.png',
    imageAlt: 'The booster travelling the haul road toward the launch pad',
    paragraphs: [
      "With manufacture complete, the finished booster has to physically travel from the assembly building to the launch pad. This step simulates that journey along Orb-it's haul road — a fixed route a ground crawler transporter follows at walking pace, carrying the booster upright.",
      "The road exists because this move isn't risk-free. Straying off the paved path is a real hazard here, not just a visual guardrail: a booster that leaves the safe zone suffers a Rapid Unplanned Disassembly — plain-English, that's an explosion — which Orb-it logs as a defect against that launch. Staying on the road costs only time.",
      "Reaching the far end of the road and mounting to the pad hands the booster off to the launch-prep crew, who attach its payload — the satellites it's carrying — and get it ready to fly.",
    ],
  },
  'prepare-for-launch': {
    title: 'Prepare for launch',
    imageSrc: 'PrepStep.png',
    imageAlt: 'The booster on the pad being mated, stacked, fuelled, and powered up',
    paragraphs: [
      "The booster is now sitting on the pad, but it's still just an empty shell. This step is where it becomes an actual mission: a crane connects it to the tall support arm that holds it upright against the launch tower, the satellites it's carrying (its payload) are lifted on top and connected, and the vehicle is filled with propellant and powered up.",
      "Each of these sub-tasks mirrors a real launch-prep concern. Propellant — the fuel and oxygen the engines burn together to produce thrust — has to be loaded close to launch time, since it isn't safe to leave the tanks full for long. Every onboard system also needs power before it can be checked out ahead of the countdown. Redesign investments in this area (faster pumps, one-touch power, a payload drone, a shorter connection to the tower) are about removing friction from these same physical steps, not changing what has to happen.",
      'Once the vehicle is connected to the tower, its payload is attached, and it is fuelled and powered, it is ready to be handed to mission control for the launch sequence itself.',
    ],
  },
  'launch-sequence': {
    title: 'Launch sequence',
    imageSrc: 'MissContStep.png',
    imageAlt: 'Mission control running the GO poll ahead of liftoff',
    paragraphs: [
      "This is mission control's final gate before ignition — the moment the engines are commanded to start. Each team on the GO poll (a roll-call where every station has to say \"GO\" before the countdown can continue) checks in one at a time: Guidance (confirms the rocket knows where it's headed), Propulsion (confirms the engines and fuel systems are ready), Avionics (confirms the onboard computers and electronics are ready), and — unless removed in the redesign — Weather (confirms conditions are safe to fly in), Capcom (the communications link to the vehicle), and Range Safety (watches the flight path and can stop the rocket if it strays somewhere dangerous). No single team can clear the launch alone — the same principle real launch control centres use.",
      "Turning and holding the ignition key is the last human action, deliberately kept separate from the GO poll so that clearing every team and actually committing to ignition are never the same click. Liftoff — the moment the rocket leaves the pad — follows immediately after. This is the step that turns four earlier stages of work into a satellite on its way to orbit.",
      'Because Weather, Capcom, and Range Safety can be removed in the To-be redesign, this is also where the licensing rules on the Regulation page become directly relevant: removing a station saves time, but not every one of them is equally safe to remove.',
    ],
  },
}

const GEMBA_CONTEXT_BY_KIND: Record<ProcessStepKind, GembaContextEntry> = {
  manufacture: GEMBA_CONTEXT_BY_STEP_ID['manufacture-booster'],
  haul: GEMBA_CONTEXT_BY_STEP_ID['haul-road'],
  'launch-prep': GEMBA_CONTEXT_BY_STEP_ID['prepare-for-launch'],
  'launch-sequence': GEMBA_CONTEXT_BY_STEP_ID['launch-sequence'],
}

export function getGembaContext(
  stepId: string,
  stepKind: ProcessStepKind,
): GembaContextEntry | null {
  return (
    GEMBA_CONTEXT_BY_STEP_ID[stepId] ?? GEMBA_CONTEXT_BY_KIND[stepKind] ?? null
  )
}
