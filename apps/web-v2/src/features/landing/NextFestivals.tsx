/**
 * QUOI     — « Les prochains festivals » : cinq vraies dates à venir, à l'affiche, avec « Populaire »
 *            ou « Nouveau » dans le coin.
 * POURQUOI — maquette 2104:40 ; la sélection est une fonction pure (lib/landing.ts), testée.
 * ATTENTION — sans date (lecture ratée ou aucune à venir), la section disparaît. Les cartes et
 *            « Voir tout l'annuaire » mènent à la connexion jusqu'à l'annuaire public (lot 11b).
 */
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PosterArt } from '@/components/ui/PosterArt'
import { formatDateRange } from '@/lib/dates'
import type { LandingFestival } from '@/lib/landing'

export function NextFestivals({ festivals }: { festivals: LandingFestival[] | null }) {
  if (!festivals || festivals.length === 0) return null

  return (
    <section className="landing-section landing-festivals" id="festivals">
      <header className="landing-festivals__head">
        <div>
          <h2 className="landing-festivals__title">Les prochains festivals</h2>
          <p className="landing-festivals__lead">
            Ajoutés et tenus à jour par les exposants eux-mêmes
          </p>
        </div>
        <Link className="landing-festivals__all" to="/connexion">
          Voir tout l’annuaire
          <ArrowRight size={14} strokeWidth={2} aria-hidden />
        </Link>
      </header>
      <ul className="landing-festivals__row">
        {festivals.map((festival) => (
          <li key={festival.id}>
            <Link className="landing-festival" to="/connexion">
              <PosterArt
                imageUrl={festival.imageUrl}
                tags={festival.tags}
                startDate={festival.startDate}
                daysAway={0}
                friends={[]}
                badge={festival.badge}
              />
              <span className="landing-festival__text">
                <span className="landing-festival__name">{festival.name}</span>
                <span className="landing-festival__meta">
                  {formatDateRange(festival.startDate, festival.endDate)} · {festival.place}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
