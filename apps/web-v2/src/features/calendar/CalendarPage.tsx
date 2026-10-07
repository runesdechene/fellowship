/**
 * QUOI     — l'écran Calendrier (/calendrier) : l'en-tête, les deux filtres, la navigation des douze
 *            mois, puis la frise horizontale des mois.
 * POURQUOI — l'artisan voit son année d'un coup : où il va, où en est chaque dossier, qui sera là.
 * ATTENTION — le mois visible vit dans l'adresse (?mois=AAAA-MM) : le retour du navigateur ramène
 *            au bon endroit. La frise glisse de gauche à droite — seule exception admise au « jamais
 *            de scroll interne » (décision du 07/10/2026). Les filtres sont retenus sur l'appareil.
 */
import { Star, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { calendarHeadline, navWindow, scrollFromPointer } from '@/lib/calendar'
import { MonthColumn } from './MonthColumn'
import { MonthNav } from './MonthNav'
import { useEasedScroll } from './useEasedScroll'
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
  const [view, setView] = useState({ start: 0, size: 1 })
  const [dragging, setDragging] = useState(false)
  const { frieze, glideTo, stop, destination } = useEasedScroll()
  const wanted = params.get('mois')
  const last = months[months.length - 1]

  const scrollToMonth = useCallback(
    (key: string, smooth: boolean) => {
      const column = document.getElementById(`mois-${key}`)
      if (!column || !frieze.current) return
      // La marge intérieure de la frise : le mois s'aligne sur elle, sous le titre.
      const gutter = parseFloat(getComputedStyle(frieze.current).paddingLeft) || 0
      frieze.current.scrollTo({
        left: column.offsetLeft - frieze.current.offsetLeft - gutter,
        behavior: smooth ? 'smooth' : 'auto',
      })
    },
    [frieze],
  )

  // À l'arrivée, et à l'arrivée SEULEMENT, la frise se cale d'un coup sur le mois de l'adresse.
  // Ensuite, c'est le clic qui écrit l'adresse : se recaler à chaque changement écrasait son
  // glissement animé par un saut (bug signalé par Uriel le 08/10/2026).
  const arrived = useRef(false)
  useEffect(() => {
    if (loading || arrived.current) return
    arrived.current = true
    if (wanted) scrollToMonth(wanted, false)
  }, [loading, wanted, scrollToMonth])

  /** La fenêtre de la navigation suit la frise, au pixel près. */
  const measure = useCallback(() => {
    const el = frieze.current
    if (el) setView(navWindow(el.scrollLeft, el.scrollWidth, el.clientWidth))
  }, [frieze])

  // Une fois les mois posés, et à chaque changement de taille de la fenêtre du navigateur.
  useEffect(() => {
    if (loading) return
    measure()
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
    }
  }, [loading, measure])

  function pick(key: string) {
    setParams({ mois: key }, { replace: true })
    scrollToMonth(key, true)
  }

  /** Après un glisser : la frise se cale, en glissant, sur le mois le plus proche de là où l'on a lâché. */
  function settle() {
    stop()
    const el = frieze.current
    const first = el?.firstElementChild
    if (!el || !(first instanceof HTMLElement)) return
    const step = first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0')
    const month = months[Math.round(destination() / step)]
    if (month) pick(month.key)
  }

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

        <MonthNav
          months={months}
          view={view}
          onDrag={(pointer, grab) => {
            const el = frieze.current
            if (el) glideTo(scrollFromPointer(pointer, grab, el.scrollWidth, el.clientWidth))
          }}
          onPick={pick}
          onDragging={setDragging}
          onSettle={settle}
        />
      </header>

      <div
        className={dragging ? 'calendar__frieze calendar__frieze--dragging' : 'calendar__frieze'}
        ref={frieze}
        onScroll={measure}
      >
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
