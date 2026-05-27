import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useCommunityFeed } from '@/hooks/use-community'
import { ConvergenceCard } from './ConvergenceCard'
import { ActivityItem } from './ActivityItem'

export function CommunauteTeaser() {
  const { feed, convergences } = useCommunityFeed()
  const preview = feed.slice(0, 3)
  return (
    <div className="comm-teaser">
      <div className="comm-teaser-feed" aria-hidden="true">
        {convergences[0] && <ConvergenceCard conv={convergences[0]} />}
        {preview.map(item => <ActivityItem key={item.id} item={item} />)}
      </div>
      <div className="comm-teaser-veil">
        <div className="comm-teaser-cta">
          <div className="comm-teaser-lock"><Lock strokeWidth={1.5} /></div>
          <h2>Vois où va ta tribu</h2>
          <p>Le fil de ton réseau — convergences, avis, nouvelles dates de tes compagnons.</p>
          <Link to="/reglages" className="btn btn-p">Passer en Pro — dès 9,99 € HT/mois</Link>
        </div>
      </div>
    </div>
  )
}
