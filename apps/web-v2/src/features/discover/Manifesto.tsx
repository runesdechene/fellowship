/**
 * QUOI     — ce qu'est Fellowship, en une grande phrase, et trois chiffres lus en base.
 * POURQUOI — maquette du 26/11/2026 : la page dit pour qui elle est (les exposants).
 */
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
        <strong>Fellowship est la première plateforme pensée pour les exposants.</strong> Artisans,
        créateurs et entreprises nomades y tiennent leur saison et leurs relations au même endroit.
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
    </section>
  )
}
