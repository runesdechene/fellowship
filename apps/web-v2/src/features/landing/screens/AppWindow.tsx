/**
 * QUOI     — la fenêtre où la landing montre un écran de l'application : la barre aux trois
 *            points et « flw.sh — {titre} », puis l'écran dessiné à sa vraie taille et réduit.
 * POURQUOI — maquette 2290:2 : les bandes montrent le vrai produit. Les écrans sont reproduits
 *            ici (un écran de la landing n'importe pas une page de l'app) et nourris par la base.
 * ATTENTION — l'écran est dessiné en largeur réelle puis réduit par `--window-scale` ; la hauteur
 *            visible vient de `height`. La barre latérale est celle de l'exposant de démonstration.
 */
import { CalendarDays, CircleGauge, Telescope, Users } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { DEMO } from '@/lib/landing-demo'

const NAV = [
  { label: 'Explorer', Icon: Telescope },
  { label: 'Calendrier', Icon: CalendarDays },
  { label: 'Communauté', Icon: Users },
  { label: 'Tableau de bord', Icon: CircleGauge },
] as const

interface AppWindowProps {
  title: string
  /** Largeur et hauteur affichées, en pixels. */
  width: number
  height: number
  scale?: number
  /** L'entrée de la barre latérale allumée ; sans elle, pas de barre latérale. */
  active?: (typeof NAV)[number]['label']
  className?: string
  children: ReactNode
}

export function AppWindow({
  title,
  width,
  height,
  scale = 0.5,
  active,
  className,
  children,
}: AppWindowProps) {
  return (
    <div
      className={`landing-window${className ? ` ${className}` : ''}`}
      style={
        {
          '--window-width': `${String(width)}px`,
          '--window-height': `${String(height)}px`,
          '--window-scale': String(scale),
        } as CSSProperties
      }
    >
      <div className="landing-window__bar">
        <span className="landing-window__dots" />
        flw.sh — {title}
      </div>
      <div className="landing-window__view">
        <div className="landing-window__canvas">
          {active && (
            <aside className="landing-app__side">
              <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" />
              <div className="landing-app__account">
                <span className="landing-app__avatar">{DEMO.initials}</span>
                <span>
                  <strong>{DEMO.name}</strong>
                  <small>Compte exposant</small>
                </span>
              </div>
              <nav>
                {NAV.map(({ label, Icon }) => (
                  <span key={label} className={label === active ? 'is-on' : undefined}>
                    <Icon size={20} strokeWidth={1.75} />
                    {label}
                  </span>
                ))}
              </nav>
            </aside>
          )}
          <div className="landing-app__main">{children}</div>
        </div>
      </div>
    </div>
  )
}
