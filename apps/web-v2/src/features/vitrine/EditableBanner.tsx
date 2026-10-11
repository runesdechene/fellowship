/**
 * QUOI     — la bannière en mode édition : « Changer la bannière » (choisir une image) et
 *            « Glisser pour recadrer » (la faire glisser verticalement).
 * POURQUOI — lot 6b, maquette 2231:2 et note de la maquette d'origine : « la bannière se recadre en
 *            la faisant glisser, en mode édition ». La position (0–100) vit dans `banner_position`.
 * ATTENTION — le glissé capture le pointeur (setPointerCapture) : il continue même si la souris
 *            sort de la bannière, et marche au doigt comme à la souris.
 */
import { Camera, MoveVertical } from 'lucide-react'
import { useRef, useState, type CSSProperties } from 'react'
import { bannerPositionFrom } from '@/lib/vitrine-edit'

interface EditableBannerProps {
  src: string | null
  position: number
  onPosition: (position: number) => void
  onPick: (file: File) => void
}

export function EditableBanner({ src, position, onPosition, onPick }: EditableBannerProps) {
  const input = useRef<HTMLInputElement>(null)
  const drag = useRef<{ y: number; start: number; travel: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div
      className={
        dragging
          ? 'vitrine-head__banner edit-banner edit-banner--dragging'
          : 'vitrine-head__banner edit-banner'
      }
      onPointerDown={(event) => {
        if (!src || (event.target as HTMLElement).closest('button')) return
        event.currentTarget.setPointerCapture(event.pointerId)
        // La course utile : la part de l'image qui dépasse, au plus la hauteur de la bannière.
        drag.current = {
          y: event.clientY,
          start: position,
          travel: event.currentTarget.clientHeight,
        }
        setDragging(true)
      }}
      onPointerMove={(event) => {
        if (!drag.current) return
        onPosition(
          bannerPositionFrom(
            drag.current.start,
            event.clientY - drag.current.y,
            drag.current.travel,
          ),
        )
      }}
      onPointerUp={() => {
        drag.current = null
        setDragging(false)
      }}
      onPointerCancel={() => {
        drag.current = null
        setDragging(false)
      }}
    >
      {src && (
        <img
          className="vitrine-head__banner-image"
          src={src}
          alt=""
          draggable={false}
          style={{ '--banner-y': `${String(position)}%` } as CSSProperties}
        />
      )}
      <div className="edit-banner__actions">
        <button
          type="button"
          className="edit-pill"
          onClick={() => {
            input.current?.click()
          }}
        >
          <Camera size={14} strokeWidth={2} />
          Changer la bannière
        </button>
        {src && (
          <span className="edit-pill edit-pill--hint">
            <MoveVertical size={14} strokeWidth={2} />
            Glisser pour recadrer
          </span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onPick(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}
