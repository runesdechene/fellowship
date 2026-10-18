/**
 * QUOI     — la bande « Ton copilote de saison » : le grand paragraphe, l'écran Calendrier et,
 *            qui déborde dessous, le Tableau de bord.
 * POURQUOI — maquette 2290:2 (bande 2290:96, texte 2290:100) : l'outil d'abord.
 * ATTENTION — sans festival à venir, les écrans se cachent ; le paragraphe reste.
 */
import type { Showcase } from '@/lib/landing'
import { LandingBand } from './LandingBand'
import { CalendarScreen } from './screens/CalendarScreen'
import { DashboardScreen } from './screens/DashboardScreen'

export function AssistantBand({ showcase }: { showcase: Showcase | null }) {
  const hasDates = showcase?.months.some((m) => m.events.length > 0) ?? false
  return (
    <LandingBand tone="paper" slant="rise" id="assistant" className="landing-assistant">
      <p className="landing-statement landing-assistant__text">
        <strong>Ton copilote de saison.</strong> Ta saison annuelle sur une frise, tes dossiers et
        tes paiements à jour, ton calendrier en direct sur ton site.
      </p>
      {showcase && hasDates && (
        <div className="landing-assistant__shots">
          <CalendarScreen months={showcase.months} />
          <DashboardScreen dossiers={showcase.dossiers} />
        </div>
      )}
    </LandingBand>
  )
}
