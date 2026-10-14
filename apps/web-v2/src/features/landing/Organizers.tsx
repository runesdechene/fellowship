/**
 * QUOI     — le bandeau Organisateurs : « Vous organisez un festival ou un marché ? » et « Nous
 *            écrire ».
 * POURQUOI — maquette 2104:166 ; les organisateurs n'ont pas encore de compte : on leur donne
 *            l'adresse de contact de l'application.
 * ATTENTION — le bandeau reste sombre dans les deux thèmes, son texte reste clair. La photo de fond
 *            est provisoire (Uriel fournira des photos de marché plus tard).
 */
import { ArrowRight } from 'lucide-react'

export function Organizers() {
  return (
    <section className="landing-section landing-organizers-wrap" id="organisateurs">
      <div className="landing-organizers">
        <div className="landing-organizers__text">
          <p className="landing-organizers__eyebrow">Organisateurs</p>
          <h2 className="landing-organizers__title">Vous organisez un festival ou un marché ?</h2>
          <p className="landing-organizers__lead">
            Les exposants de Fellowship vivent de leur stand. Faites-leur connaître votre événement
            et recevez leurs candidatures.
          </p>
        </div>
        <a className="landing-button landing-button--light" href="mailto:appfellowship@pm.me">
          Nous écrire
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </a>
      </div>
    </section>
  )
}
