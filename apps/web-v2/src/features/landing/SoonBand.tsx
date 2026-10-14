/**
 * QUOI     — la bande « Bientôt · Pro », sur le papier : tes dossiers en un clic ou presque
 *            (l'inscription en un clic, le PDF qui se remplit), puis Fellowship qui fait la veille.
 * POURQUOI — maquette 2290:2 (bande 2290:98) ; l'assistant se présente par ses résultats, jamais
 *            par le mot « IA » (vault, 14/10/2026). Le remplissage d'abord : la demande est prouvée.
 * ATTENTION — ces fonctions n'existent pas encore : le sceau « Bientôt · Pro » le dit.
 */
import type { Showcase } from '@/lib/landing'
import { LandingBand } from './LandingBand'
import { HuntScreen } from './screens/HuntScreen'
import { OneClickCard } from './screens/OneClickCard'
import { PdfSheet } from './screens/PdfSheet'

const Seal = () => <span className="landing-seal">Bientôt · Pro</span>

export function SoonBand({ showcase }: { showcase: Showcase | null }) {
  return (
    <LandingBand tone="paper" slant="rise" id="bientot" className="landing-soon">
      <div className="landing-soon__dossiers">
        <div className="landing-soon__text">
          <Seal />
          <p className="landing-statement landing-statement--s">
            <strong>Tes dossiers, en un clic ou presque.</strong> Si l’orga du festival utilise
            Fellowship, tu t’inscris en un clic. S’il envoie un PDF, tu le déposes : ton assistant y
            reporte ton enseigne, ton SIRET, ton stand. Tu relis, tu envoies.
          </p>
        </div>
        {showcase?.oneClick && <OneClickCard event={showcase.oneClick} />}
        {showcase?.pdf && <PdfSheet event={showcase.pdf} />}
      </div>
      <div className="landing-soon__hunt">
        {showcase && showcase.recent.length > 0 && <HuntScreen recent={showcase.recent} />}
        <div className="landing-soon__text">
          <Seal />
          <p className="landing-statement">
            <strong>Fellowship fait la veille des festivals.</strong> Il parcourt le web, ajoute de
            nouvelles dates et te recommande celles qui te ressemblent.
          </p>
        </div>
      </div>
    </LandingBand>
  )
}
