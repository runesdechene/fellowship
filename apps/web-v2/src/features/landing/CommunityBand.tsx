/**
 * QUOI     — la bande « Ma communauté d'exposants », sur la terre : l'écran Communauté, la fenêtre
 *            « Qui y va » qui le chevauche, et le grand paragraphe à droite.
 * POURQUOI — maquette 2290:2 (bande 2290:97, texte 2290:1315) : les gens, après l'outil.
 * ATTENTION — sans festival à venir, les écrans se cachent ; sans inscrit, « Qui y va » aussi.
 */
import type { Showcase } from '@/lib/landing'
import { LandingBand } from './LandingBand'
import { CommunityScreen } from './screens/CommunityScreen'
import { WhoGoesScreen } from './screens/WhoGoesScreen'

export function CommunityBand({ showcase }: { showcase: Showcase | null }) {
  return (
    <LandingBand
      tone="earth"
      slant="fall"
      id="communaute"
      posters={showcase?.wall}
      className="landing-community"
    >
      <p className="landing-statement landing-community__text">
        <strong>Ma communauté d’exposants.</strong> Ceux qui font les mêmes festivals que toi : où
        ils vont, ce qu’ils en pensent, et une discussion pour chaque date.
      </p>
      {showcase && showcase.dossiers.length > 0 && (
        <div className="landing-community__shots">
          <CommunityScreen showcase={showcase} />
          {showcase.crowd && (
            <WhoGoesScreen event={showcase.crowd.event} count={showcase.crowd.count} />
          )}
        </div>
      )}
    </LandingBand>
  )
}
