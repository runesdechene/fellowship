/**
 * QUOI     — la barre du haut de la landing : le logo et le nom, les chapitres de la page, « Se connecter »
 *            et « Créer ma vitrine ». Elle reste en haut, devient compacte et souligne le chapitre lu.
 * POURQUOI — maquette 2290:2 ; les liens suivent les bandes de la page (Uriel, 14/10/2026), les
 *            organisateurs ont leur encadré dans le pied de page.
 * ATTENTION — « Créer ma vitrine » mène à la connexion, qui crée aussi les comptes (lot 10a). Le
 *            trait glisse sous le lien actif : sa place et sa largeur passent par deux variables CSS.
 */
import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLandingNav } from './useLandingNav'

const CHAPTERS = [
  { id: 'assistant', label: 'Mon assistant' },
  { id: 'communaute', label: 'Ma communauté' },
  { id: 'bientot', label: 'Bientôt' },
  { id: 'pro', label: 'Le Pro' },
  { id: 'organisateurs', label: 'Organisateurs' },
] as const

const IDS = CHAPTERS.map((c) => c.id)

export function LandingTopBar() {
  const { compact, active } = useLandingNav(IDS)
  const nav = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const link = nav.current?.querySelector<HTMLElement>('[aria-current]')
    if (!link) return
    nav.current?.style.setProperty('--chapter-x', `${String(link.offsetLeft)}px`)
    nav.current?.style.setProperty('--chapter-w', `${String(link.offsetWidth)}px`)
  }, [active])

  return (
    <header className={`landing-bar${compact ? ' is-compact' : ''}`}>
      <div className="landing-bar__inner">
        <a className="landing-bar__brand" href="#" aria-label="Fellowship, haut de la page">
          <img className="landing-bar__logo" src={`${import.meta.env.BASE_URL}icon.png`} alt="" />
          <span>
            Fellowship<span className="landing-brand-dot">.</span>
          </span>
        </a>
        <nav
          ref={nav}
          className={`landing-bar__anchors${active ? ' has-active' : ''}`}
          aria-label="Chapitres"
        >
          {CHAPTERS.map((chapter) => (
            <a
              key={chapter.id}
              href={`#${chapter.id}`}
              aria-current={chapter.id === active ? 'location' : undefined}
            >
              {chapter.label}
            </a>
          ))}
        </nav>
        <div className="landing-bar__actions">
          <Link className="landing-button landing-button--glass" to="/connexion">
            Se connecter
          </Link>
          <Link className="landing-button landing-button--cream" to="/connexion">
            Créer ma vitrine
          </Link>
        </div>
      </div>
    </header>
  )
}
