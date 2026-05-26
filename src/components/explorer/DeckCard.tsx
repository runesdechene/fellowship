import { useState } from 'react'
import { getTagIcon } from '@/components/ui/TagBadge'
import type { StatusChip } from '@/lib/explorer'
import type { EventWithScore } from '@/types/database'

interface DeckCardProps {
  event: EventWithScore
  style: React.CSSProperties
  isCenter: boolean
  canAddImage: boolean
  badge?: 'nouveau' | 'populaire' | null
  statusChip?: StatusChip | null
  onClick: () => void
  onAddImage: (event: EventWithScore) => void
}

export function DeckCard({ event, style, isCenter, canAddImage, badge, statusChip, onClick, onAddImage }: DeckCardProps) {
  const tag = event.tags?.[0] ?? 'autre'
  const Icon = getTagIcon(tag)
  // Track (imageUrl, errorFlag) together so we can reset error when URL changes
  // without needing useEffect — pure render-time derivation (getDerivedStateFromProps pattern).
  const [tracked, setTracked] = useState<{ url: string | null; error: boolean }>({
    url: event.image_url ?? null,
    error: false,
  })
  // If image_url changed since last render, reset error in-flight (React allows setState during
  // render as long as it's guarded by a condition and returns immediately).
  if (tracked.url !== (event.image_url ?? null)) {
    setTracked({ url: event.image_url ?? null, error: false })
  }
  const showImg = !!event.image_url && !tracked.error
  const imageless = !event.image_url || tracked.error
  // Le dim de profondeur (assombrir nuit / éclaircir jour) ne s'applique qu'à l'AFFICHE,
  // pas aux overlays (tag « Repéré », badge) qui doivent garder leurs vraies couleurs.
  const { filter, ...rootStyle } = style
  return (
    <div className={'card' + (isCenter ? ' is-center' : '')} style={rootStyle} onClick={onClick}>
      {statusChip && (
        <span className={'card-status ' + statusChip.variant}>{statusChip.label}</span>
      )}
      {badge && (
        <span className={'card-badge ' + badge}>
          {badge === 'nouveau' ? '✨  Nouveau' : '🔥 Populaire'}
        </span>
      )}
      <div className="card-media" style={{ filter }}>
        <div className="card-fallback">
          <span className="card-fallback-glow" aria-hidden="true" />
          {/* eslint-disable-next-line react-hooks/static-components -- Icon is from TAG_ICONS static lookup, ref is stable */}
          <Icon className="card-fallback-ico" aria-hidden="true" />
        </div>
        {showImg && (
          <img
            src={event.image_url!}
            alt={event.name}
            loading={isCenter ? 'eager' : 'lazy'}
            onError={() => setTracked(t => ({ ...t, error: true }))}
          />
        )}
      </div>
      {isCenter && canAddImage && imageless && (
        <button
          type="button"
          className="card-addimg"
          onClick={(e) => { e.stopPropagation(); onAddImage(event) }}
        >
          ＋ Ajouter une image
        </button>
      )}
    </div>
  )
}
