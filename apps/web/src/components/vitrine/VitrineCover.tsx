import { useState, useRef } from 'react'
import { Move, Check, X } from 'lucide-react'

interface Props {
  url: string | null
  /** Point focal vertical en % (0 = haut, 100 = bas). Défaut 50. */
  position?: number | null
  canEdit?: boolean
  onReposition?: (pos: number) => void
}

export function VitrineCover({ url, position, canEdit, onReposition }: Props) {
  const initial = position ?? 50
  const [editing, setEditing] = useState(false)
  const [pos, setPos] = useState(initial)
  const drag = useRef<{ startY: number; startPos: number; h: number } | null>(null)

  function onPointerDown(e: React.PointerEvent<HTMLImageElement>) {
    if (!editing) return
    const h = e.currentTarget.clientHeight || 300
    drag.current = { startY: e.clientY, startPos: pos, h }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent<HTMLImageElement>) {
    if (!drag.current) return
    const d = drag.current
    const delta = ((e.clientY - d.startY) / d.h) * 100
    setPos(Math.min(100, Math.max(0, d.startPos - delta)))
  }
  function onPointerUp() { drag.current = null }

  function start() { setPos(initial); setEditing(true) }
  function save() { onReposition?.(Math.round(pos)); setEditing(false) }
  function cancel() { setPos(initial); setEditing(false) }

  return (
    <div className={`v-cover ${editing ? 'is-repositioning' : ''}`}>
      {url ? (
        <img
          src={url} alt="" draggable={false}
          style={{ objectPosition: `center ${editing ? pos : initial}%` }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        />
      ) : (
        <div className="v-cover-fallback" aria-hidden="true" />
      )}

      {canEdit && url && !editing && (
        <button type="button" className="v-cover-reposition" onClick={start} title="Repositionner la bannière" aria-label="Repositionner la bannière">
          <Move />
        </button>
      )}
      {editing && (
        <>
          <div className="v-cover-hint">Glisse l'image pour la repositionner</div>
          <div className="v-cover-tools">
            <button type="button" className="v-cover-ok" onClick={save} aria-label="Valider le cadrage"><Check /></button>
            <button type="button" className="v-cover-cancel" onClick={cancel} aria-label="Annuler"><X /></button>
          </div>
        </>
      )}
    </div>
  )
}
