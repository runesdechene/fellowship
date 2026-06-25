import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getTagEmoji, getTagLandingColor } from '@/components/ui/TagBadge'
import './NewAccueil.css'

type Aud = 'festivalier' | 'exposant' | 'organisateur'

// Tags affichés dans le marquee — slugs réels (couleurs + emojis depuis TagBadge).
const MARQUEE: { slug: string; label: string }[] = [
  { slug: 'festival-musique', label: 'Festival géant' },
  { slug: 'marche-createurs', label: 'Marché de créateurs' },
  { slug: 'fete-medievale', label: 'Fête médiévale' },
  { slug: 'fantastique', label: 'Fantasy' },
  { slug: 'geek', label: 'Comic Con' },
  { slug: 'salon', label: 'Salon' },
  { slug: 'litteraire', label: 'Salon du livre' },
  { slug: 'marche-noel', label: 'Marché de Noël' },
  { slug: 'culturel', label: 'Festival culturel' },
  { slug: 'gastronomique', label: 'Food festival' },
  { slug: 'tatouage', label: 'Tattoo show' },
  { slug: 'foire', label: 'Foire artisanale' },
]

function Chip({ slug, label }: { slug: string; label: string }) {
  const c = getTagLandingColor(slug)
  return (
    <span
      className="nwa-chip"
      style={{
        ['--tc' as string]: c,
        background: `color-mix(in srgb, ${c} 14%, transparent)`,
        borderColor: `color-mix(in srgb, ${c} 40%, transparent)`,
        color: c,
      }}
    >
      <span className="nwa-chip-e">{getTagEmoji(slug)}</span>
      {label}
    </span>
  )
}

export function NewAccueilPage() {
  const [aud, setAud] = useState<Aud>('exposant')

  return (
    <div className="nwa" data-aud={aud}>
      {/* halos multicolores — lumières de scène / nuit de festival */}
      <div className="nwa-halos" aria-hidden>
        <span className="nwa-glow h-terra" />
        <span className="nwa-glow h-violet" />
        <span className="nwa-glow h-blue" />
        <span className="nwa-glow h-green" />
        <span className="nwa-glow h-amber" />
        <div className="nwa-bokeh">
          {Array.from({ length: 14 }).map((_, i) => (
            <i key={i} className={`bk bk-${i}`} />
          ))}
        </div>
      </div>

      <div className="nwa-inner">
        {/* nav */}
        <nav className="nwa-nav">
          <div className="nwa-logo"><span className="nwa-mk" /> Fellowship</div>
          <span className="nwa-sp" />
          <a className="nwa-link" href="#">À propos</a>
          <a className="nwa-link" href="#">Tarifs</a>
          <Link className="nwa-link" to="/login">Connexion</Link>
          <Link className="nwa-si" to="/login">S'inscrire</Link>
        </nav>

        {/* switcher */}
        <div className="nwa-switch">
          <button className={aud === 'festivalier' ? 'on' : ''} onClick={() => setAud('festivalier')}>Festivalier</button>
          <button className={aud === 'exposant' ? 'on' : ''} onClick={() => setAud('exposant')}>Exposant</button>
          <button className={aud === 'organisateur' ? 'on' : ''} onClick={() => setAud('organisateur')}>Organisateur</button>
        </div>

        <h1 className="nwa-title">
          Les festivals,<br />
          <span className="nwa-grad">ensemble.</span>
        </h1>
        <p className="nwa-lead">
          Gère ta saison, retrouve tes amis sur la route, et découvre des centaines
          de festivals tout au long de l'année.
        </p>

        <div className="nwa-cta">
          <Link to="/login" className="nwa-btn p">Commencer gratuitement <ArrowRight size={17} /></Link>
          <a href="#" className="nwa-btn g">Voir comment ça marche</a>
        </div>

        <div className="nwa-proof">
          <span className="nwa-ava"><span /><span /><span /><span /></span>
          45+ exposants déjà sur Fellowship
        </div>
      </div>

      {/* marquee de tags colorés */}
      <div className="nwa-marquee">
        <div className="nwa-track">
          {[...MARQUEE, ...MARQUEE].map((t, i) => (
            <Chip key={i} slug={t.slug} label={t.label} />
          ))}
        </div>
      </div>
    </div>
  )
}
