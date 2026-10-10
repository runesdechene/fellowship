/**
 * QUOI     — l'écran Communauté : titre, filtres (dans l'adresse), « Ça se rassemble », le fil
 *            groupé par jour, et à droite « Où vous vous croiserez » et « À suivre ».
 * POURQUOI — lot 9a, maquette 2212:2 : d'abord ce que vit la tribu, ensuite agrandir son réseau.
 *            L'écran n'invente rien : useCommunity lit, lib/community.ts dit.
 */
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  canFollow,
  feedFor,
  gatheringOf,
  readTab,
  type CommunityTab,
  type FeedLine,
  type FeedPerson,
} from '@/lib/community'
import { groupByDay } from '@/lib/notifications'
import { CrossingCard } from './CrossingCard'
import { FeedItem } from './FeedItem'
import { Gathering } from './Gathering'
import { ToFollowCard } from './ToFollowCard'
import { useCommunity } from './useCommunity'

const TABS: { key: CommunityTab; label: string }[] = [
  { key: 'tout', label: 'Tout' },
  { key: 'ou', label: 'Où ils vont' },
  { key: 'avis', label: 'Avis' },
  { key: 'reseau', label: 'Réseau' },
]

/** Le compte que Suivre ajouterait sur cette ligne : l'arrivant, ou le compte suivi. */
function followTarget(line: FeedLine): FeedPerson | null {
  if (line.kind === 'arrival') return line.who
  if (line.kind === 'follow') return line.target
  return null
}

/** Une page par compte : changer d'enseigne repart de zéro, jamais avec le réseau de l'autre. */
export function CommunityPage() {
  const { actor } = useAuth()
  return <CommunityScreen key={actor?.id ?? ''} />
}

function CommunityScreen() {
  const { actor, person, entities } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = readTab(params.get('voir'))
  const { lines, crossing, toFollow, followed, loading, error, follow, mark } = useCommunity(
    actor?.id,
  )
  const own = useMemo(
    () =>
      new Set([...entities.map((entity) => entity.actor_id), ...(person ? [person.actor_id] : [])]),
    [entities, person],
  )

  const now = new Date()
  // Après une lecture ratée, rien d'ancien ne reste à l'écran : seul le message parle.
  const gathering = !error && (tab === 'tout' || tab === 'ou') ? gatheringOf(lines) : null
  const groups = groupByDay(feedFor(lines, tab), now)

  function choose(next: CommunityTab) {
    setParams(next === 'tout' ? {} : { voir: next }, { replace: true })
  }

  function followable(line: FeedLine): FeedPerson | null {
    const target = followTarget(line)
    return target && canFollow(target.id, followed, own) ? target : null
  }

  return (
    <div className="community">
      <header className="community__header">
        <h1 className="community__title">Communauté</h1>
        <p className="community__lead">
          Ce que vit ta tribu, et les nouveaux festivals sur Fellowship.
        </p>
        <div className="community__tabs" role="group" aria-label="Filtrer le fil">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={key === tab ? 'community__tab community__tab--on' : 'community__tab'}
              aria-pressed={key === tab}
              onClick={() => choose(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="community__body">
        <div className="community__feed">
          {gathering && <Gathering line={gathering} onMark={mark} />}
          {error ? (
            <p className="community__note">La communauté n’a pas pu être chargée.</p>
          ) : loading ? null : groups.length === 0 ? (
            <p className="community__note">Suis des exposants pour voir ce qu’ils préparent.</p>
          ) : (
            groups.map((group) => (
              <section key={group.label} className="community__day">
                <h2 className="community__day-label">{group.label}</h2>
                <ul className="community__list">
                  {group.items.map((line) => (
                    <FeedItem
                      key={line.id}
                      line={line}
                      now={now}
                      followable={followable(line)}
                      onFollow={(id) => void follow(id)}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <aside className="community__side">
          {!error && <CrossingCard crossing={crossing} />}
          {!error && (
            <ToFollowCard
              accounts={toFollow}
              followed={followed}
              onFollow={(id) => void follow(id)}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
