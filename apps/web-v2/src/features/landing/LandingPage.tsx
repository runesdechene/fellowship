/**
 * QUOI     — la landing publique de la V2 : ce qu'un visiteur sans compte voit sur `/`.
 * POURQUOI — lot 11a (spec 2026-10-14-v2-landing-design.md) : la vitrine de la V2, qui deviendra
 *            celle de flw.sh à la bascule (lot 12).
 * ATTENTION — un composant par section de la maquette `2027 — Landing`, dans son ordre.
 */
import { Features } from './Features'
import { FinalCall } from './FinalCall'
import { Hero } from './Hero'
import { LandingTopBar } from './LandingTopBar'
import { NextFestivals } from './NextFestivals'
import { TypeMarquee } from './TypeMarquee'
import { useLanding } from './useLanding'
import { WhyFellowship } from './WhyFellowship'

export function LandingPage() {
  const { tags, festivals } = useLanding()

  return (
    <div className="landing">
      {/* La photo de marché provisoire court sous la barre et l'accroche (maquette 2105:5). */}
      <div className="landing-top">
        <LandingTopBar />
        <Hero />
      </div>
      <main>
        <TypeMarquee tags={tags} />
        <NextFestivals festivals={festivals} />
        <WhyFellowship />
        <Features />
      </main>
      <FinalCall />
    </div>
  )
}
