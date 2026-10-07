import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from '@/components/notifications/NotificationItem'

/** Cloche de notifications + dropdown. Auto-suffisante (possède ses hooks et
 *  son click-outside), réutilisée par la navbar (SearchBar) ET le flotteur des
 *  pages immersives (FloatingActions). */
export function NotifBell() {
  const { personalNotifs, personalUnread, markAsRead, markAllAsRead } = useNotifications()
  const followingIds = useFollowingIds()
  const [bellOpen, setBellOpen] = useState(false)
  const [bellSnapshot, setBellSnapshot] = useState<Set<string>>(new Set())
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="notif-bell-wrapper" ref={bellRef}>
      <button
        className="notif-bell-btn"
        onClick={() => {
          setBellOpen(prev => {
            const next = !prev
            if (next) {
              setBellSnapshot(new Set(personalNotifs.filter(n => !n.read).map(n => n.id)))
              if (personalUnread > 0) markAllAsRead()
            }
            return next
          })
        }}
      >
        <Bell strokeWidth={1.5} />
        {personalUnread > 0 && (
          <span className="notif-bell-badge">
            {personalUnread > 9 ? '9+' : personalUnread}
          </span>
        )}
      </button>

      {bellOpen && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span className="notif-dropdown-title">Notifications</span>
          </div>
          {personalNotifs.length === 0 ? (
            <p className="notif-dropdown-empty">Aucune notification</p>
          ) : (
            <div className="notif-dropdown-list">
              {personalNotifs.slice(0, 8).map(n => {
                const data = (n.data ?? {}) as Record<string, unknown>
                const actorId = typeof data.actor_id === 'string' ? data.actor_id : undefined
                return (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    isFriend={!!actorId && followingIds.has(actorId)}
                    onRead={markAsRead}
                    compact
                    forceUnreadStyle={bellSnapshot.has(n.id)}
                  />
                )
              })}
            </div>
          )}
          <Link
            to="/notifications"
            className="notif-dropdown-see-all"
            onClick={() => setBellOpen(false)}
          >
            Voir toutes les notifications →
          </Link>
        </div>
      )}
    </div>
  )
}
