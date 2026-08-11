import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Check } from 'lucide-react'
import { useLandingExposants } from '@/hooks/use-landing-stats'
import { usePublicEvents } from '@/hooks/use-public-events'
import { toPublicList, countCounters } from '@/lib/annuaire'
import './LandingV2.css'

type Audience = 'festivalier' | 'exposant' | 'organisateur'

const SEARCH_PLACEHOLDER: Record<Audience, string> = {
  exposant: 'Chercher un festival, une ville, une date…',
  festivalier: 'Chercher une sortie, une ville, une date…',
  organisateur: 'Chercher votre festival dans l’annuaire…',
}

/** Les 19 univers, mêmes libellés et mêmes couleurs que `marqueTags` de
 *  Landing.tsx : chacun porte SA couleur, c'est ce qui fait le caractère. */
const MARQUEE_TAGS: Array<[string, string]> = [
  ['⚔️ Médiéval', '#e8a06a'], ['🎵 Fête de la musique', '#b89ae0'], ['🖼️ Exposition', '#7fc6a0'],
  ['🎄 Marché de Noël', '#e8897a'], ['🎮 Festival geek', '#79b4d6'], ['🛠️ Foire artisanale', '#e8c06a'],
  ['🎨 Marché de créateurs', '#f0a86a'], ['🐉 Fantasy', '#c4a0e0'], ['📚 Salon du livre', '#7fc6b4'],
  ['🪑 Brocante', '#d4be8a'], ['🦸 Comic Con', '#e89ab4'], ['🧺 Marché de producteurs', '#a8cc7a'],
  ['🎭 Culturel', '#c4a0c4'], ['🌾 Terroir', '#c4a06a'], ['🎬 Cinéma', '#8a98c4'],
  ['🏍️ Biker', '#9a9a9a'], ['🏕️ Outdoor', '#79c6a0'], ['🥘 Gastronomique', '#e89a6a'], ['🌹 Tatouage', '#c4768a'],
]

// Le clair par défaut (décision 0007) est décidé en deux endroits qui doivent s'accorder :
// le script anti-flash d'index.html pose la classe .light avant le premier paint, et
// getInitialTheme() (src/lib/theme.ts) lit CETTE MÊME décision au lieu d'en réinventer une —
// donc ThemeProvider applique déjà « day » dès son premier montage. Rien à faire ici.
export function LandingV2Page() {
  const [audience, setAudience] = useState<Audience>('exposant')
  const [query, setQuery] = useState('')
  const navRef = useRef<HTMLElement>(null)
  // realCount : le vrai compte d'exposants, sans le VIRTUAL_BOOST de la V1
  // (cf. use-landing-stats.ts). Cette page plaide l'honnêteté, elle ne peut
  // pas afficher un chiffre gonflé pour se vendre elle-même.
  const { realCount: exposantsCount } = useLandingExposants()
  const { events: rawEvents } = usePublicEvents()
  const today = useMemo(() => new Date(), [])
  const publicEvents = useMemo(() => toPublicList(rawEvents, today), [rawEvents, today])
  const counters = useMemo(() => countCounters(publicEvents, exposantsCount), [publicEvents, exposantsCount])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const handler = () => nav.classList.toggle('scrolled', window.scrollY > 16)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  function switchAudience(a: Audience) {
    setAudience(a)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="lv2" data-aud={audience}>
      <div className="halos" aria-hidden="true"><i className="h1x" /><i className="h2x" /><i className="h3x" /><i className="h4x" /></div>

      <nav className="site" ref={navRef}>
        <div className="wrap nav-in">
          <a className="logo" href="/"><img src="/icon.png" alt="" />Fellowship</a>
          <div className="nav-links">
            <a className="link" href="#annuaire">L'annuaire</a>
            <a className="link" href="#gratuit">C'est gratuit</a>
            <a className="btn btn-primary btn-sm" href="/login">Créer mon compte</a>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div className="seg" role="group" aria-label="Je suis">
            {(['festivalier', 'exposant', 'organisateur'] as const).map(a => (
              <button key={a} type="button" className={audience === a ? 'on' : undefined}
                aria-pressed={audience === a} onClick={() => switchAudience(a)}>
                {a === 'festivalier' ? 'Festivalier' : a === 'exposant' ? 'Exposant' : 'Organisateur'}
                {a === 'organisateur' && <span className="mini">Soon</span>}
              </button>
            ))}
          </div>

          <div className="hero-copy v exposant">
            <h1>Tous les événements<br />où poser son stand.</h1>
            <p className="lede">Festivals médiévaux, fests de métal, conventions de tatouage, marchés de créateurs et de Noël. Un seul annuaire, gratuit, tenu à jour par ceux qui y exposent.</p>
          </div>
          <div className="hero-copy v festivalier">
            <h1>Tous les festivals,<br />près de chez toi.</h1>
            <p className="lede">Fêtes médiévales, fests de métal, conventions, marchés de créateurs et de Noël. Découvre où sortir, et suis les créateurs que tu aimes de festival en festival.</p>
          </div>
          <div className="hero-copy v organisateur">
            {/* exposantsCount peut être null tant que la lecture n'a pas abouti (ou a
                échoué) : on dégrade vers une phrase sans nombre plutôt que d'afficher
                « null » ou un tiret planté au milieu du titre. */}
            {exposantsCount != null
              ? <h1>{exposantsCount} exposants<br />cherchent une date.</h1>
              : <h1>Des exposants<br />cherchent une date.</h1>}
            <p className="lede">Référencez votre festival gratuitement dans l'annuaire, voyez combien d'exposants le suivent, et recevez bientôt leurs candidatures sans un seul PDF.</p>
          </div>

          <div className="search-big">
            <Search aria-hidden="true" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              aria-label="Chercher dans l'annuaire" placeholder={SEARCH_PLACEHOLDER[audience]} />
          </div>

          <div className="counts">
            {counters.map((c, i) => (
              <span key={c.label} style={{ display: 'contents' }}>
                {i > 0 && <span>·</span>}<b>{c.n}</b><span>{c.label}</span>
              </span>
            ))}
          </div>

          <div className="signature">
            <span className="badge-free"><Check aria-hidden="true" />Gratuit : chercher, planifier, se retrouver</span>
            <span className="by">Édité par <strong>Runes de Chêne</strong> — on expose, comme vous.</span>
          </div>
        </div>
      </header>

      {/* Deux passes : la piste se translate de -50 %, la seconde moitié prend
          exactement la place de la première — pas de saut visible. */}
      <div className="marquee" aria-hidden="true">
        <div className="mtrack">
          {[0, 1].map(pass => MARQUEE_TAGS.map(([label, c]) => (
            <span key={`${pass}-${label}`} className="etag" style={{ '--c': c } as React.CSSProperties}>{label}</span>
          )))}
        </div>
      </div>
    </div>
  )
}
