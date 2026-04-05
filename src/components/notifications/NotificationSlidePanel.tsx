import { useEffect } from 'react'
import { ArrowLeft, Check, BellOff } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from './NotificationItem'
import './NotificationSlidePanel.css'

interface NotificationSlidePanelProps {
  onClose: () => void
}

export function NotificationSlidePanel({ onClose }: NotificationSlidePanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const followingIds = useFollowingIds()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="notif-panel">
      {/* Header */}
      <div className="notif-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} className="notif-back-btn">
            <ArrowLeft strokeWidth={1.5} />
          </button>
          <span className="notif-panel-title">Notifications</span>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="notif-mark-all-btn">
            <Check strokeWidth={2} />
            Tout lire
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="notif-panel-list">
        {notifications.length === 0 ? (
          <div className="notif-empty">
            <BellOff className="notif-empty-icon" strokeWidth={1} />
            <p className="notif-empty-text">Aucune notification</p>
          </div>
        ) : (
          <div className="notif-panel-items">
            {notifications.map(n => {
              const data = (n.data ?? {}) as Record<string, unknown>
              const actorId = typeof data.actor_id === 'string' ? data.actor_id : undefined
              return (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  isFriend={!!actorId && followingIds.has(actorId)}
                  onRead={markAsRead}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
