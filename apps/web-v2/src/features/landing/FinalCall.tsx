/**
 * QUOI     — la fin de la landing : « Ton prochain stand commence ici. », le bouton « Créer ma
 *            vitrine », puis le pied de page (Propulsé par Runes de Chêne, CGU, confidentialité,
 *            contact).
 * POURQUOI — le dernier appel porte le dégradé du logo : c'est l'exception propre à la landing
 *            (docs/v2/DESIGN-SYSTEM.md).
 * ATTENTION — les pages légales vivent dans la V1 : liens pleins, hors du routeur de la V2.
 */
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function FinalCall() {
  return (
    <>
      <section className="landing-final">
        <h2 className="landing-final__title">Ton prochain stand commence ici.</h2>
        <p className="landing-final__lead">
          Crée ta vitrine en deux minutes. Gratuit, sans carte bancaire.
        </p>
        <Link className="landing-button landing-button--brand" to="/connexion">
          Créer ma vitrine
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Link>
      </section>
      <footer className="landing-foot">
        <div className="landing-foot__inner">
          <div className="landing-foot__brand">
            <span>Fellowship — le réseau des exposants indépendants</span>
            <span className="landing-foot__rule" aria-hidden />
            <a className="landing-foot__rdc" href="https://runesdechene.com">
              <img
                src={`${import.meta.env.BASE_URL}runes-de-chene.png`}
                alt=""
                width={22}
                height={22}
              />
              <span>
                Propulsé par <strong>Runes de Chêne</strong>
              </span>
            </a>
          </div>
          <nav className="landing-foot__links" aria-label="Informations">
            <a href="/legal/cgu">CGU</a>
            <a href="/legal/confidentialite">Confidentialité</a>
            <a href="mailto:appfellowship@pm.me">Contact</a>
          </nav>
        </div>
      </footer>
    </>
  )
}
