/**
 * QUOI     — « Tout ce qui fait tourner ta saison, au même endroit. » : les six fonctions, chacune
 *            avec sa vignette.
 * POURQUOI — maquette 2104:86 ; les vignettes sont des dessins qui expliquent une fonction, avec
 *            les exemples de la maquette (Les Aventuriales, Arbor Pagan Fest…), pas des données.
 * ATTENTION — vignettes en HTML et CSS, jamais une capture collée : elles suivent le thème sombre.
 */
import {
  CalendarDays,
  Code,
  Coins,
  FileText,
  MessageCircle,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Stars } from '@/components/ui/Stars'

const POSTER = {
  aventuriales: 'landing/les-aventuriales.png',
  arbor: 'landing/arbor-pagan-fest.png',
  limoges: 'landing/limoges-tattoo-show.png',
  planer: 'landing/plane-r-fest.png',
} as const

function poster(name: keyof typeof POSTER): string {
  return `${import.meta.env.BASE_URL}${POSTER[name]}`
}

function EmbedArt() {
  const rows = [
    { image: poster('aventuriales'), label: 'Les Aventuriales · 25 oct.' },
    { image: poster('arbor'), label: 'Arbor Pagan Fest · 21 nov.' },
    { image: poster('planer'), label: 'Plane’R Fest · 6 févr.' },
  ]
  return (
    <div className="landing-art__sheet landing-art__sheet--embed">
      <p className="landing-art__url">Mes prochains marchés — atelier-corne-et-cuir.fr</p>
      <ul className="landing-art__embed-rows">
        {rows.map((row) => (
          <li key={row.label}>
            <img src={row.image} alt="" />
            {row.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function YearArt() {
  const months = [
    { label: 'Oct', image: poster('aventuriales') },
    { label: 'Nov', image: poster('limoges') },
    { label: 'Déc', image: null },
    { label: 'Janv', image: poster('planer') },
  ]
  return (
    <ul className="landing-art__year">
      {months.map((month, index) => (
        <li key={month.label} className={index === 0 ? 'landing-art__month--now' : undefined}>
          <span className="landing-art__month">{month.label}</span>
          {month.image ? <img src={month.image} alt="" /> : <span className="landing-art__free" />}
        </li>
      ))}
    </ul>
  )
}

function FriendsArt() {
  return (
    <div className="landing-art__friends">
      <ul className="landing-art__faces">
        {['G', 'L', 'T', 'N', '+5'].map((initial) => (
          <li key={initial}>{initial}</li>
        ))}
      </ul>
      <p>
        <strong>9 compagnons</strong> vont à Arbor Pagan Fest
      </p>
    </div>
  )
}

function DossierArt() {
  return (
    <div className="landing-art__sheet landing-art__sheet--dossier">
      <p className="landing-art__strong">Les Aventuriales</p>
      <p className="landing-art__soft">Acompte versé · 150 € sur 450 €</p>
      <span className="landing-art__gauge">
        <span />
      </span>
      <p className="landing-art__pale">Solde de 300 € avant le 15 octobre</p>
    </div>
  )
}

function InfosArt() {
  const facts = [
    ['Date limite', '7 juillet'],
    ['Comment', 'Dossier par e-mail'],
    ['Contact', 'exposants@…'],
  ]
  return (
    <dl className="landing-art__sheet landing-art__sheet--infos">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ReviewsArt() {
  return (
    <div className="landing-art__reviews">
      <div>
        <p className="landing-art__score">4,3</p>
        <Stars score={4.3} />
      </div>
      <div className="landing-art__sheet landing-art__sheet--question">
        <p className="landing-art__question">« L’électricité est fournie ? »</p>
        <p className="landing-art__soft">Oui, une prise 16 A par stand.</p>
      </div>
    </div>
  )
}

interface Feature {
  Icon: LucideIcon
  title: string
  text: string
  art: ReactNode
}

const FEATURES: readonly Feature[] = [
  {
    Icon: Code,
    title: 'Ton calendrier sur ton site',
    text: 'Tes prochaines dates s’affichent toutes seules sur ton site et tes réseaux. Tu ajoutes un festival, ta page se met à jour.',
    art: <EmbedArt />,
  },
  {
    Icon: CalendarDays,
    title: 'Toute ton année d’un coup d’œil',
    text: 'Une frise de tes mois à venir, chaque date avec son affiche et son statut : intéressé, dossier envoyé, inscrit.',
    art: <YearArt />,
  },
  {
    Icon: Users,
    title: 'Tes dates, grâce à tes amis',
    text: 'Vois où vont les exposants que tu suis, découvre des festivals par ceux qui y vont, retrouve-toi sur les mêmes stands.',
    art: <FriendsArt />,
  },
  {
    Icon: Coins,
    title: 'Tes dossiers et tes paiements',
    text: 'Dossier envoyé, acompte versé, solde dû avant le 15 : tu sais toujours à qui tu as payé et ce qui reste à régler.',
    art: <DossierArt />,
  },
  {
    Icon: FileText,
    title: 'Les infos d’inscription réunies',
    text: 'Date limite, comment candidater, lien du dossier, contact, ce que tu as envoyé : plus besoin de fouiller tes mails.',
    art: <InfosArt />,
  },
  {
    Icon: MessageCircle,
    title: 'Les avis et les questions des exposants',
    text: 'Pose tes questions à ceux qui y sont allés, lis leurs avis et leurs notes : affluence, organisation, rentabilité.',
    art: <ReviewsArt />,
  },
]

export function Features() {
  return (
    <div className="landing-band">
      <section className="landing-section landing-features" id="apport">
        <p className="landing-eyebrow">Ce que les exposants nous ont demandé</p>
        <h2 className="landing-display">Tout ce qui fait tourner ta saison, au même endroit.</h2>
        <ul className="landing-features__grid">
          {FEATURES.map(({ Icon, title, text, art }) => (
            <li key={title} className="landing-feature">
              <div className="landing-art" aria-hidden>
                {art}
              </div>
              <h3 className="landing-feature__title">
                <Icon size={18} strokeWidth={1.75} aria-hidden />
                {title}
              </h3>
              <p className="landing-feature__text">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
