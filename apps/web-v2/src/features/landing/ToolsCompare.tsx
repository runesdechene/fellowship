/**
 * QUOI     — l'ouverture de la bande Copilote : « Ta saison de festival est éparpillée », les
 *            huit outils d'aujourd'hui en vrac, serrés et qui s'agitent, une flèche dessinée, puis l'icône Fellowship, et sous
 *            son titre, où elle tourne (desktop, PWA ; Android et Apple à venir).
 * POURQUOI — maquette 2458:2329 (validée le 23/10/2026, après le Concile) : la douleur avant
 *            l'outil. Les logos sont les vrais (public/landing/), pour que l'exposant s'y reconnaisse.
 * ATTENTION — le désordre vient des données : `--tilt` penche chaque tuile, `--nudge` la décale
 *            d'un nombre de crans (le cran est un jeton de 2-semantic.css), `--i` désaccorde son
 *            agitation de celle des voisines (Uriel, 23/10/2026 : le bazar, la charge mentale).
 */
import type { CSSProperties } from 'react'
import { Monitor, Smartphone, type LucideIcon } from 'lucide-react'

interface Tool {
  logos: string[]
  name: string
  pain: string
  tilt: string
  nudge: number
}

const TOOLS: Tool[] = [
  {
    logos: ['facebook'],
    name: 'Les groupes Facebook',
    pain: '« Qui fait ce festival ? » Pas de réponse.',
    tilt: '-3deg',
    nudge: 0,
  },
  {
    logos: ['messenger', 'whatsapp'],
    name: 'Messenger, WhatsApp',
    pain: 'L’info utile, perdue dans le fil.',
    tilt: '2.5deg',
    nudge: 0,
  },
  {
    logos: ['excel', 'sheets'],
    name: 'Excel, Google Sheets',
    pain: 'Dossiers et paiements, recopiés à la main.',
    tilt: '2deg',
    nudge: 1,
  },
  {
    logos: ['gmail'],
    name: 'Gmail',
    pain: 'Les candidatures, éparpillées.',
    tilt: '-2deg',
    nudge: 2,
  },
  {
    logos: ['agenda'],
    name: 'Google Agenda',
    pain: 'Les dates, sans le reste.',
    tilt: '-1.5deg',
    nudge: 1,
  },
  {
    logos: ['postit'],
    name: 'Les post-its',
    pain: 'La date de clôture, sur le frigo.',
    tilt: '3.5deg',
    nudge: 0,
  },
  {
    logos: ['evernote'],
    name: 'Evernote',
    pain: 'Le bilan de l’an passé, quelque part.',
    tilt: '1.5deg',
    nudge: 1,
  },
  {
    logos: ['wordpress', 'wix'],
    name: 'WordPress, Wix',
    pain: 'La page « dates », refaite à la main.',
    tilt: '-2.5deg',
    nudge: 0,
  },
]

/** Où l'app tourne, à la manière des badges des stores (Uriel, 23/10/2026) : les vrais logos
 *  d'Android et d'Apple (Simple Icons, public/landing/), peints dans la couleur du badge. */
const PLATFORMS: {
  name: string
  status: 'Disponible' | 'Bientôt'
  Icon?: LucideIcon
  logo?: string
}[] = [
  { name: 'Version desktop', status: 'Disponible', Icon: Monitor },
  { name: 'Version mobile PWA', status: 'Disponible', Icon: Smartphone },
  { name: 'Version Android', status: 'Bientôt', logo: 'android' },
  { name: 'Version Apple', status: 'Bientôt', logo: 'apple' },
]

const asset = (file: string) => `${import.meta.env.BASE_URL}landing/${file}`

export function ToolsCompare() {
  return (
    <div className="landing-compare">
      <p className="landing-statement landing-compare__title">
        <strong>Ta saison de festival est éparpillée.</strong>
        <br />
        Fellowship est là pour changer ça.
      </p>
      <div className="landing-compare__row">
        <div className="landing-compare__before">
          <p className="landing-compare__label">Aujourd’hui</p>
          <ul className="landing-compare__tools">
            {TOOLS.map((tool, index) => (
              <li
                key={tool.name}
                className="landing-tool"
                style={
                  {
                    '--tilt': tool.tilt,
                    '--nudge': String(tool.nudge),
                    '--i': String(index),
                  } as CSSProperties
                }
              >
                <span className="landing-tool__logos" aria-hidden>
                  {tool.logos.map((logo) => (
                    <img key={logo} src={asset(`${logo}.svg`)} alt="" />
                  ))}
                </span>
                <span>
                  <span className="landing-tool__name">{tool.name}</span>
                  <span className="landing-tool__pain">{tool.pain}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <img className="landing-compare__arrow" src={asset('fleche.svg')} alt="" />
        <div className="landing-compare__after">
          <span className="landing-compare__icon">
            <img src={`${import.meta.env.BASE_URL}icon.png`} alt="Fellowship" />
          </span>
          <p className="landing-compare__punch">
            Une seule app.
            <br />
            <span className="landing-compare__punch-end">Toute ta saison.</span>
          </p>
          <ul className="landing-stores">
            {PLATFORMS.map(({ name, status, Icon, logo }) => (
              <li
                key={name}
                className={
                  status === 'Bientôt' ? 'landing-store landing-store--soon' : 'landing-store'
                }
              >
                {Icon ? (
                  <Icon className="landing-store__logo" strokeWidth={1.75} aria-hidden />
                ) : (
                  <span
                    className="landing-store__logo landing-store__brand"
                    style={{ '--logo': `url(${asset(`${logo}.svg`)})` } as CSSProperties}
                    aria-hidden
                  />
                )}
                <span>
                  <span className="landing-store__status">{status}</span>
                  <span className="landing-store__name">{name}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
