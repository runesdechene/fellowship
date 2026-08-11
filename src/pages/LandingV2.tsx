import { useEffect, useRef, useState } from 'react'
import './LandingV2.css'

type Audience = 'festivalier' | 'exposant' | 'organisateur'

// Le clair par défaut (décision 0007) est décidé en deux endroits qui doivent s'accorder :
// le script anti-flash d'index.html pose la classe .light avant le premier paint, et
// getInitialTheme() (src/lib/theme.ts) lit CETTE MÊME décision au lieu d'en réinventer une —
// donc ThemeProvider applique déjà « day » dès son premier montage. Rien à faire ici.
export function LandingV2Page() {
  const [audience] = useState<Audience>('exposant')
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const handler = () => nav.classList.toggle('scrolled', window.scrollY > 16)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

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
    </div>
  )
}
