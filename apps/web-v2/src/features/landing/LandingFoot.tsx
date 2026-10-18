/**
 * QUOI     — le pied de page de la landing : la marque et son histoire, les liens, Runes de Chêne ; en tête, ce
 *            que la page y pose (l'encadré des organisateurs sur la landing).
 * POURQUOI — la landing et la recherche publique (lot 11b, maquette 2314:2) finissent pareil.
 * ATTENTION — les pages légales vivent dans la V1 : liens pleins, hors du routeur de la V2.
 *            `away` (hors de la landing) : les ancres passent par la landing.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Wordmark } from '@/components/ui/Wordmark'

export function LandingFoot({ children, away = false }: { children?: ReactNode; away?: boolean }) {
  const home = away ? import.meta.env.BASE_URL : ''
  return (
    <footer className="landing-foot">
      {children}
      <div className="landing-foot__top">
        <div className="landing-foot__brand">
          <p className="landing-foot__name">
            <Wordmark />
          </p>
          <p className="landing-foot__word">
            Fellowship est né sur les stands de la marque Runes de Chêne, d’une saison qui tenait
            sur des post‑it, un tableau Excel et des « c’est quoi ta prochaine date ? ». Partagé
            d’abord entre collègues, il est aujourd’hui ouvert à toute la communauté des exposants,
            créateurs et artisans nomades.
          </p>
        </div>
        <nav className="landing-foot__links" aria-label="Plan du site">
          <div>
            <p className="landing-foot__head">L’application</p>
            <Link to="/connexion">Explorer</Link>
            <Link to="/connexion">Calendrier</Link>
            <Link to="/pro">Le Pro</Link>
          </div>
          <div>
            <p className="landing-foot__head">Fellowship</p>
            <a href={`${home}#assistant`}>Pourquoi Fellowship</a>
            <a href={`${home}#organisateurs`}>Organisateurs</a>
            <a href="mailto:appfellowship@pm.me">Contact</a>
          </div>
          <div>
            <p className="landing-foot__head">Informations</p>
            <a href="/legal/cgu">CGU</a>
            <a href="/legal/confidentialite">Confidentialité</a>
          </div>
        </nav>
      </div>
      <div className="landing-foot__bottom">
        <a className="landing-foot__rdc" href="https://runesdechene.com">
          <img
            src={`${import.meta.env.BASE_URL}runes-de-chene.png`}
            alt=""
            width={22}
            height={22}
          />
          Propulsé par Runes de Chêne — Portez l’Histoire
        </a>
        <p>© 2026 Fellowship</p>
      </div>
    </footer>
  )
}
