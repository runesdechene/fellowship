/**
 * QUOI     — le panneau de la cloche : « Tout marquer comme lu », puis les notifications groupées
 *            Aujourd'hui / Cette semaine / Plus tôt.
 * POURQUOI — maquette « Notifications ». Une notification non lue porte un fond et un point ; un
 *            clic la marque lue et mène où elle parle.
 * ATTENTION — « Régler mes notifications » attend les Réglages (lot 9) : pas de lien vers rien.
 */
import {
  MessageCircle,
  MessageCircleReply,
  RefreshCw,
  Star,
  User,
  type LucideIcon,
} from 'lucide-react'
import { timeAgo } from '@/lib/dates'
import { useTransitionNavigate } from '@/lib/navigation'
import { groupByDay, type NotificationIcon, type NotificationView } from '@/lib/notifications'

const ICONS: Record<NotificationIcon, LucideIcon> = {
  question: MessageCircle,
  reply: MessageCircleReply,
  star: Star,
  friend: User,
  follow: User,
  update: RefreshCw,
}

interface NotificationPanelProps {
  views: NotificationView[]
  failed: boolean
  onRead: (id: string) => void
  onReadAll: () => void
  onClose: () => void
}

export function NotificationPanel({
  views,
  failed,
  onRead,
  onReadAll,
  onClose,
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
      </div>
      {failed && (
        <p className="notif-panel__empty">Tes notifications n’ont pas pu être chargées.</p>
      )}
      {!failed && groups.length === 0 && (
        <p className="notif-panel__empty">Rien de neuf pour l’instant.</p>
      )}
      {groups.map((group) => (
        <section key={group.label}>
          <h3 className="notif-panel__day">{group.label}</h3>
          {group.items.map((view) => {
            const Icon = ICONS[view.icon]
            return (
              <button
                key={view.id}
                type="button"
                className={view.read ? 'notif' : 'notif notif--unread'}
                onClick={() => {
                  if (!view.read) onRead(view.id)
                  onClose()
                  go(view.href)
                }}
              >
                <span className="notif__icon">
                  <Icon size={16} strokeWidth={1.8} />
                </span>
                <span className="notif__body">
                  <span className="notif__text">
                    <b>{view.lead}</b>
                    {view.rest}
                  </span>
                  <span className="notif__time">{timeAgo(view.at, now)}</span>
                </span>
                {!view.read && <span className="notif__dot" aria-label="Non lue" />}
              </button>
            )
          })}
        </section>
      ))}
    </div>
  )
}
