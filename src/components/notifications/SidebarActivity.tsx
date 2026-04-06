import { Link } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from './NotificationItem'
import './SidebarActivity.css'

interface SidebarActivityProps {
  collapsed: boolean
}

export function SidebarActivity({ collapsed }: SidebarActivityProps) {
  const { activities, markAsRead } = useNotifications()
  const followingIds = useFollowingIds()
  const recent = activities.slice(0, 3)

  if (collapsed) {
    return (
      <Link to="/notifications" className="activity-bell-btn">
        <Activity strokeWidth={1.5} />
      </Link>
    )
  }

  return (
    <div className="activity-container">
      <div className="activity-header">
        <Activity strokeWidth={1.5} />
        <span className="activity-label">Activité</span>
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
      <Link to="/notifications" className="activity-show-all">
        Voir tout →
      </Link>
    </div>
  )
}
