import type { ProcessStep } from '../types/process'

/**
 * Small rudimentary glyph per process step kind — shared so Gemba's stepper
 * nav and the Redesign workshop's tab nav read as the same visual language.
 */
export function StepIcon({ kind }: { kind: ProcessStep['kind'] }) {
  if (kind === 'manufacture') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <polygon points="16.06,6.5 10,3 3.94,6.5 3.94,13.5 10,17 16.06,13.5" />
        <circle cx="10" cy="10" r="2" />
      </svg>
    )
  }
  if (kind === 'haul') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <polygon points="8,3 12,3 17,18 3,18" />
        <line x1="10" y1="4.5" x2="10" y2="17" strokeDasharray="2 2" />
      </svg>
    )
  }
  if (kind === 'launch-prep') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3c0 0 5 6.2 5 10a5 5 0 1 1-10 0c0-3.8 5-10 5-10z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <polygon points="10,2 13,9 13,16 10,19 7,16 7,9" />
      <polygon points="7,13 4,18 7,16" />
      <polygon points="13,13 16,18 13,16" />
      <circle cx="10" cy="8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}
