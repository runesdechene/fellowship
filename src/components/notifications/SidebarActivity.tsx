import { Link } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import type { NotificationData } from '@/types/database'

const SA_COLORS = ['#3d9970', '#f0a060', '#6c5ce7', '#e84393', '#f39c12']
function saColor(name: string): string {
  let h = 0; for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return SA_COLORS[Math.abs(h) % SA_COLORS.length]
}

function activityText(type: string, data: NotificationData): { name: string; action: string } {
  const actor = data.actor_name ?? data.friend_name ?? data.follower_name
  const event = data.event_name ?? 'un événement'
  switch (type) {
    case 'event_created':
      return { name: actor ?? 'Quelqu\'un', action: `a ajouté ${event}` }
    case 'event_image_added':
      return { name: actor ?? 'Photo', action: `ajoutée sur ${event}` }
    case 'event_info_added':
      return { name: actor ?? 'Info', action: `ajoutée sur ${event}` }
    case 'new_exposant':
      return { name: actor ?? 'Un exposant', action: 'a rejoint Fellowship !' }
    default:
      return { name: actor ?? 'Activité', action: event }
  }
}

export function SidebarActivity({ collapsed }: { collapsed: boolean }) {
  const { activities, markAsRead } = useNotifications()
  const recent = activities.slice(0, 3)

  if (collapsed) {
    return <Link to="/notifications" className="sa-bell" aria-label="Activité"><Activity strokeWidth={1.5} /></Link>
  }
  if (recent.length === 0) return null

  return (
    <div className="side-activity">
      <div className="sa-head"><span className="live" /> <span>Activité du réseau</span></div>
      {recent.map(a => {
        const data = (a.data ?? {}) as NotificationData
        const { name, action } = activityText(a.type, data)
        return (
          <Link key={a.id} to="/notifications" className="sa-item" onClick={() => markAsRead(a.id)}>
            <span className="sav" style={{ background: saColor(name) }}>{name[0]?.toUpperCase() ?? '?'}</span>
            <span className="sat"><b>{name}</b> {action}</span>
          </Link>
        )
      })}
      <Link to="/notifications" className="sa-all">Tout voir →</Link>
    </div>
  )
}
