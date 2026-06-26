import { Link } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { useNetworkActivityMini } from '@/hooks/use-community'
import { avatarColor, type FeedItem } from '@/lib/community'
import { avatarImgStyle } from './ActorLinks'

function miniText(item: FeedItem): string {
  if (item.kind === 'review') return `a noté ${item.event?.name ?? ''}`
  if (item.kind === 'participation') return `va à ${item.event?.name ?? ''}`
  if (item.kind === 'event_created') return `a ajouté ${item.event?.name ?? ''}`
  return `suit ${item.target?.label ?? ''}`
}

export function SidebarNetworkActivity({ collapsed }: { collapsed: boolean }) {
  const { currentActor, currentActorRow } = useAuth()
  const isPro = planForActor(currentActor, currentActorRow) === 'pro'
  // Perf : on ne lance le feed réseau que pour un Pro avec sidebar déployée (pas sur chaque page pour tous).
  const items = useNetworkActivityMini(isPro && !collapsed)

  // Pas de teaser réseau pour les non-Pro : on ne montre rien (les gens n'ont pas à savoir).
  if (!isPro) return null

  if (collapsed) {
    return <Link to="/communaute" className="sa-bell" aria-label="Activité du réseau"><Activity strokeWidth={1.5} /></Link>
  }

  if (items.length === 0) return null

  return (
    <div className="side-activity">
      <div className="sa-head"><span className="live" /> <span>Activité du réseau</span></div>
      {items.map(item => (
        <Link key={item.id} to="/communaute" className="sa-item">
          <span className="sav" style={item.actor.avatarUrl ? undefined : { background: avatarColor(item.actor.label) }}>
            {item.actor.avatarUrl ? <img src={item.actor.avatarUrl} alt="" style={avatarImgStyle} /> : item.actor.label[0]?.toUpperCase()}
          </span>
          <span className="sat"><b>{item.actor.label}</b> {miniText(item)}</span>
        </Link>
      ))}
      <Link to="/communaute" className="sa-all">Tout voir →</Link>
    </div>
  )
}
