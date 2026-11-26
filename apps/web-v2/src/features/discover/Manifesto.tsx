/**
 * QUOI     — ce qu'est Fellowship, en une grande phrase, trois chiffres lus en base, et la recherche
 *            des festivals, sans compte.
 * POURQUOI — maquette du 26/11/2026 : la page dit pour qui elle est (les exposants).
 */
import { LandingSearch } from '@/features/landing/LandingSearch'
import { useCounts } from './useCounts'

export function Manifesto() {
  const counts = useCounts()
  const stats = counts && [
    { value: counts.events, label: 'festivals référencés' },
    { value: counts.upcoming, label: 'festivals à venir' },
    { value: counts.exhibitors, label: 'exposants inscrits' },
  ]

  return (
    <section className="discover-manifesto">
      <p className="discover-manifesto__statement">
        <strong>Fellowship est ton copilote de festivals.</strong> Ta saison annuelle sur une frise,
        tes dossiers et tes paiements à jour, ton calendrier en direct sur ton site, et ton réseau
        de collègues qui grandit.
      </p>
      {stats && (
        <ul className="discover-stats">
          {stats.map(({ value, label }) => (
            <li key={label}>
              <span className="discover-stats__value">{value.toLocaleString('fr-FR')}</span>
              {label}
            </li>
          ))}
        </ul>
      )}
      <div className="discover-search">
        <LandingSearch />
      </div>
      <p className="discover-manifesto__since">Plateforme lancée publiquement en novembre 2026.</p>
    </section>
  )
}
