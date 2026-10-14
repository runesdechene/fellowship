/**
 * QUOI     — la landing publique de la V2 : ce qu'un visiteur sans compte voit sur `/`, et tout le
 *            monde sur `/decouvrir`.
 * POURQUOI — lot 11c (spec 2026-10-14-v2-landing-11c-design.md) : la maquette validée 2290:2,
 *            vivante — chaque élément vient de la base, seul l'exposant est une démonstration.
 * ATTENTION — l'ordre des bandes est celui de la maquette ; elles s'emboîtent de biais. Les
 *            témoignages ne sont pas une bande : un bouton flottant ouvre leurs stories (2332:2).
 */
import { AssistantBand } from './AssistantBand'
import { CommunityBand } from './CommunityBand'
import { FinalCall } from './FinalCall'
import { LandingTopBar } from './LandingTopBar'
import { Opening } from './Opening'
import { ProBand } from './ProBand'
import { SoonBand } from './SoonBand'
import { Stories } from './Stories'
import { useTestimonials } from './useTestimonials'
import { useLandingShowcase } from './useLandingShowcase'

export function LandingPage() {
  const showcase = useLandingShowcase()
  const testimonials = useTestimonials()
  const posters = showcase?.wall ?? []

  return (
    <div className="landing">
      <LandingTopBar />
      <Opening showcase={showcase} />
      <main>
        <AssistantBand showcase={showcase} />
        <CommunityBand showcase={showcase} />
        <SoonBand showcase={showcase} />
        <ProBand showcase={showcase} />
      </main>
      <FinalCall posters={posters} />
      <Stories testimonials={testimonials} />
    </div>
  )
}
