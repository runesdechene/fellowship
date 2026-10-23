/**
 * QUOI     — la bande Copilote : la comparaison « huit endroits → une seule app », puis le grand
 *            paragraphe, l'écran Calendrier et, qui déborde dessous, le Tableau de bord.
 * POURQUOI — maquette 2458:2329 (23/10/2026) : la douleur, puis l'outil qui la règle.
 * ATTENTION — sans festival à venir, les écrans se cachent ; le paragraphe reste. Les écrans se
 *            placent dans `landing-assistant__body`, pas dans toute la bande.
 */
import type { Showcase } from '@/lib/landing'
import { LandingBand } from './LandingBand'
import { CalendarScreen } from './screens/CalendarScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { ToolsCompare } from './ToolsCompare'

export function AssistantBand({ showcase }: { showcase: Showcase | null }) {
  const hasDates = showcase?.months.some((m) => m.events.length > 0) ?? false
  return (
    <LandingBand tone="paper" slant="rise" id="assistant" className="landing-assistant">
      <ToolsCompare />
      <div className="landing-assistant__body">
        <p className="landing-statement landing-assistant__text">
          <strong>Ton copilote de festivals.</strong> Ta saison annuelle sur une frise, tes dossiers
          et tes paiements à jour, ton calendrier en direct sur ton site.
        </p>
        {showcase && hasDates && (
          <div className="landing-assistant__shots">
            <CalendarScreen months={showcase.months} />
            <DashboardScreen dossiers={showcase.dossiers} />
          </div>
        )}
      </div>
    </LandingBand>
  )
}
