import { useEffect, useState } from 'react'
import type { ProcessStepKind } from '../types/process'
import { getGembaContext } from '../data/gembaContext'

interface GembaContextPanelProps {
  stepId: string
  stepKind: ProcessStepKind
}

/**
 * A vertical tab pinned to the right edge of the viewport (Gemba-only) that
 * expands into a narrative "what is this step simulating" panel and
 * collapses back to just the tab. Purely explanatory — no state here is
 * read by or written to As-is, Redesign, To-be, or the Data tab.
 */
export function GembaContextPanel({
  stepId,
  stepKind,
}: GembaContextPanelProps) {
  const [open, setOpen] = useState(false)
  const context = getGembaContext(stepId, stepKind)

  // Collapse on step change so the panel never lingers open showing
  // context for a step the learner has already left.
  useEffect(() => {
    setOpen(false)
  }, [stepId])

  if (!context) return null

  return (
    <div
      className={
        open ? 'gemba-context gemba-context--open' : 'gemba-context'
      }
    >
      {open && (
        <aside
          id="gemba-context-panel"
          className="gemba-context__panel"
          aria-labelledby="gemba-context-heading"
        >
          <div className="gemba-context__panel-header">
            <h3 id="gemba-context-heading">{context.title}</h3>
            <button
              type="button"
              className="gemba-context__close"
              onClick={() => setOpen(false)}
              aria-label="Hide context panel"
            >
              ×
            </button>
          </div>
          <img
            src={`${import.meta.env.BASE_URL}${context.imageSrc}`}
            alt={context.imageAlt}
            className="gemba-context__image"
            decoding="async"
          />
          {context.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </aside>
      )}
      <button
        type="button"
        className="gemba-context__tab"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="gemba-context-panel"
      >
        <span className="gemba-context__tab-label">
          {open ? 'Hide' : 'Context'}
        </span>
      </button>
    </div>
  )
}
