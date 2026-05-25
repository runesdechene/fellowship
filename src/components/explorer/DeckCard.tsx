import { getTagIcon } from '@/components/ui/TagBadge'
import type { EventWithScore } from '@/types/database'

interface DeckCardProps {
  event: EventWithScore
  style: React.CSSProperties
  isCenter: boolean
  canAddImage: boolean
  onClick: () => void
  onAddImage: (event: EventWithScore) => void
}

export function DeckCard({ event, style, isCenter, canAddImage, onClick, onAddImage }: DeckCardProps) {
  const tag = event.tags?.[0] ?? 'autre'
  const Icon = getTagIcon(tag)
  const hasImg = !!event.image_url
  return (
    <div className={'card' + (isCenter ? ' is-center' : '')} style={style} onClick={onClick}>
      {hasImg
        ? <img src={event.image_url!} alt={event.name} loading="lazy" />
        : (
          <div className="card-fallback">
            <span className="card-fallback-glow" aria-hidden="true" />
            {/* eslint-disable-next-line react-hooks/static-components -- Icon is from TAG_ICONS static lookup, ref is stable */}
            <Icon className="card-fallback-ico" aria-hidden="true" />
            {isCenter && canAddImage && (
              <button
                type="button"
                className="card-addimg"
                onClick={(e) => { e.stopPropagation(); onAddImage(event) }}
              >
                ＋ Ajouter une image
              </button>
            )}
          </div>
        )}
      <div className="grad" aria-hidden="true" />
    </div>
  )
}
