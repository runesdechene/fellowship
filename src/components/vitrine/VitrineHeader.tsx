import { UserPlus, Check, Share2, QrCode, Pencil, Link2 } from 'lucide-react'
import { avatarGradient } from '@/lib/avatar-gradient'
import { linkHost } from '@/lib/vitrine'
import { isCertified } from '@/lib/navModel'
import { CertifiedBadge } from '@/components/ui/CertifiedBadge'
import { VitrineSocialStrip } from './VitrineSocialStrip'
import type { EntityRow, VitrineLink } from '@/types/database'
import type { NetworkMember } from '@/lib/profile-network'

interface Props {
  entity: EntityRow
  canEdit: boolean
  isFollowing: boolean
  followers: NetworkMember[]
  friends: NetworkMember[]
  onEdit?: () => void
  onToggleFollow?: () => void
  onOpenSocial?: () => void
  onShare: () => void
  onQR: () => void
}

export function VitrineHeader({ entity, canEdit, isFollowing, followers, friends, onEdit, onToggleFollow, onOpenSocial, onShare, onQR }: Props) {
  const location = (entity as { location?: string | null }).location ?? entity.city
  const subtitle = [entity.craft_type, location].filter(Boolean).join(' · ')
  const initials = entity.brand_name.split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase()
  const link = ((entity.links as unknown as VitrineLink[]) ?? [])[0]

  return (
    <>
      <header className="v-head">
        <div className="v-av" style={!entity.avatar_url ? { background: avatarGradient(entity.brand_name) } : undefined}>
          {entity.avatar_url ? <img src={entity.avatar_url} alt={entity.brand_name} /> : <span className="v-av-fallback">{initials}</span>}
        </div>
        <div className="v-id">
          <div className="v-brand">{entity.brand_name}{isCertified(entity) && <CertifiedBadge size="md" />}</div>
          {subtitle && <div className="v-sub">{subtitle}</div>}
        </div>
        <div className="v-act">
          {canEdit ? (
            <button type="button" className="v-btn v-btn-p" onClick={() => onEdit?.()}><Pencil /> Modifier</button>
          ) : onToggleFollow && (
            <button type="button" className={`v-btn ${isFollowing ? 'v-btn-o is-on' : 'v-btn-p'}`} onClick={onToggleFollow} aria-pressed={isFollowing}>
              {isFollowing ? <Check /> : <UserPlus />}<span>{isFollowing ? 'Suivi' : 'Suivre'}</span>
            </button>
          )}
          <button type="button" className="v-iconbtn" title="Partager" onClick={onShare} aria-label="Partager"><Share2 /></button>
          <button type="button" className="v-iconbtn" title="QR / lien" onClick={onQR} aria-label="QR Code"><QrCode /></button>
        </div>
      </header>

      {entity.bio && <p className="v-punch">{entity.bio}</p>}
      {link && (
        <a className="v-biolink" href={link.url} target="_blank" rel="noopener noreferrer">
          <Link2 /> {linkHost(link.url)}
        </a>
      )}
      <VitrineSocialStrip followers={followers} friends={friends} onOpen={onOpenSocial} />
    </>
  )
}
