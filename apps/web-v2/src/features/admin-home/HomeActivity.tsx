/**
 * QUOI     — « Ce que font les gens » : dates suivies, fiches créées, avis et abonnements, le
 *            chiffre de la semaine et ses huit dernières semaines en courbe.
 * POURQUOI — la santé de l'application se lit dans ce que les gens y font, pas seulement dans
 *            leurs visites (maquette 2448:233).
 */
import { TrendLine, type TrendTone } from '@/components/ui/TrendLine'
import { HomeCard } from './HomeCard'
import type { HomeFigures } from './useAdminHome'

export function HomeActivity({ figures }: { figures: HomeFigures }) {
  const series: { label: string; weeks: number[]; tone: TrendTone }[] = [
    { label: 'Dates suivies', weeks: figures.dates_suivies, tone: 'bleu' },
    { label: 'Fiches créées', weeks: figures.fiches, tone: 'ocre' },
    { label: 'Avis écrits', weeks: figures.avis, tone: 'sauge' },
    { label: 'Abonnements', weeks: figures.abonnements, tone: 'prune' },
  ]
  return (
    <HomeCard title="Ce que font les gens" hint="les 8 dernières semaines">
      <div className="home-activity">
        {series.map(({ label, weeks, tone }) => (
          <div key={label} className="home-activity__item">
            <div className="home-activity__figure">
              <span className="home-activity__label">{label}</span>
              <span className="home-activity__value">{weeks.at(-1) ?? 0}</span>
              <span className="home-activity__unit">cette semaine</span>
            </div>
            <TrendLine values={weeks} label={`${label}, semaine par semaine`} tone={tone} />
          </div>
        ))}
      </div>
    </HomeCard>
  )
}
