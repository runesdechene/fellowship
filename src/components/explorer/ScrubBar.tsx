import { useRef, useState, useCallback } from 'react'

interface ScrubBarProps {
  count: number
  index: number
  /** Noms des festivals (pour l'aperçu au survol/drag). */
  labels?: string[]
  onScrub: (i: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
}

/**
 * Barre de navigation rapide (scrubber) : clic = saut direct, clic-glissé = scrub continu,
 * survol = aperçu fantôme du festival visé. L'autoplay est mis en pause via onScrubStart/End.
 */
export function ScrubBar({ count, index, labels, onScrub, onScrubStart, onScrubEnd }: ScrubBarProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const idxFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current
    if (!el || count <= 1) return 0
    const rect = el.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(frac * (count - 1))
  }, [count])

  if (count <= 1) return null

  const pct = (i: number) => (i / (count - 1)) * 100
  const pos = pct(index)
  const tipIdx = dragging ? index : hoverIdx
  const tipPos = tipIdx != null ? pct(tipIdx) : null

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setDragging(true)
    onScrubStart?.()
    onScrub(idxFromClientX(e.clientX))
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const i = idxFromClientX(e.clientX)
    setHoverIdx(i)
    if (dragging) onScrub(i)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return
    ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
    setDragging(false)
    onScrubEnd?.()
  }

  return (
    <div className="scrubber">
      <div
        ref={trackRef}
        className={'scrub-track' + (dragging ? ' is-dragging' : '')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { if (!dragging) setHoverIdx(null) }}
        role="slider"
        aria-label="Naviguer dans les festivals"
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={index + 1}
      >
        <div className="scrub-fill" style={{ width: pos + '%' }} />
        {hoverIdx != null && !dragging && (
          <span className="scrub-ghost" style={{ left: pct(hoverIdx) + '%' }} />
        )}
        <span className="scrub-handle" style={{ left: pos + '%' }} />
        {tipIdx != null && tipPos != null && (
          <span className="scrub-tip" style={{ left: tipPos + '%' }}>
            <b>{tipIdx + 1}</b>
            {labels?.[tipIdx] ? ' · ' + labels[tipIdx] : ''}
          </span>
        )}
      </div>
    </div>
  )
}
