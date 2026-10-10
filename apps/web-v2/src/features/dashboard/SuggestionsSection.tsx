/**
 * QUOI     — le bloc « Pour toi » : 3 festivals proches de ceux que l'exposant fait, chacun avec
 *            sa raison et « Pas pour moi » ; en gratuit, le nombre trouvé sous le voile du Pro.
 * POURQUOI — lot 8d, maquettes 2206:2 (Pro) et 2206:340 (gratuit). Rien à proposer, ou une
 *            lecture ratée : le bloc ne s'affiche pas.
 */
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ProBadge } from '@/components/ui/ProBadge'
import { ProVeil } from '@/components/ui/ProVeil'
import { useAuth } from '@/lib/auth'
import { formatDateRange, parseSqlDate } from '@/lib/dates'
import { useTransitionNavigate } from '@/lib/navigation'
import { foundLabel, reasonText, type Suggestion } from '@/lib/suggestions'
import { usePlan } from '@/lib/usePlan'
import { useSuggestions } from './useSuggestions'

/** Les cartes sous le voile gratuit : de fausses, le gratuit n'a pas les vraies. */
const PLACEHOLDERS = ['a', 'b', 'c']

interface CardProps {
  item: Suggestion
  leaving: boolean
  onDismiss: () => void
}

function SuggestionCard({ item, leaving, onDismiss }: CardProps) {
  const go = useTransitionNavigate()
  const dates = formatDateRange(parseSqlDate(item.startDate), parseSqlDate(item.endDate))

  return (
    <article className={leaving ? 'suggestion suggestion--leaving' : 'suggestion'}>
      <button
        type="button"
        className="suggestion__open"
        onClick={() => go(`/evenement/${item.eventId}`)}
      >
        {item.imageUrl ? (
          <img className="suggestion__poster" src={item.imageUrl} alt="" />
        ) : (
          <span className="suggestion__poster" />
        )}
        <span className="suggestion__body">
          <span className="suggestion__name">{item.name}</span>
          <span className="suggestion__meta">{item.city ? `${dates} · ${item.city}` : dates}</span>
          <span className="suggestion__reason">{reasonText(item.reason)}</span>
        </span>
      </button>
      <button type="button" className="suggestion__dismiss" onClick={onDismiss} disabled={leaving}>
        Pas pour moi
      </button>
    </article>
  )
}

export function SuggestionsSection() {
  const { actor } = useAuth()
  const { pro } = usePlan()
  const { suggestions, dismiss } = useSuggestions(actor?.id)
  const go = useTransitionNavigate()
  // Une carte écartée s'efface aussitôt et le reste jusqu'à la relecture, qui ne la rend plus
  // et la remplace par la suivante. Si l'écriture échoue, elle revient.
  const [gone, setGone] = useState<string[]>([])

  if (!suggestions || suggestions.count === 0) return null
  if (pro && suggestions.items.length === 0) return null

  async function refuse(eventId: string) {
    setGone((ids) => [...ids, eventId])
    try {
      await dismiss(eventId)
    } catch {
      setGone((ids) => ids.filter((id) => id !== eventId))
    }
  }

  return (
    <section className="dashboard__section">
      <h2 className="dashboard__section-title">Pour toi</h2>
      <p className="dashboard__section-note">
        Des festivals proches de ceux que tu fais, trouvés par Fellowship
      </p>
      {pro ? (
        <div className="suggestions">
          {suggestions.items.map((item) => (
            <SuggestionCard
              key={item.eventId}
              item={item}
              leaving={gone.includes(item.eventId)}
              onDismiss={() => void refuse(item.eventId)}
            />
          ))}
        </div>
      ) : (
        <ProVeil
          invitation={
            <div className="suggestions__invite">
              <div className="suggestions__invite-text">
                <ProBadge />
                <p className="suggestions__invite-title">{foundLabel(suggestions.count)}</p>
                <p className="suggestions__invite-note">
                  Proches de ceux que tu fais, dans ta zone. Le Pro te les montre, et te prévient
                  quand il en trouve un nouveau.
                </p>
              </div>
              <Button variant="action" onClick={() => go('/pro')}>
                Découvrir le Pro
                <ArrowRight size={14} strokeWidth={2} />
              </Button>
            </div>
          }
        >
          <div className="suggestions">
            {PLACEHOLDERS.map((key) => (
              <span key={key} className="suggestion suggestion--placeholder" />
            ))}
          </div>
        </ProVeil>
      )}
    </section>
  )
}
