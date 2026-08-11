import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Check, Compass, Tent, LayoutGrid, Users, CreditCard, Bell, Code, Send, ArrowRight, Scroll, Plus,
} from 'lucide-react'
import { useLandingExposants } from '@/hooks/use-landing-stats'
import { usePublicEvents } from '@/hooks/use-public-events'
import { useWaitlist } from '@/hooks/use-waitlist'
import { toPublicList, countCounters, searchEvents, toCard, applicationStatus } from '@/lib/annuaire'
import type { PublicEvent } from '@/lib/annuaire'
import './LandingV2.css'

type Audience = 'festivalier' | 'exposant' | 'organisateur'

const ANNUAIRE_TITLE: Record<Audience, string> = {
  exposant: 'Les prochaines dates où candidater',
  festivalier: 'Les prochaines sorties',
  organisateur: 'Ces festivals sont déjà référencés',
}

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

/** Les six avantages exposant (maquette 630‑659), copie validée client. */
const EXPOSANT_FEATS: Array<{ icon: ReactNode; title: string; text: string; soon?: boolean }> = [
  { icon: <LayoutGrid aria-hidden="true" />, title: 'Vision d\'ensemble',
    text: 'Toute ton année en un coup d\'œil. Prévois tes dates et déniche de nouvelles dates où t\'inscrire, facilement.' },
  { icon: <Users aria-hidden="true" />, title: 'L\'esprit de camaraderie',
    text: 'Vois où vont tes amis, organisez vos covoiturages, collaborez, et soyez prévenus quand l\'un de vous galère.' },
  { icon: <CreditCard aria-hidden="true" />, title: 'Inscriptions, paiements & rentabilité',
    text: 'Suis tes inscriptions, tes paiements et ton bilan. Sache enfin quels festivals valent vraiment le coup.' },
  { icon: <Bell aria-hidden="true" />, title: 'Rappels de deadlines',
    text: 'Ne rate plus jamais une date limite d\'inscription. Fellowship te prévient au bon moment.' },
  { icon: <Code aria-hidden="true" />, title: 'Calendrier intégrable, toujours à jour',
    text: 'Affiche ton agenda en direct sur ton site. Relié à Fellowship, il se met à jour tout seul — tu ne le réédites jamais.' },
  { icon: <Send aria-hidden="true" />, title: 'Postuler en 1 clic', soon: true,
    text: 'Vois un festival, clique « Postuler », ton dossier part direct à l\'organisateur.' },
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
  const { events: rawEvents, tagLabels, loading } = usePublicEvents()
  const today = useMemo(() => new Date(), [])
  const publicEvents = useMemo(() => toPublicList(rawEvents, today), [rawEvents, today])
  const counters = useMemo(() => countCounters(publicEvents, exposantsCount), [publicEvents, exposantsCount])

  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [showAll, setShowAll] = useState(false)

  // Liste d'attente organisateur : même mécanisme que Landing.tsx (useWaitlist,
  // table organizer_waitlist) — pas un second système. Le bouton « Être prévenu
  // au lancement » se remplace par le formulaire au clic, sous la porte.
  const [showOrgaWaitlist, setShowOrgaWaitlist] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const { status: waitlistStatus, error: waitlistError, submit: submitWaitlist } = useWaitlist()

  // FILTERS capture `today` : déclaré dans le composant, juste au-dessus du
  // useMemo qui le consomme. Réduit à ce qui est réellement calculable sur
  // les données existantes — pas de puce qui ne filtre rien (cf. brief).
  const FILTERS: Array<{ key: string; label: string; icon?: React.ReactNode; test: (e: PublicEvent) => boolean }> = [
    { key: 'expo', label: 'Prend des exposants', icon: <Tent aria-hidden="true" />,
      test: e => Boolean(e.registration_url || e.registration_deadline) },
    { key: 'open', label: 'Candidatures ouvertes',
      test: e => applicationStatus(e, today).kind === 'open' },
    { key: 'photo', label: 'Avec affiche', test: e => Boolean(e.image_url) },
  ]

  function toggleFilter(key: string) {
    setActiveFilters(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }
  function resetFilters() {
    setActiveFilters([]); setActiveTag(null); setQuery('')
  }

  const filtered = useMemo(() => {
    const byTag = activeTag ? publicEvents.filter(e => e.tags?.includes(activeTag)) : publicEvents
    // Filtres cumulatifs : cocher deux puces resserre, ça n'élargit jamais.
    const byChips = FILTERS
      .filter(f => activeFilters.includes(f.key))
      .reduce((list, f) => list.filter(e => f.test(e)), byTag)
    return searchEvents(byChips, query)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- FILTERS est recréé à chaque rendu (il capture `today`), l'inclure boucle le memo pour rien.
  }, [publicEvents, activeTag, activeFilters, query])

  const cards = useMemo(
    () => filtered.map(e => toCard(e, today, tagLabels)),
    [filtered, today, tagLabels])
  const visible = showAll ? cards : cards.slice(0, 12)

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

      <section id="annuaire">
        <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div className="sec-head">
            <div className="l">
              <p className="eyebrow"><Compass aria-hidden="true" />L'annuaire</p>
              <h2>{ANNUAIRE_TITLE[audience]}</h2>
            </div>
            {cards.length > 12 && !showAll && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAll(true)}>
                Voir les {cards.length} événements
              </button>
            )}
          </div>

          <div className="filters">
            {FILTERS.map(f => (
              <button key={f.key} type="button" className={`chip${activeFilters.includes(f.key) ? ' on' : ''}`}
                aria-pressed={activeFilters.includes(f.key)} onClick={() => toggleFilter(f.key)}>
                {f.icon}{f.label}
              </button>
            ))}
            {activeTag && (
              <button type="button" className="chip on" onClick={() => setActiveTag(null)}>
                {tagLabels[activeTag] ?? activeTag} ✕
              </button>
            )}
          </div>

          <div className="events">
            {loading
              ? Array.from({ length: 8 }, (_, i) => <div key={i} className="ev-skeleton"><div className="art" /></div>)
              : visible.map(c => (
                <Link key={c.id} to={c.href} className="ev">
                  <div className="art">{c.image && <img src={c.image} alt="" loading="lazy" />}</div>
                  <div className="b">
                    <span className="t">{c.title}</span>
                    <span className="w">{c.when}</span>
                    <div className="meta">
                      {c.tagSlug && <span className="uni-tag" style={{ '--c': c.tagColor } as React.CSSProperties}>{c.tagLabel}</span>}
                      <span className={`stat ${c.status.kind}`}>{c.status.label}</span>
                    </div>
                  </div>
                </Link>
              ))}
          </div>

          {!loading && cards.length === 0 && (
            <p className="annuaire-empty">
              Aucun événement ne correspond. <button type="button" className="link" onClick={resetFilters}>Tout afficher</button>
            </p>
          )}
        </div>
      </section>

      <section id="gratuit">
        <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>

          <div className="v exposant">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 26 }}>
              <p className="eyebrow"><Tent aria-hidden="true" />Pour les exposants</p>
              <h2>Ton année de festivals, maîtrisée.</h2>
              <p className="lede">Trouver la date n'est que le début. Fellowship porte toute ta saison, du repérage au bilan du dimanche soir.</p>
            </div>

            <div className="feats" style={{ marginBottom: 46 }}>
              {EXPOSANT_FEATS.map(f => (
                <div className="feat" key={f.title}>
                  <span className="ico">{f.icon}</span>
                  <h3>{f.title}{f.soon && <span className="soon">Bientôt</span>}</h3>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 22 }}>
              <p className="eyebrow"><Check aria-hidden="true" />Ce que ça coûte</p>
              <h2>Tenir sa saison ne coûte rien.</h2>
              <p className="lede">Pas une version d'essai, pas un quota qui se referme au bout de trois dates. Tout ce qui sert à trouver, planifier et se retrouver est gratuit — et le restera.</p>
            </div>

            <div className="free-block">
              <div className="free-left">
                <span className="free-price">0 €<small>Sans limite de temps · aucune carte bancaire</small></span>
                <Link className="btn btn-primary" to="/login">Créer mon compte <ArrowRight aria-hidden="true" /></Link>
              </div>
              <ul>
                <li><span className="ck"><Check aria-hidden="true" /></span><span className="txt"><strong>Chercher dans {publicEvents.length} événements</strong> et suivre ceux qui t'intéressent</span></li>
                <li><span className="ck"><Check aria-hidden="true" /></span><span className="txt"><strong>Ton calendrier de saison</strong>, et le même agenda en direct sur ton site</span></li>
                <li><span className="ck"><Check aria-hidden="true" /></span><span className="txt"><strong>Voir qui de ton réseau va où</strong>, et t'organiser avec eux</span></li>
                <li><span className="ck"><Check aria-hidden="true" /></span><span className="txt"><strong>Les alertes de date limite</strong> avant chaque clôture de candidature</span></li>
                <li><span className="ck"><Check aria-hidden="true" /></span><span className="txt"><strong>Ta vitrine publique</strong> — tes clients savent où te retrouver, festival après festival</span></li>
                <li><span className="ck"><Check aria-hidden="true" /></span><span className="txt"><strong>Ajouter un événement</strong> qui manque, pour toi et pour les autres</span></li>
              </ul>
            </div>

            <div className="pro-line" id="tarifs">
              <div className="pro-l">
                <span className="pro-tag">Pro · 9,99 € HT / mois</span>
                <h3>Et si tu veux savoir ce que ta saison rapporte vraiment</h3>
                <p className="note">Le bilan de chaque événement, tes budgets, ta rentabilité réelle, et les avis détaillés des autres exposants. C'est la seule partie payante — <strong>et rien de ce qui est listé au-dessus n'en dépend.</strong></p>
              </div>
              <Link className="btn btn-ghost" to="/login">Voir ce que ça contient</Link>
            </div>
          </div>

          <div className="v festivalier">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 26 }}>
              <p className="eyebrow"><Compass aria-hidden="true" />Pour les festivaliers</p>
              <h2>Ne rate plus jamais tes créateurs.</h2>
              <p className="lede">Gratuit, pour toujours. Aucune carte bancaire, jamais.</p>
            </div>
            <div className="two-doors">
              <div className="door">
                <h3>Découvre</h3>
                <ul>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Tous les festivals, marchés et conventions près de chez toi</li>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Filtre par univers, par date, par distance</li>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Vois quels créateurs seront présents avant d'y aller</li>
                </ul>
                <Link className="btn btn-primary" to="/login">Créer mon compte gratuit <ArrowRight aria-hidden="true" /></Link>
              </div>
              <div className="door accented">
                <h3>Suis tes artisans</h3>
                <ul>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Abonne-toi aux créateurs rencontrés sur un stand</li>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Sache où ils passent, toute l'année</li>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Planifie tes sorties à partir de leur calendrier</li>
                </ul>
                <Link className="btn btn-ghost" to="/runes-de-chene">Voir un exemple de vitrine</Link>
              </div>
            </div>
          </div>

          <div className="v organisateur">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 26 }}>
              <p className="eyebrow"><Scroll aria-hidden="true" />Pour les organisateurs</p>
              <h2>Montrez votre festival aux bons exposants.</h2>
              <p className="lede">Le référencement est gratuit et le restera. Ce qui arrive ensuite ne se paie qu'à l'usage.</p>
            </div>
            <div className="two-doors">
              <div className="door accented">
                <h3>Référencez votre festival — gratuitement</h3>
                <ul>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Votre page dans l'annuaire, visible des exposants <em>et</em> du public</li>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Vous voyez combien d'exposants suivent votre événement</li>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Vos dates, vos tarifs d'emplacement et votre date limite, à jour</li>
                </ul>
                <Link className="btn btn-primary" to="/login">Ajouter mon festival <Plus aria-hidden="true" /></Link>
              </div>
              <div className="door">
                <h3>Recevoir les candidatures <span className="stat soon" style={{ marginLeft: 6 }}>Bientôt</span></h3>
                <ul>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Fini les 200 mails et les PDF : des dossiers propres et comparables</li>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Vous ne payez que les dossiers que vous validez</li>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Relances, frais et plan d'emplacements au même endroit</li>
                </ul>
                <div className="waitlist-inline">
                  {waitlistStatus === 'success' ? (
                    <p className="waitlist-success">Merci ! On te prévient au lancement.</p>
                  ) : showOrgaWaitlist ? (
                    <form className="waitlist-row" onSubmit={e => { e.preventDefault(); submitWaitlist(waitlistEmail) }}>
                      <input
                        type="email" className="waitlist-input" placeholder="votre@email.fr" aria-label="Votre email"
                        value={waitlistEmail} onChange={e => setWaitlistEmail(e.target.value)}
                        disabled={waitlistStatus === 'submitting'} required
                      />
                      <button type="submit" className="btn btn-ghost btn-sm" disabled={waitlistStatus === 'submitting'}>
                        {waitlistStatus === 'submitting' ? 'Envoi…' : 'Je m\'inscris'}
                      </button>
                    </form>
                  ) : (
                    <button type="button" className="btn btn-ghost" onClick={() => setShowOrgaWaitlist(true)}>Être prévenu au lancement</button>
                  )}
                  {waitlistStatus === 'error' && waitlistError && <p className="waitlist-error">{waitlistError}</p>}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}
