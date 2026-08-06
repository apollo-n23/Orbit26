import { APP_VIEWS, type AppView } from '../types/views'

interface ViewNavProps {
  activeView: AppView
  onChangeView: (view: AppView) => void
}

export function ViewNav({ activeView, onChangeView }: ViewNavProps) {
  return (
    <nav className="view-nav" aria-label="Primary views">
      {APP_VIEWS.map((view) => {
        const isActive = view.id === activeView
        return (
          <button
            key={view.id}
            type="button"
            className={`view-nav__item${isActive ? ' view-nav__item--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChangeView(view.id)}
          >
            {view.label}
          </button>
        )
      })}
    </nav>
  )
}
