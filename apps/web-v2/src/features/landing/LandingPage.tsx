/**
 * QUOI     — la landing publique de la V2 : ce qu'un visiteur sans compte voit sur `/`.
 * POURQUOI — lot 11a (spec 2026-10-14-v2-landing-design.md) : la vitrine de la V2, qui deviendra
 *            celle de flw.sh à la bascule (lot 12).
 * ATTENTION — un composant par section de la maquette `2027 — Landing`, dans son ordre.
 */
import { FinalCall } from './FinalCall'
import { LandingTopBar } from './LandingTopBar'

export function LandingPage() {
  return (
    <div className="landing">
      <LandingTopBar />
      <main />
      <FinalCall />
    </div>
  )
}
