/**
 * QUOI     — le panneau de la cloche : « Tout marquer comme lu », puis les notifications groupées
 *            Aujourd'hui / Cette semaine / Plus tôt.
 * POURQUOI — maquette « Notifications ». Une notification non lue porte un fond et un point ; un
 *            clic la marque lue et mène où elle parle.
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
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { timeAgo } from '@/lib/dates'
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
            const open = () => {
              if (!view.read) onRead(view.id)
              onClose()
              go(view.href)
            }
            return (
              // Une ligne, pas un bouton : elle peut contenir le bouton « Repérer ».
              <div key={view.id} className={view.read ? 'notif' : 'notif notif--unread'}>
                <span className="notif__icon">
                  <Icon size={16} strokeWidth={1.8} />
                </span>
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
