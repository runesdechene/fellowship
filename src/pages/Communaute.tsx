import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { markSeenNow } from '@/lib/community-seen'
import { useCommunityFeed } from '@/hooks/use-community'
import { useFollowingSet } from '@/hooks/use-follows'
import { filterBySegment, type Segment } from '@/lib/community'
import { ConvergenceCard } from '@/components/community/ConvergenceCard'
import { ActivityItem } from '@/components/community/ActivityItem'
import { ConvergenceList } from '@/components/community/ConvergenceList'
import { SuggestionsCard } from '@/components/community/SuggestionsCard'
import { CommunauteTeaser } from '@/components/community/CommunauteTeaser'
import './Communaute.css'

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'tout', label: 'Tout' },
  { key: 'ou-ils-vont', label: 'Où ils vont' },
  { key: 'avis', label: 'Avis' },
  { key: 'reseau', label: 'Réseau' },
]

function CommunauteEmpty() {
  return (
    <div className="comm-empty">
      <div className="comm-empty-icon">🧭</div>
      <h2>Ton réseau est encore discret</h2>
      <p>Suis des compagnons sur Explorer pour voir où va ton monde, ce qu'ils en disent et où vous vous croiserez.</p>
      <Link to="/explorer" className="btn btn-p">Découvrir des exposants</Link>
    </div>
  )
}

export function CommunautePage() {
  const { currentActor, currentActorRow } = useAuth()
  const isPro = planForActor(currentActor, currentActorRow) === 'pro'

  useEffect(() => {
    if (currentActor) markSeenNow(currentActor.id)
  }, [currentActor])
  const { feed, convergences, suggestions, loading, error } = useCommunityFeed()
  const { following, follow } = useFollowingSet()
  const [segment, setSegment] = useState<Segment>('tout')

  const visible = useMemo(() => filterBySegment(feed, segment), [feed, segment])
  const isFollowed = (id: string) => following.has(id)

  if (!isPro) {
    return (
      <div className="comm-page">
        <div className="comm-head"><h1>Communauté</h1>
          <div className="comm-sub">Ce que vit ta tribu, et les nouveaux festivals sur Fellowship.</div>
        </div>
        <CommunauteTeaser />
      </div>
    )
  }

  return (
    <div className="comm-page">
      <div className="comm-head">
        <h1>Communauté</h1>
        <div className="comm-sub">Ce que vit ta tribu, et les nouveaux festivals sur Fellowship.</div>
        <div className="comm-segs">
          {SEGMENTS.map(s => (
            <button key={s.key} className={`seg ${segment === s.key ? 'on' : ''}`} onClick={() => setSegment(s.key)}>{s.label}</button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="comm-empty"><p>Impossible de charger le fil. Réessaie.</p></div>
      ) : loading ? (
        <div className="comm-feed">{[0, 1, 2].map(i => <div key={i} className="act comm-skel" />)}</div>
      ) : feed.length === 0 && convergences.length === 0 ? (
        <CommunauteEmpty />
      ) : (
        <div className="comm-grid">
          <div className="comm-feed">
            {segment !== 'avis' && segment !== 'reseau' && convergences[0] && (
              <ConvergenceCard conv={convergences[0]} />
            )}
            {visible.map(item => (
              <ActivityItem key={item.id} item={item} isFollowed={item.target ? isFollowed(item.target.actorId) : false} onFollow={follow} />
            ))}
            {visible.length === 0 && <div className="comm-empty-inline">Rien dans cette catégorie pour l'instant.</div>}
          </div>
          <aside className="comm-side">
            <ConvergenceList items={convergences} />
            <SuggestionsCard items={suggestions} isFollowed={isFollowed} onFollow={follow} />
          </aside>
        </div>
      )}
    </div>
  )
}
