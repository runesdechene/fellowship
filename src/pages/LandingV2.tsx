import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Check, Compass, Tent, LayoutGrid, Users, CreditCard, Bell, Code, Send, ArrowRight, Scroll, Plus,
} from 'lucide-react'
import { useLandingExposants, useTestimonials } from '@/hooks/use-landing-stats'
import { usePublicEvents } from '@/hooks/use-public-events'
import { useWaitlist } from '@/hooks/use-waitlist'
import {
  toPublicList, countCounters, searchEvents, toCard, applicationStatus, topUniverses,
  takesExhibitors, searchScopeLabel, ctaCountsSentence, resultsLabel,
} from '@/lib/annuaire'
import type { PublicEvent } from '@/lib/annuaire'
import { getTagLandingColor } from '@/components/ui/TagBadge'
import { ThemeToggle } from '@/components/theme-toggle'
import { LEGAL } from '@/lib/legal'
import './LandingV2.css'

type Audience = 'festivalier' | 'exposant' | 'organisateur'

/** Le CSS respecte `prefers-reduced-motion` ; un défilement programmé en JS
 *  l'ignorerait sans ça et la page glisserait quand même. */
function scrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || !window.matchMedia) return 'smooth'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/** `useWaitlist` est partagé avec la V1, qui tutoie. Cette porte est celle des
 *  organisateurs, vouvoyée de bout en bout : on retraduit ici plutôt que de
 *  toucher au hook (la V1 doit rester intacte). */
const WAITLIST_ERROR_VOUS: Record<string, string> = {
  'Une erreur est survenue. Réessaie dans un instant.': 'Une erreur est survenue. Réessayez dans un instant.',
}

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
  const { events: rawEvents, tagLabels, loading, error: eventsFailed } = usePublicEvents()
  const today = useMemo(() => new Date(), [])
  const publicEvents = useMemo(() => toPublicList(rawEvents, today), [rawEvents, today])
  // `null` = on ne sait pas (lecture ratée, ou pas encore aboutie). Toute
  // phrase chiffrée de la page passe par là : aucun zéro affiché ne peut être
  // le résidu d'une erreur — ce serait mentir sur la seule chose que cette
  // page a à prouver.
  const measured: PublicEvent[] | null = eventsFailed || loading ? null : publicEvents
  const counters = useMemo(() => countCounters(measured, exposantsCount), [measured, exposantsCount])
  const ctaSentence = useMemo(() => ctaCountsSentence(measured), [measured])
  const { testimonials } = useTestimonials()

  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [showAll, setShowAll] = useState(false)
  // Annonce vocale du nombre de résultats (aria-live plus bas). Le drapeau est
  // posé par les gestionnaires eux-mêmes, jamais par un « est-ce le premier
  // rendu ? » : StrictMode rejoue les effets de montage en développement, et
  // la simple arrivée des données ne doit pas parler non plus.
  const [announcement, setAnnouncement] = useState('')
  const userFiltered = useRef(false)

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
      test: takesExhibitors },
    { key: 'open', label: 'Candidatures ouvertes',
      test: e => applicationStatus(e, today).kind === 'open' },
    { key: 'photo', label: 'Avec affiche', test: e => Boolean(e.image_url) },
  ]

  function toggleFilter(key: string) {
    userFiltered.current = true
    setActiveFilters(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }
  function resetFilters() {
    userFiltered.current = true
    setActiveFilters([]); setActiveTag(null); setQuery('')
  }
  function search(next: string) {
    userFiltered.current = true
    setQuery(next)
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
    // Appelé une fois : on peut arriver DÉJÀ défilé (lien /?v2=1#annuaire, ou
    // simple rechargement au milieu de la page) — sans ça, la barre reste
    // transparente par-dessus le contenu jusqu'au premier mouvement.
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Sans ça, taper dans le champ de recherche ne produit aucun retour audible.
  useEffect(() => {
    if (!userFiltered.current || loading) return
    setAnnouncement(resultsLabel(cards.length))
  }, [query, activeFilters, activeTag, cards.length, loading])

  function switchAudience(a: Audience) {
    setAudience(a)
    window.scrollTo({ top: 0, behavior: scrollBehavior() })
  }

  // Pied de page — « Par univers » : seuls les univers avec au moins un
  // événement à venir (cf. topUniverses), triés par fréquence.
  const universes = useMemo(() => topUniverses(publicEvents), [publicEvents])

  function filterByUniverse(slug: string) {
    userFiltered.current = true
    setActiveTag(slug)
    // On efface la recherche et les puces : sinon « provins » + un univers du
    // pied de page ramène le visiteur sur « Aucun événement ne correspond »,
    // la porte sur du vide que topUniverses existe précisément pour éviter.
    setQuery('')
    setActiveFilters([])
    document.getElementById('annuaire')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
  }

  // Un lien du pied de page peut viser une ancre qui vit DANS un bloc `.v`,
  // masqué tant que l'audience n'est pas la bonne (#tarifs est dans `.v
  // exposant`). Une cible en display:none n'a pas de boîte : scrollIntoView
  // ne fait alors strictement rien. On bascule l'audience, puis on défile au
  // rendu suivant, quand la cible existe vraiment.
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null)
  useEffect(() => {
    if (!pendingAnchor) return
    document.getElementById(pendingAnchor)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
    setPendingAnchor(null)
  }, [pendingAnchor])

  function goToAudienceAnchor(a: Audience, anchorId: string) {
    setAudience(a)
    setPendingAnchor(anchorId)
  }

  return (
    <div className="lv2" data-aud={audience}>
      <div className="halos" aria-hidden="true"><i className="h1x" /><i className="h2x" /><i className="h3x" /><i className="h4x" /></div>

      <nav className="site" ref={navRef}>
        <div className="wrap nav-in">
          <Link className="logo" to="/"><img src="/icon.png" alt="" />Fellowship</Link>
          <div className="nav-links">
            <a className="link" href="#annuaire">L'annuaire</a>
            <a className="link" href="#gratuit">C'est gratuit</a>
            {/* Le sombre est livré (≈30 lignes de jetons) mais reste inatteignable
                sans bouton : le clair par défaut de la décision 0007 dit « sur
                demande explicite » — encore faut-il pouvoir demander. Composant
                partagé, repeint aux jetons parchemin dans LandingV2.css. */}
            <ThemeToggle />
            <Link className="btn btn-primary btn-sm" to="/login">Créer mon compte</Link>
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
            <input value={query} onChange={e => search(e.target.value)}
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
              <button type="button" className="chip on" onClick={() => { userFiltered.current = true; setActiveTag(null) }}
                aria-label={`Retirer le filtre ${tagLabels[activeTag] ?? activeTag}`}>
                {tagLabels[activeTag] ?? activeTag} ✕
              </button>
            )}
          </div>

          {/* Le nombre de résultats, dit à voix haute quand il change. */}
          <p className="visually-hidden" role="status" aria-live="polite">{announcement}</p>

          <div className="events">
            {/* 12 squelettes = exactement ce que la grille affiche ensuite, et
                chacun porte la hauteur du bloc de texte de la carte : sans ça
                la mise en page sautait deux fois au chargement. */}
            {loading
              ? Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="ev-skeleton" aria-hidden="true">
                  <div className="art" />
                  <div className="b"><span className="l l1" /><span className="l l2" /><span className="l l3" /></div>
                </div>
              ))
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

          {/* Deux états distincts, jamais confondus : « rien ne correspond à ta
              recherche » et « on n'a pas pu lire l'annuaire » ne disent pas du
              tout la même chose au visiteur. Pas de diagnostic hasardeux non
              plus (une erreur PostgREST n'est pas une panne réseau) : on dit
              ce qu'on sait, et on le distingue d'un annuaire vide. */}
          {eventsFailed && (
            <p className="annuaire-error" role="alert">
              La liste des événements n'a pas pu être chargée — ce n'est pas qu'elle est vide.{' '}
              <button type="button" className="link" onClick={() => window.location.reload()}>Réessayer</button>
            </p>
          )}
          {!loading && !eventsFailed && cards.length === 0 && (
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
                <li><span className="ck"><Check aria-hidden="true" /></span><span className="txt"><strong>{searchScopeLabel(measured?.length ?? null)}</strong> et suivre ceux qui t'intéressent</span></li>
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
                {/* Une seule classe de pastille : `.soon` porte déjà sa taille,
                    son fond et sa marge gauche — l'empiler sur `.stat` faisait
                    se disputer deux jeux de padding pour le même badge. */}
                <h3>Recevoir les candidatures <span className="soon">Bientôt</span></h3>
                <ul>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Fini les 200 mails et les PDF : des dossiers propres et comparables</li>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Vous ne payez que les dossiers que vous validez</li>
                  <li><span className="ck"><Check aria-hidden="true" /></span>Relances, frais et plan d'emplacements au même endroit</li>
                </ul>
                <div className="waitlist-inline">
                  {waitlistStatus === 'success' ? (
                    <p className="waitlist-success">Merci ! On vous prévient au lancement.</p>
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
                  {waitlistStatus === 'error' && waitlistError && (
                    <p className="waitlist-error" role="alert">{WAITLIST_ERROR_VOUS[waitlistError] ?? waitlistError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <section>
        <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div className="founder">
            <p className="eyebrow"><Tent aria-hidden="true" />Qui est derrière</p>
            <h2>Fait par un exposant, pour des exposants.</h2>
            <p className="note">Fellowship est édité par <strong>Runes de Chêne</strong>, atelier d'impression textile qui écume les festivals médiévaux, les fests de métal et les conventions. L'outil n'a pas été pensé dans un bureau : il est né parce qu'on en avait besoin nous-mêmes, un dimanche soir, en remballant.</p>
            <p className="note">Ce qui veut dire deux choses. On connaît le problème de l'intérieur — et on est les premiers à subir nos propres mauvaises décisions.</p>
            <div className="sig">
              <span className="av">U</span>
              <span><span className="n">Uriel</span><br /><span className="r">Runes de Chêne · exposant</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* On ne rend cette section que si des témoignages existent réellement en
          base (RLS = actifs seulement) — jamais les trois cartes « Exemple
          d'affichage » de la maquette en production. */}
      {testimonials.length > 0 && (
        <section>
          <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            <div className="l" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <p className="eyebrow"><Scroll aria-hidden="true" />Ils y sont déjà</p>
              <h2>Ils en parlent mieux que nous.</h2>
            </div>
            <div className="quotes">
              {testimonials.map(t => {
                const initials = (t.name?.trim() || '?').charAt(0).toUpperCase()
                const card = (
                  <div className="q">
                    <div className="q-head">
                      {t.resolvedAvatar
                        ? <img className="q-av" src={t.resolvedAvatar} alt="" />
                        : <span className="q-av">{initials}</span>}
                      <div><div className="q-n">{t.name}</div><div className="q-c">{t.craft}</div></div>
                    </div>
                    <blockquote>« {t.quote} »</blockquote>
                  </div>
                )
                return t.resolvedSlug
                  ? (
                    <Link key={t.id} to={`/${t.resolvedSlug}`} className="q-link"
                      aria-label={`Voir la vitrine de ${t.name || 'cet exposant'}`}>{card}</Link>
                  )
                  : <div key={t.id}>{card}</div>
              })}
            </div>
          </div>
        </section>
      )}

      <div className="wrap">
        <section className="cta-band">
          <p className="eyebrow"><Tent aria-hidden="true" />Il reste de la place</p>
          <h2>Ta prochaine date t'attend quelque part.</h2>
          {/* Sans lecture aboutie, la bande garde son invitation mais laisse
              tomber la phrase chiffrée — pas de « 0 événement à venir ». */}
          <p className="sub">
            {ctaSentence && `${ctaSentence} `}
            Le compte est gratuit et se crée en trente secondes.
          </p>
          <div className="acts">
            <Link className="btn btn-primary" to="/login">Créer mon compte <ArrowRight aria-hidden="true" /></Link>
            <a className="btn btn-ghost" href="#annuaire">Parcourir l'annuaire</a>
          </div>
        </section>
      </div>

      <footer>
        <div className="wrap">
          {/* Décoratif — signature d'affiche, redondante avec le lien nav et
              le « © 2026 Fellowship » juste en dessous : masquée aux
              lecteurs d'écran comme le reste des éléments décoratifs. */}
          <div className="foot-mark" aria-hidden="true">Fellowship<span>.</span></div>

          <div className="foot-grid">
            <div className="foot-brand">
              <p className="tag">L'annuaire des événements où poser son stand — et l'outil qui porte toute ta saison.</p>
              <div className="foot-by">
                <span className="av">RC</span>
                <span className="t">Édité par <strong>Runes de Chêne</strong><br />Fait par des exposants, pour des exposants.</span>
              </div>
            </div>

            {/* Écart maquette (assumé) : ces liens pointaient sur # — ici ils
                filtrent réellement la grille et y ramènent le visiteur. Seuls
                les univers avec au moins un événement à venir apparaissent. */}
            <nav className="foot-col" aria-label="Par univers">
              <h4>Par univers</h4>
              {universes.map(slug => (
                <button key={slug} type="button" onClick={() => filterByUniverse(slug)}>
                  <i style={{ '--c': getTagLandingColor(slug) } as React.CSSProperties} />
                  {tagLabels[slug] ?? slug}
                </button>
              ))}
            </nav>

            <nav className="foot-col" aria-label="Fellowship">
              <h4>Fellowship</h4>
              <a href="#annuaire">L'annuaire</a>
              {/* Ces trois entrées visent du contenu qui n'existe que sous une
                  audience donnée : « Tarifs » (#tarifs) vit dans le bloc
                  exposant, invisible — donc sans boîte, donc insensible à
                  scrollIntoView — pour les deux autres audiences. On bascule
                  d'abord, on défile ensuite. */}
              <button type="button" onClick={() => goToAudienceAnchor('exposant', 'gratuit')}>Pour les exposants</button>
              <button type="button" onClick={() => goToAudienceAnchor('organisateur', 'gratuit')}>Pour les organisateurs</button>
              <Link to="/login">Ajouter un événement</Link>
              <button type="button" onClick={() => goToAudienceAnchor('exposant', 'tarifs')}>Tarifs</button>
              <a href={`mailto:${LEGAL.email}`}>Nous écrire</a>
            </nav>
          </div>

          <div className="foot-bar">
            <span className="c">© 2026 Fellowship · flw.sh</span>
            <nav className="legal" aria-label="Informations légales">
              <Link to="/legal/mentions-legales">Mentions légales</Link><span>·</span>
              <Link to="/legal/confidentialite">Confidentialité</Link><span>·</span>
              <Link to="/legal/cgu">CGU</Link><span>·</span>
              <Link to="/legal/cgv">CGV</Link><span>·</span>
              <Link to="/legal/charte-communautaire">Charte</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
