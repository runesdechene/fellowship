import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme-toggle'
import { useWaitlist } from '@/hooks/use-waitlist'
import { useLandingExposants } from '@/hooks/use-landing-stats'
import { testimonials } from '@/data/testimonials'
import './Landing.css'

type Audience = 'festivalier' | 'exposant' | 'organisateur'

const marqueTags: { label: string; color: string }[] = [
  { label: '⚔️ Médiéval',              color: '#e8a06a' },
  { label: '🎵 Fête de la musique',    color: '#b89ae0' },
  { label: '🖼️ Exposition',            color: '#7fc6a0' },
  { label: '🎄 Marché de Noël',        color: '#e8897a' },
  { label: '🎮 Festival geek',         color: '#79b4d6' },
  { label: '🛠️ Foire artisanale',      color: '#e8c06a' },
  { label: '🎨 Marché de créateurs',   color: '#f0a86a' },
  { label: '🐉 Fantasy',              color: '#c4a0e0' },
  { label: '📚 Salon du livre',        color: '#7fc6b4' },
  { label: '🪑 Brocante',             color: '#d4be8a' },
  { label: '🦸 Comic Con',            color: '#e89ab4' },
  { label: '🧺 Marché de producteurs', color: '#a8cc7a' },
  { label: '🎭 Culturel',             color: '#c4a0c4' },
  { label: '🌾 Terroir',              color: '#c4a06a' },
  { label: '🎬 Cinéma',               color: '#8a98c4' },
  { label: '🏍️ Biker',                color: '#9a9a9a' },
  { label: '🏕️ Outdoor',              color: '#79c6a0' },
  { label: '🥘 Gastronomique',        color: '#e89a6a' },
  { label: '🌹 Tatouage',             color: '#c4768a' },
]

export function LandingPage() {
  const [audience, setAudience] = useState<Audience>('exposant')
  const [email, setEmail] = useState('')
  const { status, error, submit } = useWaitlist()
  const exposants = useLandingExposants()
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const handler = () => {
      nav.classList.toggle('scrolled', window.scrollY > 16)
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  function switchAudience(a: Audience) {
    setAudience(a)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function scrollToOrgaWaitlist() {
    document.getElementById('orga-waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function goToOrgaWaitlist() {
    setAudience('organisateur')
    // Double-rAF : laisser le commit React passer + la règle CSS data-aud appliquer
    // display:block sur .v.organisateur avant de calculer le scroll.
    requestAnimationFrame(() => requestAnimationFrame(scrollToOrgaWaitlist))
  }

  function scrollToHash(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /** Tarifs vivent dans `.v.exposant` (cachée en vue festivalier/organisateur).
   *  Si on n'y est pas, bascule + scroll après le repaint. */
  function goToTarifs(e: React.MouseEvent) {
    e.preventDefault()
    if (audience === 'exposant') {
      scrollToHash('tarifs')
      return
    }
    setAudience('exposant')
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToHash('tarifs')))
  }

  /** À propos = bloc d'avantages (features). L'ancre #apropos est un div invisible
   *  posé AVANT les 3 sections features audience-aware, donc le scroll marche dans
   *  toutes les vues (chaque audience rend SA section juste en dessous). */
  function goToApropos(e: React.MouseEvent) {
    e.preventDefault()
    scrollToHash('apropos')
  }

  return (
    <div className="landing" data-aud={audience}>

      {/* Halos multicolores + lumières — nuit de festival, calque PLEINE PAGE (fond) */}
      <div className="hero-halos" aria-hidden="true">
        <span className="glow h-terra" />
        <span className="glow h-violet" />
        <span className="glow h-blue" />
        <span className="glow h-green" />
        <span className="glow h-amber" />
        <span className="glow h-pink" />
        <span className="glow h-magenta" />
        <div className="hero-bokeh">
          {Array.from({ length: 22 }).map((_, i) => (
            <i key={i} className={`bk bk-${i}`} />
          ))}
        </div>
      </div>

      {/* ── Nav ── */}
      <nav ref={navRef}>
        <div className="wrap nav-in">
          <div className="logo">
            <img src="/icon.png" alt="Fellowship" className="mark-img" />
            <span className="brand-name">Fellowship<span className="brand-dot">.</span></span>
          </div>
          <div className="nav-links">
            <a className="link" href="#apropos" onClick={goToApropos}>À propos</a>
            <a className="link" href="#tarifs" onClick={goToTarifs}>Tarifs</a>
            <ThemeToggle />
            <Link to="/login" className="nav-login">Connexion</Link>
            <Link to="/login" className="btn btn-primary nav-cta">S'inscrire</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="hero">
        <div className="wrap hero-grid">
          <div className="hero-left">
          {/* Audience switcher */}
          <div className="switch-wrap">
            <div className="seg">
              <button
                data-a="festivalier"
                className={audience === 'festivalier' ? 'on' : ''}
                aria-pressed={audience === 'festivalier'}
                onClick={() => switchAudience('festivalier')}
              >
                Festivalier
              </button>
              <button
                data-a="exposant"
                className={audience === 'exposant' ? 'on' : ''}
                aria-pressed={audience === 'exposant'}
                onClick={() => switchAudience('exposant')}
              >
                Exposant
              </button>
              <button
                data-a="organisateur"
                className={audience === 'organisateur' ? 'on' : ''}
                aria-pressed={audience === 'organisateur'}
                onClick={() => switchAudience('organisateur')}
              >
                Organisateur <span className="mini">Soon</span>
              </button>
            </div>
          </div>

          {/* Hero — Exposant */}
          <div className="v exposant">
            <h1>Les festivals,<br /><span className="grad">ensemble.</span></h1>
            <p className="lead">
              Gère toute ta saison, retrouve tes amis sur la route, et découvre des centaines de dates
              où t'inscrire tout au long de l'année.
            </p>
            <div className="hero-cta">
              <Link to="/login" className="btn btn-primary">
                Commencer gratuitement{' '}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <a href="#apropos" className="btn btn-ghost" onClick={goToApropos}>Voir comment ça marche</a>
            </div>
            {!exposants.loading && exposants.count !== null && exposants.count > 0 && (
              <div className="proof">
                <span className="avatars">
                  {exposants.avatars.length > 0
                    ? exposants.avatars.map(a => (
                        <span
                          key={a.actor_id}
                          title={a.label ?? undefined}
                          style={{
                            backgroundImage: `url(${a.avatar_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        />
                      ))
                    : (<><span /><span /><span /><span /><span /></>)}
                </span>
                Rejoins{' '}
                <strong style={{ color: 'hsl(var(--foreground))', margin: '0 3px' }}>
                  {exposants.count}+ exposants
                </strong>{' '}
                sur Fellowship
              </div>
            )}
          </div>

          {/* Hero — Festivalier */}
          <div className="v festivalier">
            <h1>Tes festivals préférés,<br /><span className="grad">dans toute la France.</span></h1>
            <p className="lead">
              Découvre des festivals près de chez toi, suis tes exposants et créateurs favoris,
              et planifie ton été facilement, côte à côte avec tes amis.
            </p>
            <div className="hero-cta">
              <Link to="/login" className="btn btn-primary">
                Créer mon compte{' '}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <a href="#apropos" className="btn btn-ghost" onClick={goToApropos}>Explorer les festivals</a>
            </div>
            <div className="proof">Gratuit, pour toujours · Aucune carte requise</div>
          </div>

          {/* Hero — Organisateur */}
          <div className="v organisateur">
            <h1>Vos dossiers d'exposants,<br /><span className="grad">enfin automatisés.</span></h1>
            <p className="lead">
              Fini le papier, les PDF et les relances perdues dans les emails. Recevez et gérez les
              candidatures en un seul flux, et découvrez des centaines de créateurs pour vos événements.
            </p>
            <div className="hero-cta">
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg,var(--lime),var(--lime-d))',
                  boxShadow: 'none',
                }}
                onClick={scrollToOrgaWaitlist}
              >
                Rejoindre la liste d'attente
              </button>
            </div>
            <div className="proof">🌱 En développement · Lancement V2</div>
          </div>
          </div>{/* /hero-left */}

          {/* ── Maquettes devices (desktop + mobile) en perspective ── */}
          <div className="hero-devices" aria-hidden="true">
            <div className="dv-stage">
              {/* Desktop : fenêtre navigateur + UI Cockpit stylisée */}
              <div className="dv-desktop">
                <div className="dv-bar"><i /><i /><i /><span className="dv-url" /></div>
                <div className="dv-screen">
                  <aside className="dv-side">
                    <span className="dv-logo" />
                    <span className="dv-nav on" /><span className="dv-nav" /><span className="dv-nav" />
                    <span className="dv-nav" /><span className="dv-nav" />
                  </aside>
                  <main className="dv-main">
                    <div className="dv-head"><span className="dv-htitle" /><span className="dv-avatar" /></div>
                    <div className="dv-stats"><span /><span /><span /></div>
                    <div className="dv-grid">
                      {[['#f0a86a','75%'],['#c4a0e0','60%'],['#79b4d6','80%'],['#7fc6b4','55%']].map(([c, w], i) => (
                        <div className="dv-card" key={i} style={{ ['--c' as string]: c }}>
                          <span className="dv-strip" />
                          <span className="dv-l1" style={{ width: w }} />
                          <span className="dv-l2" />
                          <span className="dv-chip" />
                        </div>
                      ))}
                    </div>
                  </main>
                </div>
              </div>

              {/* Mobile : téléphone en avant, chevauche le desktop */}
              <div className="dv-phone">
                <span className="dv-notch" />
                <div className="dv-pscreen">
                  <div className="dv-phead"><span className="dv-pt" /><span className="dv-search" /></div>
                  {[['#e8897a','70%'],['#f0a86a','85%'],['#b89ae0','62%']].map(([c, w], i) => (
                    <div className="dv-pcard" key={i} style={{ ['--c' as string]: c }}>
                      <span className="dv-pimg" />
                      <span className="dv-ptxt">
                        <span className="dv-pl1" style={{ width: w }} />
                        <span className="dv-pl2" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Marquee ── */}
      <div className="marquee">
        <div className="mtrack">
          {marqueTags.map((t) => (
            <span
              key={t.label + '-1'}
              className="etag"
              style={{ '--c': t.color } as React.CSSProperties}
            >
              {t.label}
            </span>
          ))}
          {/* duplicate for seamless loop */}
          {marqueTags.map((t) => (
            <span
              key={t.label + '-2'}
              className="etag"
              style={{ '--c': t.color } as React.CSSProperties}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Ancre "À propos" : pointe vers le bloc des avantages (features), peu importe
          l'audience active (chaque vue rend SA propre section .block.v.<audience>). */}
      <div id="apropos" aria-hidden="true" />

      {/* ── Features — Exposant ── */}
      <section className="block v exposant">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Pour les exposants</span>
            <h2>Ton année de festivals, maîtrisée.</h2>
          </div>
          <div className="features">

            <div className="feat">
              <div className="ico copper">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </div>
              <h3>Vision d'ensemble</h3>
              <p>Toute ton année en un coup d'œil. Prévois tes dates et déniche de nouvelles dates où t'inscrire, facilement.</p>
            </div>

            <div className="feat">
              <div className="ico lime">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="7" r="3.5" />
                  <path d="M2.5 20v-1a6 6 0 0113 0v1" />
                  <path d="M16 4a4 4 0 010 7" />
                  <path d="M21.5 20v-1a6 6 0 00-3.5-5.5" />
                </svg>
              </div>
              <h3>L'esprit de camaraderie</h3>
              <p>Vois où vont tes amis, organisez vos covoiturages, collaborez, et soyez prévenus quand l'un de vous galère.</p>
            </div>

            <div className="feat">
              <div className="ico copper">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 7H4a2 2 0 00-2 2v8a2 2 0 002 2h16a1 1 0 001-1v-4" />
                  <path d="M2 9V7a2 2 0 012-2h13a1 1 0 011 1v3" />
                  <circle cx="17" cy="13" r="1.5" />
                </svg>
              </div>
              <h3>Inscriptions, paiements &amp; rentabilité</h3>
              <p>Suis tes inscriptions, tes paiements et ton bilan. Sache enfin quels festivals valent vraiment le coup.</p>
            </div>

            <div className="feat">
              <div className="ico lime">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
                </svg>
              </div>
              <h3>Rappels de deadlines</h3>
              <p>Ne rate plus jamais une date limite d'inscription. Fellowship te prévient au bon moment.</p>
            </div>

            <div className="feat">
              <div className="ico copper">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
                </svg>
              </div>
              <h3>Calendrier intégrable, toujours à jour</h3>
              <p>Affiche ton agenda en direct sur ton site. Relié à Fellowship, il se met à jour tout seul — tu ne le réédites jamais.</p>
            </div>

            <div className="feat">
              <div className="ico lime">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
                </svg>
              </div>
              <h3>Postuler en 1 clic <span className="soon">Bientôt</span></h3>
              <p>Vois un festival, clique « Postuler », ton dossier part direct à l'organisateur.</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Features — Festivalier ── */}
      <section className="block v festivalier">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow f">Pour les festivaliers</span>
            <h2>Ne rate plus jamais tes créateurs.</h2>
          </div>
          <div className="two">

            <div className="feat">
              <div className="ico lime">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <h3>Découvre</h3>
              <p>Trouve les festivals, marchés et salons près de chez toi, toute l'année.</p>
            </div>

            <div className="feat">
              <div className="ico copper">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 14c1.49-1.46 3-3.2 3-5.5A5.5 5.5 0 0012 5 5.5 5.5 0 002 8.5c0 2.3 1.5 4.04 3 5.5l7 7z" />
                </svg>
              </div>
              <h3>Suis tes artisans</h3>
              <p>Sache toujours où passent tes créateurs préférés et planifie tes sorties.</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Features — Organisateur ── */}
      <section className="block v organisateur">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow o">Pour les organisateurs</span>
            <h2>Ce qui arrive pour vous.</h2>
          </div>
          <div className="features">

            <div className="feat">
              <div className="ico lime">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </div>
              <h3>Dossiers centralisés</h3>
              <p>Toutes les candidatures d'exposants au même endroit, fini les PDF et le papier.</p>
            </div>

            <div className="feat">
              <div className="ico lime">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
                </svg>
              </div>
              <h3>Candidatures en flux</h3>
              <p>Les exposants postulent en 1 clic, vous recevez tout, prêt à traiter.</p>
            </div>

            <div className="feat">
              <div className="ico lime">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-4" />
                </svg>
              </div>
              <h3>Pilotage &amp; relances</h3>
              <p>Sachez qui recontacter, quand et comment. Automatisez les relances.</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Témoignages — UGC social proof avant pricing ── */}
      <section id="temoignages" className="block v testimonials">
        <div className="wrap">
          <div className="sec-head" style={{ textAlign: 'center' }}>
            <span className="eyebrow">Ils témoignent</span>
            <h2>Des exposants comme toi.</h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '10px' }}>
              Ce qui a changé pour eux depuis Fellowship.
            </p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t) => {
              const initials = t.name.slice(0, 1).toUpperCase()
              const slug = t.entitySlug
              const Card = (
                <article className="testimonial">
                  <div className="testimonial-head">
                    {t.avatarUrl
                      ? <img src={t.avatarUrl} alt="" className="testimonial-avatar" />
                      : <div className="testimonial-avatar testimonial-avatar-fallback">{initials}</div>}
                    <div className="testimonial-meta">
                      <div className="testimonial-name">{t.name}</div>
                      <div className="testimonial-craft">{t.craft}</div>
                    </div>
                  </div>
                  <blockquote className="testimonial-quote">« {t.quote} »</blockquote>
                </article>
              )
              return slug
                ? <Link key={t.name + t.craft} to={`/${slug}`} className="testimonial-link">{Card}</Link>
                : <div key={t.name + t.craft}>{Card}</div>
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing — Exposant ── */}
      <section id="tarifs" className="block v exposant">
        <div className="wrap">
          <div className="sec-head" style={{ textAlign: 'center' }}>
            <span className="eyebrow">Tarifs</span>
            <h2>Commence gratuitement.</h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '10px' }}>
              Un seul compte. Tu passes Pro quand tu veux.
            </p>
          </div>
          <div className="tiers">

            {/* Découverte */}
            <div className="tier">
              <div className="ttl">Découverte</div>
              <div className="price">Gratuit</div>
              <div className="per">Pour toujours</div>
              <ul>
                <li><span className="ck">✓</span> Explorer des centaines de festivals</li>
                <li><span className="ck">✓</span> Suivre jusqu'à 10 dates en même temps</li>
                <li><span className="ck">✓</span> Suivre ses collègues</li>
                <li><span className="ck">✓</span> Page vitrine publique</li>
                <li><span className="ck">✓</span> Etablir ses bilans post-festivals</li>
              </ul>
              <Link to="/login" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                Commencer gratuitement
              </Link>
            </div>

            {/* Pro */}
            <div className="tier pro">
              <span className="pop">★ Pour trouver toutes tes dates</span>
              <div className="ttl">Pro</div>
              <div className="price">9,99 €</div>
              <div className="per">HT / mois</div>
              <div className="per per-ttc">soit 11,99 € TTC</div>
              <ul>
                <li><span className="ck">✓</span> Tout le plan Découverte</li>
                <li><span className="ck">✓</span> Ta tribu : où vont tes amis, nouvelles connaissances...</li>
                <li><span className="ck">✓</span> Cockpit complet</li>
                <li><span className="ck">✓</span> Accès aux discussions autour des événements</li>
                <li><span className="ck">✓</span> Rappels de deadlines</li>
                <li><span className="ck">✓</span> Avis détaillés des festivals</li>
                <li><span className="ck">✓</span> Calendrier en direct sur ton site</li>
                <li><span className="ck">✓</span> Postuler en 1 clic <em style={{ opacity: 0.7 }}>(bientôt)</em></li>
              </ul>
              <Link to="/login" className="btn btn-white" style={{ width: '100%', justifyContent: 'center' }}>
                Passer Pro
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── Pricing — Festivalier ── */}
      <section className="block v festivalier">
        <div className="wrap" style={{ textAlign: 'center', maxWidth: '560px' }}>
          <span className="eyebrow f">Tarifs</span>
          <h2 style={{ fontSize: '34px', marginTop: '10px' }}>Gratuit. Pour toujours.</h2>
          <p style={{ color: 'hsl(var(--muted-foreground))', margin: '14px 0 28px' }}>
            Découvrir, suivre et planifier ne te coûtera jamais rien. Et si un jour tu exposes, ton compte est déjà prêt.
          </p>
          <Link to="/login" className="btn btn-primary">Créer mon compte gratuit</Link>
        </div>
      </section>

      {/* ── Org teaser card (visible in exposant view) ── */}
      <section className="block v exposant">
        <div className="wrap">
          <div className="org-card">
            <div>
              <span className="soon-tag">Bientôt</span>
              <h2>Vous organisez un festival ?</h2>
              <p>Recevez les candidatures des exposants en un flux, gérez tout sans papier.</p>
            </div>
            <button
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg,var(--lime),var(--lime-d))',
                boxShadow: 'none',
              }}
              onClick={goToOrgaWaitlist}
            >
              Rejoindre la liste d'attente
            </button>
          </div>
        </div>
      </section>

      {/* ── Organisateur waitlist ── */}
      <section id="orga-waitlist" className="block v organisateur orga-waitlist-anchor">
        <div className="wrap" style={{ textAlign: 'center', maxWidth: '560px' }}>
          <h2 style={{ fontSize: '30px' }}>On vous prévient au lancement.</h2>
          <p style={{ color: 'hsl(var(--muted-foreground))', margin: '14px 0 24px' }}>
            Laissez votre email, vous serez les premiers à digitaliser la gestion de votre festival.
          </p>
          {status === 'success' ? (
            <p className="proof">Merci ! On te prévient au lancement. ✓</p>
          ) : (
            <form
              style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}
              onSubmit={(e) => { e.preventDefault(); submit(email) }}
            >
              <input
                className="em-input"
                type="email"
                name="email"
                placeholder="votre@email.fr"
                aria-label="Votre email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'submitting'}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg,var(--lime),var(--lime-d))',
                  boxShadow: 'none',
                }}
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'Envoi…' : "Je m'inscris"}
              </button>
              {status === 'error' && error && (
                <p style={{ color: 'salmon', fontSize: 13, marginTop: 8, width: '100%', textAlign: 'center' }}>{error}</p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer>
        <div className="wrap">
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '8px' }}>
            <img src="/icon.png" alt="" className="mark-img" /> Fellowship<span className="brand-dot">.</span>
          </div>
          <p>Le réseau qui fait tourner les festivals · flw.sh · © 2026</p>
          <nav className="landing-legal" aria-label="Informations légales">
            <Link to="/legal/mentions-legales">Mentions légales</Link>
            <span>·</span>
            <Link to="/legal/confidentialite">Confidentialité</Link>
            <span>·</span>
            <Link to="/legal/cgu">CGU</Link>
            <span>·</span>
            <Link to="/legal/cgv">CGV</Link>
            <span>·</span>
            <Link to="/legal/charte-communautaire">Charte</Link>
          </nav>
        </div>
      </footer>

    </div>
  )
}
