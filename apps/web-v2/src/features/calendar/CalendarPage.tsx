/**
 * QUOI     — l'écran Calendrier (/calendrier) : l'en-tête, les deux filtres, la navigation des douze
 *            mois, puis la frise horizontale des mois.
 * POURQUOI — l'artisan voit son année d'un coup : où il va, où en est chaque dossier, qui sera là.
 * ATTENTION — le mois visible vit dans l'adresse (?mois=AAAA-MM) : le retour du navigateur ramène
 *            au bon endroit. La frise glisse de gauche à droite — seule exception admise au « jamais
 *            de scroll interne » (décision du 07/10/2026). Les filtres sont retenus sur l'appareil.
 */
import { Star, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { calendarHeadline } from '@/lib/calendar'
import { formatMonthAbbr } from '@/lib/dates'
import { MonthColumn } from './MonthColumn'
import { useCalendar } from './useCalendar'

const FRIENDS_KEY = 'flw-calendrier-amis'
const INTERESTED_KEY = 'flw-calendrier-interesse'

/** Un réglage retenu sur l'appareil ; la page marche sans (navigation privée, stockage bloqué). */
function useStoredToggle(key: string, initial: boolean): [boolean, () => void] {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored === null ? initial : stored === '1'
    } catch {
      return initial
    }
  })
  const toggle = useCallback(() => {
    setValue((current) => {
      try {
        localStorage.setItem(key, current ? '0' : '1')
      } catch {
        /* sans stockage, le réglage vaut pour la visite */
      }
      return !current
    })
  }, [key])
  return [value, toggle]
}

function Toggle({
  label,
  on,
  onToggle,
  icon,
}: {
  label: string
  on: boolean
  onToggle: () => void
  icon: typeof Users
}) {
  const Icon = icon
  return (
    <button type="button" className="calendar-toggle" aria-pressed={on} onClick={onToggle}>
      <Icon size={14} strokeWidth={1.9} />
      {label}
      <span className="calendar-toggle__switch" aria-hidden="true" />
    </button>
  )
}

export function CalendarPage() {
  const { actor } = useAuth()
  const { months, count, daysToNext, loading, error } = useCalendar(actor?.id)
  const [showFriends, toggleFriends] = useStoredToggle(FRIENDS_KEY, true)
  const [showInterested, toggleInterested] = useStoredToggle(INTERESTED_KEY, false)
  const [params, setParams] = useSearchParams()
  const frieze = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(0)
  const wanted = params.get('mois')
  const last = months[months.length - 1]

  const scrollToMonth = useCallback((key: string, smooth: boolean) => {
    const column = document.getElementById(`mois-${key}`)
    if (!column || !frieze.current) return
    frieze.current.scrollTo({
      left: column.offsetLeft - frieze.current.offsetLeft,
      behavior: smooth ? 'smooth' : 'auto',
    })
  }, [])

  // À l'arrivée, la frise se cale sur le mois demandé par l'adresse.
  useEffect(() => {
    if (!loading && wanted) scrollToMonth(wanted, false)
  }, [loading, wanted, scrollToMonth])

  function onScroll() {
    const el = frieze.current
    const first = el?.firstElementChild
    if (!el || !(first instanceof HTMLElement)) return
    const step = first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0')
    setVisible(Math.round(el.scrollLeft / step))
  }

  function pick(key: string) {
    setParams({ mois: key }, { replace: true })
    scrollToMonth(key, true)
  }

  const max = Math.max(
    1,
    ...months.map((m) => m.dates.filter((d) => d.status !== 'interesse').length),
  )

  return (
    <div className="calendar">
      <header className="calendar__head">
        <div className="calendar__title-block">
          <h1 className="calendar__title">Calendrier</h1>
          <p className="calendar__headline">
            {loading
              ? 'Chargement de ton année…'
              : error
                ? error
                : last
                  ? calendarHeadline(count, last.date, daysToNext)
                  : ''}
          </p>
          <div className="calendar__filters">
            <Toggle label="Mes amis" on={showFriends} onToggle={toggleFriends} icon={Users} />
            <Toggle label="Intéressé" on={showInterested} onToggle={toggleInterested} icon={Star} />
          </div>
        </div>

        <nav className="month-nav" aria-label="Aller à un mois">
          {months.map((month, index) => {
            const n = month.dates.filter((d) => d.status !== 'interesse').length
            const inView = index >= visible && index < visible + 4
            return (
              <button
                key={month.key}
                type="button"
                className={
                  inView ? 'month-nav__month month-nav__month--in-view' : 'month-nav__month'
                }
                onClick={() => {
                  pick(month.key)
                }}
                aria-label={`${month.label} : ${n} ${n === 1 ? 'date' : 'dates'}`}
              >
                <span
                  className={n > 0 ? 'month-nav__bar' : 'month-nav__bar month-nav__bar--empty'}
                  style={{ '--bar-ratio': String(n / max) } as CSSProperties}
                />
                <span className="month-nav__label">{formatMonthAbbr(month.date)}</span>
              </button>
            )
          })}
        </nav>
      </header>

      <div className="calendar__frieze" ref={frieze} onScroll={onScroll}>
        {months.map((month, index) => (
          <MonthColumn
            key={month.key}
            month={month}
            current={index === 0}
            showFriends={showFriends}
            showInterested={showInterested}
          />
        ))}
      </div>
    </div>
  )
}
