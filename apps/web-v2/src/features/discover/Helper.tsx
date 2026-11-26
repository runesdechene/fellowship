/**
 * QUOI     — « Tout ce qu'il suit pour toi » : cinq aides qui se relaient, au choix ou seules.
 * POURQUOI — maquette du 26/11/2026.
 * ATTENTION — les phrases occupent la même case : l'encadré ne change pas de hauteur.
 */
import { BellRing, CalendarDays, ChartColumn, Users, Wallet } from 'lucide-react'
import { useCycle } from './useCycle'

const HELPS = [
  { Icon: CalendarDays, name: 'Le calendrier', line: 'Il range ta saison, mois par mois' },
  { Icon: BellRing, name: 'Les clôtures', line: 'Il te prévient avant que ça ferme' },
  { Icon: Wallet, name: 'Les paiements', line: 'Il garde l’œil sur ce qu’il reste à payer' },
  { Icon: Users, name: 'Les amis', line: 'Il te montre où vont les exposants que tu suis' },
  { Icon: ChartColumn, name: 'Les bilans', line: 'Il te dit si ça valait le coup d’y retourner' },
] as const

const HELP_MS = 3200

export function Helper() {
  const [current, show] = useCycle(HELPS.length, HELP_MS)

  return (
    <section className="discover-helper">
      <div className="discover-helper__box">
        <h2 className="discover-title">Tout ce qu’il suit pour toi</h2>
        <div className="discover-helper__choices">
          {HELPS.map(({ Icon, name }, index) => (
            <button
              key={name}
              type="button"
              className={`discover-helper__choice${index === current ? ' is-on' : ''}`}
              aria-label={name}
              aria-pressed={index === current}
              onClick={() => {
                show(index)
              }}
            >
              <Icon size={24} strokeWidth={1.8} aria-hidden />
            </button>
          ))}
        </div>
        <div className="discover-helper__lines">
          {HELPS.map(({ name, line }, index) => (
            <p
              key={name}
              className={index === current ? 'is-on' : undefined}
              aria-hidden={index !== current}
            >
              {line}
            </p>
          ))}
        </div>
        <p className="discover-helper__text">
          Tu choisis tes festivals. Les dates, les clôtures et les paiements se suivent au même
          endroit.
        </p>
      </div>
    </section>
  )
}
