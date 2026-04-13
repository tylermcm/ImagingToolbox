import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface ViewportControlSection {
  id: string
  label: string
  icon: ReactNode
  content: ReactNode
}

interface ViewportControlAction {
  id: string
  label: string
  icon: ReactNode
  onClick: () => void
}

interface ViewportControlDockProps {
  sections: ViewportControlSection[]
  actions?: ViewportControlAction[]
}

export function ViewportControlDock({
  sections,
  actions = [],
}: ViewportControlDockProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  const activeSection = useMemo(
    () => sections.find((section) => section.id === openSectionId) ?? null,
    [openSectionId, sections],
  )

  useEffect(() => {
    if (!openSectionId) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (
        target instanceof Node &&
        containerRef.current?.contains(target)
      ) {
        return
      }

      setOpenSectionId(null)
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [openSectionId])

  return (
    <div className="floating-controls" ref={containerRef}>
      <div className="floating-control-rail" role="tablist" aria-label="Viewport controls">
        {sections.map((section) => {
          const isActive = section.id === openSectionId

          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-label={section.label}
              aria-selected={isActive}
              aria-expanded={isActive}
              aria-controls={`floating-panel-${section.id}`}
              className={`floating-control-trigger ${isActive ? 'active' : ''}`}
              title={section.label}
              onClick={() =>
                setOpenSectionId((current) =>
                  current === section.id ? null : section.id,
                )
              }
            >
              <span className="floating-control-icon" aria-hidden="true">
                {section.icon}
              </span>
            </button>
          )
        })}

        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            aria-label={action.label}
            className="floating-control-trigger floating-control-action"
            title={action.label}
            onClick={() => {
              setOpenSectionId(null)
              action.onClick()
            }}
          >
            <span className="floating-control-icon" aria-hidden="true">
              {action.icon}
            </span>
          </button>
        ))}
      </div>

      {activeSection ? (
        <div
          id={`floating-panel-${activeSection.id}`}
          role="tabpanel"
          className="floating-control-panel"
        >
          {activeSection.content}
        </div>
      ) : null}
    </div>
  )
}
