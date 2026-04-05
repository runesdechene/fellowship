import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from './NotificationItem'
import './SidebarActivity.css'

interface SidebarActivityProps {
  collapsed: boolean
  onShowAll: () => void
}

export function SidebarActivity({ collapsed, onShowAll }: SidebarActivityProps) {
  const { notifications, unreadCount, markAsRead } = useNotifications()
  const followingIds = useFollowingIds()
  const recent = notifications.slice(0, 4)

  if (collapsed) {
    return (
      <button onClick={onShowAll} className="activity-bell-btn">
        <Bell strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="activity-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="activity-container">
      <div className="activity-header">
        <Bell strokeWidth={1.5} />
        <span className="activity-label">Activité</span>
        {unreadCount > 0 && (
          <span className="activity-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      {recent.length === 0 ? (
        <p className="activity-empty">Aucune activité récente</p>
      ) : (
        <div className="activity-list">
          {recent.map(n => {
            const data = (n.data ?? {}) as Record<string, unknown>
            const actorId = typeof data.actor_id === 'string' ? data.actor_id : undefined
            return (
              <NotificationItem
                key={n.id}
                notification={n}
                isFriend={!!actorId && followingIds.has(actorId)}
                onRead={markAsRead}
                compact
              />
            )
          })}
        </div>
      )}
      <button onClick={onShowAll} className="activity-show-all">
        Voir tout →
      </button>
    </div>
  )
}
