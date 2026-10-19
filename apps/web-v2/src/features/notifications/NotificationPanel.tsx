/**
 * QUOI     — le panneau de la cloche : « Tout marquer comme lu », puis les notifications groupées
 *            Aujourd'hui / Cette semaine / Plus tôt.
 * POURQUOI — maquette « Notifications ». Une notification non lue porte un fond et un point ; un
 *            clic la marque lue et mène où elle parle.
 *            En tête, le bloc « Demandes d'ami · Nouveaux abonnés » (NetworkBlock), quand il a à dire.
 *            Une personne montre son visage, une date son affiche ; sans image, l'icône (Uriel,
 *            19/10/2026). Sur téléphone, il prend toute la page et se ferme par sa croix (Uriel, 19/10/2026).
 * ATTENTION — le pied (PanelFoot) mène aux Réglages et propose d'activer le téléphone (lot 8e).
 */
import {
  CalendarPlus,
  Clock,
  Repeat2,
  MessageCircle,
  MessageCircleReply,
  RefreshCw,
  Star,
  Sparkles,
  Telescope,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/dates'
import { posterThumb } from '@/lib/poster-thumb'
import { useTransitionNavigate } from '@/lib/navigation'
import { groupByDay, type NotificationIcon, type NotificationView } from '@/lib/notifications'
import { PanelFoot } from './PanelFoot'

const ICONS: Record<NotificationIcon, LucideIcon> = {
  question: MessageCircle,
  reply: MessageCircleReply,
  star: Star,
  friend: User,
  follow: User,
  update: RefreshCw,
  edition: CalendarPlus,
  deadline: Clock,
  explore: Telescope,
  suggestion: Sparkles,
}

interface NotificationPanelProps {
  views: NotificationView[]
  failed: boolean
  onRead: (id: string) => void
  onReadAll: () => void
  onClose: () => void
  /** Le bloc des demandes d'ami et des nouveaux abonnés, posé en tête ; null s'il est vide. */
  network: ReactNode
  /** « Repérer » : rend vrai si la date est posée. */
  onMark: (ownerId: string, eventId: string) => Promise<boolean>
}

/** Le bouton « Repérer » d'une nouvelle édition : il agit sans ouvrir la fiche. */
function MarkButton({
  ownerId,
  eventId,
  onMark,
}: {
  ownerId: string
  eventId: string
  onMark: NotificationPanelProps['onMark']
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'failed'>('idle')
  return (
    <button
      type="button"
      className="notif__action"
      disabled={state === 'saving' || state === 'done'}
      onClick={(click) => {
        click.stopPropagation()
        setState('saving')
        void onMark(ownerId, eventId).then((ok) => {
          setState(ok ? 'done' : 'failed')
        })
      }}
    >
      <Star size={12} strokeWidth={2} />
      {state === 'done' ? 'Repérée' : state === 'failed' ? 'Réessayer' : 'Repérer'}
    </button>
  )
}

export function NotificationPanel({
  views,
  failed,
  onRead,
  onReadAll,
  onClose,
  onMark,
  network,
}: NotificationPanelProps) {
  const go = useTransitionNavigate()
  const now = new Date()
  const groups = groupByDay(views, now)

  return (
    <div className="notif-panel" role="dialog" aria-label="Notifications">
      <div className="notif-panel__head">
        <h2 className="notif-panel__title">Notifications</h2>
        {views.some((view) => !view.read) && (
          <button type="button" className="notif-panel__all" onClick={onReadAll}>
            Tout marquer comme lu
          </button>
        )}
        <button
          type="button"
          className="notif-panel__close"
          aria-label="Fermer les notifications"
          onClick={onClose}
        >
          <X size={20} strokeWidth={1.75} />
        </button>
      </div>
      {network}
      {failed && (
        <p className="notif-panel__empty">Tes notifications n’ont pas pu être chargées.</p>
      )}
      {!failed && !network && groups.length === 0 && (
        <p className="notif-panel__empty">Rien de neuf pour l’instant.</p>
      )}
      {groups.map((group) => (
        <section key={group.label}>
          <h3 className="notif-panel__day">{group.label}</h3>
          {group.items.map((view) => {
            const Icon = ICONS[view.icon]
            const open = () => {
              if (!view.read) onRead(view.id)
              onClose()
              go(view.href)
            }
            return (
              // Une ligne, pas un bouton : elle peut contenir le bouton « Repérer ».
              <div key={view.id} className={view.read ? 'notif' : 'notif notif--unread'}>
                {view.picture?.kind === 'avatar' ? (
                  <Avatar
                    className="notif__avatar"
                    src={view.picture.url}
                    name={view.picture.name}
                  />
                ) : view.picture?.url ? (
                  <img className="notif__poster" src={posterThumb(view.picture.url, 120)} alt="" />
                ) : (
                  <span className="notif__icon">
                    <Icon size={16} strokeWidth={1.8} />
                  </span>
                )}
                <span className="notif__body">
                  {view.eyebrow && (
                    <span className="notif__eyebrow">
                      <Repeat2 size={12} strokeWidth={2} />
                      {view.eyebrow}
                    </span>
                  )}
                  <button type="button" className="notif__open" onClick={open}>
                    {view.text.map((part, index) =>
                      typeof part === 'string' ? part : <b key={index}>{part.strong}</b>,
                    )}
                  </button>
                  <span className="notif__meta">
                    <span className="notif__time">{timeAgo(view.at, now)}</span>
                    {view.action && (
                      <MarkButton
                        ownerId={view.ownerId}
                        eventId={view.action.eventId}
                        onMark={onMark}
                      />
                    )}
                  </span>
                </span>
                {!view.read && <span className="notif__dot" aria-label="Non lue" />}
              </div>
            )
          })}
        </section>
      ))}
      <PanelFoot onClose={onClose} />
    </div>
  )
}
