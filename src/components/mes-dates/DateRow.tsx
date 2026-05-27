import { Link } from 'react-router-dom'
import { getTagIcon } from '@/components/ui/TagBadge'
import { participationChip, type ActorKind } from '@/lib/explorer'
import { avatarGradient } from '@/lib/avatar-gradient'
import { cn } from '@/lib/utils'
import type { ParticipationWithEvent } from '@/types/database'
import type { FriendParticipation } from '@/hooks/use-participations'

interface DateRowProps {
  participation: ParticipationWithEvent
  actorKind: ActorKind
  now: Date
  companions: FriendParticipation[]   // compagnons (abonnés) sur cet événement
  onOpenCompanions: (eventId: string, eventName: string) => void
}

const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export function DateRow({ participation, actorKind, now, companions, onOpenCompanions }: DateRowProps) {
  const ev = participation.events
  const start = new Date(ev.start_date)
  const end = new Date(ev.end_date)
  const multiDay =
    end.getDate() !== start.getDate() ||
    end.getMonth() !== start.getMonth() ||
    end.getFullYear() !== start.getFullYear()
  const tag = ev.tags?.[0] ?? 'autre'
  const Icon = getTagIcon(tag)
  const chip = participationChip(participation.status, participation.payment_status, actorKind, { isPast: end < now })

  return (
    <div className="md-row">
      {/* Lien « stretched » : couvre toute la carte pour le clic/clavier, sans imbriquer le bouton compagnons. */}
      <Link to={`/evenement/${ev.id}`} className="md-row-link" aria-label={ev.name} />

      <div className="md-date">
        <b>{start.getDate()}</b>
        <span>{WEEKDAYS[start.getDay()]}</span>
        {multiDay && <span className="md-range">→ {end.getDate()}</span>}
      </div>

      {ev.image_url && (
        <div className="md-thumb"><img src={ev.image_url} alt="" /></div>
      )}

      <div className="md-info">
        <b>{ev.name}</b>
        <div className="md-meta">
          {/* eslint-disable-next-line react-hooks/static-components -- Icon vient du lookup statique TAG_ICONS, réf stable (cf. HeroBanner) */}
          <Icon size={13} strokeWidth={2} className="inline -mt-px" /> {ev.city} ({ev.department})
        </div>
        {companions.length > 0 && (
          <button
            type="button"
            className="md-companions"
            onClick={() => onOpenCompanions(ev.id, ev.name)}
            aria-label={`Voir les ${companions.length} compagnon${companions.length > 1 ? 's' : ''} sur ${ev.name}`}
          >
            <div className="md-avs">
              {companions.slice(0, 4).map((c, i) => {
                const nm = c.actor_public?.label ?? '?'
                const url = c.actor_public?.avatar_url
                return (
                  <span key={c.actor_id} className="md-av" style={{ background: url ? 'transparent' : avatarGradient(nm), zIndex: 4 - i }}>
                    {url ? <img src={url} alt={nm} /> : nm[0].toUpperCase()}
                  </span>
                )
              })}
            </div>
            <span>{companions.length} compagnon{companions.length > 1 ? 's' : ''} y {companions.length > 1 ? 'vont' : 'va'}</span>
          </button>
        )}
      </div>

      {chip && (
        <div className="md-status">
          <span className={cn('md-badge', chip.variant)}><span className="md-dot" /> {chip.label}</span>
        </div>
      )}
    </div>
  )
}
