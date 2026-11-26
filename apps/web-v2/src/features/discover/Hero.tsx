/**
 * QUOI     — le haut de page : la promesse à gauche, l'application à droite, qui déborde de
 *            l'écran sur ordinateur et change de vue toute seule.
 * POURQUOI — maquette du 26/11/2026 : lire la promesse et voir le produit sur un seul plan.
 * ATTENTION — les fins de phrase du titre occupent toutes la même case : la place est celle de la
 *            plus longue, et rien ne bouge quand elles se relaient. Même principe pour les écrans.
 */
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ToolMess } from './ToolMess'
import { useCycle } from './useCycle'

const ENDINGS = [
  ['un bon', 'festival'],
  ['un bon', 'salon'],
  ['une bonne', 'date'],
] as const

const SCREENS = [
  { label: 'Calendrier', url: 'flw.sh/calendrier', image: 'calendrier' },
  { label: 'Explorer', url: 'flw.sh/explorer', image: 'explorer' },
  { label: 'Tableau de bord', url: 'flw.sh', image: 'accueil' },
  { label: 'Communauté', url: 'flw.sh/communaute', image: 'communaute' },
] as const

const WORD_MS = 3600
const SCREEN_MS = 5000

function Title() {
  const [current] = useCycle(ENDINGS.length, WORD_MS)
  const previous = (current + ENDINGS.length - 1) % ENDINGS.length
  const state = (index: number) =>
    index === current ? ' is-on' : index === previous ? ' is-leaving' : ''

  return (
    <h1 className="discover-hero__title">
      <span>Ne rate plus jamais</span>
      <span className="discover-hero__endings">
        {ENDINGS.map(([article, word], index) => (
          <span
            key={word}
            className={`discover-hero__ending${state(index)}`}
            aria-hidden={index !== current}
          >
            {article} <span className="discover-hero__mark">{word}</span>
          </span>
        ))}
      </span>
    </h1>
  )
}

function Screens() {
  const [current, show] = useCycle(SCREENS.length, SCREEN_MS)

  return (
    <div className="discover-hero__app">
      <div className="discover-window">
        <div className="discover-window__bar">
          <span className="discover-window__dots" aria-hidden />
          <span className="discover-window__url">{SCREENS[current]?.url}</span>
        </div>
        <div className="discover-window__view">
          {SCREENS.map((screen, index) => (
            <img
              key={screen.image}
              className={`discover-window__screen${index === current ? ' is-on' : ''}`}
              src={`${import.meta.env.BASE_URL}decouvrir/${screen.image}.webp`}
              alt={`L’écran ${screen.label} de Fellowship`}
              aria-hidden={index !== current}
              width="2000"
              height="1324"
            />
          ))}
        </div>
      </div>
      <div className="discover-tabs" role="group" aria-label="Aperçu de l’application">
        {SCREENS.map((screen, index) => (
          <button
            key={screen.image}
            type="button"
            className={`discover-tabs__tab${index === current ? ' is-on' : ''}`}
            aria-pressed={index === current}
            onClick={() => {
              show(index)
            }}
          >
            {screen.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section id="haut" className="discover-hero">
      <div className="discover-hero__text">
        <Title />
        <p className="discover-hero__lead">
          Vois où vont les exposants que tu connais, et ce qu’ils en ont pensé. Fellowship t’aide à
          choisir tes festivals et s’occupe du reste.
        </p>
        <Link className="discover-button discover-button--brand" to="/connexion">
          Commencer gratuitement
          <ArrowRight size={17} strokeWidth={2} aria-hidden />
        </Link>
        <p className="discover-hero__note">Gratuit, sans carte bancaire.</p>
        <ToolMess />
      </div>
      <Screens />
    </section>
  )
}
