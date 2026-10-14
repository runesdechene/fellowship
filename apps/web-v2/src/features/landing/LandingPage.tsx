/**
 * QUOI     — la landing publique de la V2 : ce qu'un visiteur sans compte voit sur `/`, et tout le
 *            monde sur `/decouvrir`.
 * POURQUOI — lot 11c (spec 2026-10-14-v2-landing-11c-design.md) : la maquette validée 2290:2,
 *            vivante — chaque élément vient de la base, seul l'exposant est une démonstration.
 * ATTENTION — l'ordre des bandes est celui de la maquette ; elles s'emboîtent de biais.
 */
import { FinalCall } from './FinalCall'
import { LandingTopBar } from './LandingTopBar'
import { useLandingShowcase } from './useLandingShowcase'

export function LandingPage() {
  const showcase = useLandingShowcase()
  const posters = showcase?.wall ?? []

  return (
    <div className="landing">
      <div className="landing-opening">
        <LandingTopBar />
      </div>
      <main />
      <FinalCall posters={posters} />
    </div>
  )
}
