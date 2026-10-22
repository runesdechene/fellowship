/**
 * QUOI     — « Ce que font les gens » : dates suivies, fiches créées, avis et abonnements, le
 *            chiffre de la semaine et ses huit dernières semaines en barres.
 * POURQUOI — la santé de l'application se lit dans ce que les gens y font, pas seulement dans
 *            leurs visites (maquette 2448:233).
 */
import { BarStrip } from '@/components/ui/BarStrip'
import { HomeCard } from './HomeCard'
import type { HomeFigures } from './useAdminHome'

export function HomeActivity({ figures }: { figures: HomeFigures }) {
  const series = [
    { label: 'Dates suivies', weeks: figures.dates_suivies },
    { label: 'Fiches créées', weeks: figures.fiches },
    { label: 'Avis écrits', weeks: figures.avis },
    { label: 'Abonnements', weeks: figures.abonnements },
  ]
  return (
    <HomeCard title="Ce que font les gens" hint="les 8 dernières semaines">
      <div className="home-activity">
        {series.map(({ label, weeks }) => (
          <div key={label} className="home-activity__item">
            <div className="home-activity__figure">
              <span className="home-activity__label">{label}</span>
              <span className="home-activity__value">{weeks.at(-1) ?? 0}</span>
              <span className="home-activity__unit">cette semaine</span>
            </div>
            <BarStrip values={weeks} label={`${label}, semaine par semaine`} />
          </div>
        ))}
      </div>
    </HomeCard>
  )
}
