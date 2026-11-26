/**
 * QUOI     — la landing publique : ce qu'un visiteur sans compte voit sur `/`, et tout le monde
 *            sur `/decouvrir`.
 * POURQUOI — maquette validée par Uriel le 26/11/2026 : fond papier, aplats sans bordure,
 *            l'application à côté de la promesse. Elle parle aux exposants.
 */
import { LandingFaq } from '@/features/landing/LandingFaq'
import { LandingFoot } from '@/features/landing/LandingFoot'
import { OrganizersBox } from '@/features/landing/OrganizersBox'
import { useTestimonials } from '@/features/landing/useTestimonials'
import { DiscoverNav } from './DiscoverNav'
import { FeatureGrid } from './FeatureGrid'
import { FinalPitch } from './FinalPitch'
import { Helper } from './Helper'
import { Hero } from './Hero'
import { Letter } from './Letter'
import { Manifesto } from './Manifesto'
import { Pricing } from './Pricing'
import { Quote } from './Quote'

export function DiscoverPage() {
  const [first, second] = useTestimonials()

  return (
    <div className="discover">
      <DiscoverNav />
      <main>
        <Hero />
        <Manifesto />
        <FeatureGrid />
        {first && <Quote testimonial={first} />}
        <Helper />
        <Letter />
        {second && <Quote testimonial={second} />}
        <Pricing />
        <div id="questions" className="discover-faq">
          <LandingFaq />
        </div>
        <FinalPitch />
      </main>
      <div className="discover-foot">
        <LandingFoot tagline="La première plateforme des exposants et des entreprises nomades.">
          <OrganizersBox />
        </LandingFoot>
      </div>
    </div>
  )
}
