/**
 * QUOI     — l'encadré des organisateurs, en tête du pied de page : ce que Fellowship construit pour
 *            eux (candidatures, dossiers, relances, plan d'implantation) et un lien pour écrire.
 * POURQUOI — Uriel, 14/10/2026 : les organisateurs ne sont pas un chapitre de la page, mais ils
 *            doivent savoir ce qui arrive pour eux. Le lien « Organisateurs » de la barre y mène.
 * ATTENTION — rien de tout ça n'existe encore : le sceau « Bientôt » le dit.
 */
import { BellRing, FileCheck, Inbox, Map } from 'lucide-react'

const PROMISES = [
  { icon: Inbox, text: 'Les candidatures arrivent au même endroit : tu les tries, tu réponds' },
  { icon: FileCheck, text: 'Les dossiers des exposants arrivent complets, pièces comprises' },
  { icon: BellRing, text: 'Les relances et les paiements se suivent tout seuls' },
  { icon: Map, text: 'Ton plan d’implantation se dessine avec les stands confirmés' },
] as const

export function OrganizersBox() {
  return (
    <section id="organisateurs" className="landing-orga" aria-labelledby="landing-orga-title">
      <div className="landing-orga__text">
        <span className="landing-seal landing-seal--cream">Bientôt · Organisateurs</span>
        <h2 id="landing-orga-title" className="landing-orga__title">
          Tu organises un festival ? On construit aussi ton outil.
        </h2>
        <a className="landing-button landing-button--glass" href="mailto:appfellowship@pm.me">
          Écris-nous
        </a>
      </div>
      <ul className="landing-orga__list">
        {PROMISES.map(({ icon: Icon, text }) => (
          <li key={text}>
            <Icon size={20} strokeWidth={1.8} aria-hidden />
            {text}
          </li>
        ))}
      </ul>
    </section>
  )
}
