/**
 * QUOI     — la bande des témoignages, sur le papier, entre le Pro et le pied de page : le premier
 *            en grand paragraphe, les autres en deux colonnes, chacun signé de son avatar.
 * POURQUOI — Uriel, 14/10/2026 : « On a de super témoignages ». Juste après le prix, ils répondent
 *            à « est-ce que ça vaut le coup ? » avant le dernier appel ; le papier garde
 *            l'alternance des bandes (terre, papier, nuit).
 * ATTENTION — les mots sont ceux des exposants, saisis en admin : on ne les réécrit pas.
 */
import { Avatar } from '@/components/ui/Avatar'
import type { Testimonial } from '@/lib/testimonials'
import { LandingBand } from './LandingBand'

function Voice({ voice, className }: { voice: Testimonial; className: string }) {
  return (
    <figure className={className}>
      <blockquote>
        <strong>{voice.lead}</strong> {voice.rest}
      </blockquote>
      <figcaption className="landing-voice__who">
        <Avatar src={voice.avatarUrl} name={voice.name} className="landing-voice__face" />
        <span>
          <strong>{voice.name}</strong>
          <small>{voice.craft}</small>
        </span>
      </figcaption>
    </figure>
  )
}

export function VoicesBand({ testimonials }: { testimonials: Testimonial[] }) {
  const [first, ...others] = testimonials
  if (!first) return null
  return (
    <LandingBand tone="paper" slant="rise" id="temoignages" className="landing-voices">
      <Voice voice={first} className="landing-voice landing-voice--lead" />
      <div className="landing-voices__others">
        {others.map((v) => (
          <Voice key={v.id} voice={v} className="landing-voice" />
        ))}
      </div>
    </LandingBand>
  )
}
