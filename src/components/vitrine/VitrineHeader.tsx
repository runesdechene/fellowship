import { BadgeCheck, UserPlus, Check, Share2, QrCode } from 'lucide-react'
import { avatarGradient } from '@/lib/avatar-gradient'
import { InlineText } from './edit/InlineText'
import { ChipEditor } from './edit/ChipEditor'
import { ImageDrop } from './edit/ImageDrop'
import type { EntityRow } from '@/types/database'

interface VitrineHeaderProps {
  entity: EntityRow
  isOwner: boolean
  isFollowing: boolean
  onToggleFollow?: () => void
  onShare: () => void
  onQR: () => void
  editing?: boolean
  onField?: (patch: Record<string, unknown>) => void
  onAvatar?: (file: File) => Promise<void>
}

export function VitrineHeader({
  entity, isOwner: _isOwner, isFollowing, onToggleFollow, onShare, onQR,
  editing, onField, onAvatar,
}: VitrineHeaderProps) {
  const subtitleParts: string[] = []
  if (entity.craft_type) subtitleParts.push(entity.craft_type)
  const geo = [entity.city, entity.department ? `(${entity.department})` : null].filter(Boolean).join(' ')
  if (geo) subtitleParts.push(geo)
  const subtitle = subtitleParts.join(' · ')

  const initials = entity.brand_name.split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase()

  return (
    <header className="v-head">
      <div className="v-av" style={!entity.avatar_url ? { background: avatarGradient(entity.brand_name) } : undefined}>
        {entity.avatar_url ? <img src={entity.avatar_url} alt={entity.brand_name} /> : <span className="v-av-fallback">{initials}</span>}
        {editing && onAvatar && <div className="v-av-edit"><ImageDrop label="" onPick={onAvatar} className="v-av-drop" /></div>}
      </div>

      <div className="v-id">
        <div className="v-brand">
          {editing && onField ? (
            <InlineText value={entity.brand_name} onCommit={v => onField({ brand_name: v || entity.brand_name })}>
              {entity.brand_name}
            </InlineText>
          ) : entity.brand_name}
          {entity.verified && <span className="v-verified" title="Exposant vérifié"><BadgeCheck /></span>}
        </div>

        {editing && onField ? (
          <div className="v-sub">
            <InlineText value={entity.craft_type ?? ''} placeholder="Métier" onCommit={v => onField({ craft_type: v || null })}>
              {entity.craft_type || <span className="v-edit-empty">+ métier</span>}
            </InlineText>
            {' · '}
            <InlineText value={entity.city ?? ''} placeholder="Ville" onCommit={v => onField({ city: v || null })}>
              {entity.city || <span className="v-edit-empty">+ ville</span>}
            </InlineText>
          </div>
        ) : subtitle && <div className="v-sub">{subtitle}</div>}

        {editing && onField ? (
          <ChipEditor values={entity.specialties} onChange={v => onField({ specialties: v })} />
        ) : entity.specialties.length > 0 && (
          <div className="v-chips">{entity.specialties.map(s => <span key={s} className="v-chip">{s}</span>)}</div>
        )}
      </div>

      <div className="v-act">
        {onToggleFollow && (
          <button type="button" className={`v-btn v-btn-follow ${isFollowing ? 'is-on' : 'v-btn-p'}`} onClick={onToggleFollow} aria-pressed={isFollowing}>
            {isFollowing ? <Check /> : <UserPlus />}<span>{isFollowing ? 'Suivi' : 'Suivre'}</span>
          </button>
        )}
        <button type="button" className="v-iconbtn" title="Partager" onClick={onShare} aria-label="Partager"><Share2 /></button>
        <button type="button" className="v-iconbtn" title="QR / lien" onClick={onQR} aria-label="QR Code"><QrCode /></button>
      </div>
    </header>
  )
}
