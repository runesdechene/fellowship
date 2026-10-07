/**
 * QUOI     — charge et prépare le calendrier de l'acteur actif : ses dates des douze prochains mois,
 *            les amis présents sur chacune, et les compagnons (les dates de ses amis où il ne va pas).
 * POURQUOI — un seul hook pour l'écran ; la logique de rangement vit dans lib/calendar.ts.
 * ATTENTION — patron du dépôt : un chargement rend son résultat, l'effet l'applique une fois.
 *            Les « Intéressé » sont chargées mais ne comptent jamais ; l'écran les montre sur option.
 */
import { useEffect, useState } from 'react'
import { bucketByStartMonth } from '@/lib/calendar'
import { daysUntil, monthsWindow, parseSqlDate, todayIso, type MonthSlot } from '@/lib/dates'
import {
  PROGRAMMED_STATUSES,
  fetchCompanions,
  fetchFriendsByEvent,
  type CompanionEvent,
  type Friend,
} from '@/lib/friends'
import { must, supabase } from '@/lib/supabase'
import type { ParticipationStatus } from '@/types/database'

/** Les statuts que le calendrier charge : tout, sauf le refus. */
const CALENDAR_STATUSES: ParticipationStatus[] = ['interesse', ...PROGRAMMED_STATUSES]

const MONTH_COUNT = 12

export interface CalendarDate {
  eventId: string
  name: string
  place: string
  imageUrl: string | null
  startDate: Date
  endDate: Date
  status: ParticipationStatus
  daysAway: number
  friends: Friend[]
}

export interface CalendarCompanion {
  eventId: string
  name: string
  startDate: Date
  endDate: Date
  friends: Friend[]
}

export interface CalendarMonth extends MonthSlot {
  dates: CalendarDate[]
  companions: CalendarCompanion[]
}

export interface CalendarData {
  months: CalendarMonth[]
  /** Les dates engagées (hors « Intéressé ») de la fenêtre. */
  count: number
  daysToNext: number | null
  loading: boolean
  error: string | null
}

const EMPTY: CalendarData = { months: [], count: 0, daysToNext: null, loading: true, error: null }

function isEngaged(status: ParticipationStatus): boolean {
  return PROGRAMMED_STATUSES.includes(status)
}

async function loadCalendar(actorId: string, today: Date): Promise<CalendarData> {
  const slots = monthsWindow(MONTH_COUNT, today)
  const last = slots[slots.length - 1]
  const windowEnd = last ? new Date(last.date.getFullYear(), last.date.getMonth() + 1, 1) : today
  const fromSql = todayIso(today)
  const toSql = todayIso(windowEnd)

  const rows = must(
    await supabase
      .from('participations')
      .select('status, event_id, events!inner(*)')
      .eq('actor_id', actorId)
      .in('status', CALENDAR_STATUSES)
      .gte('events.end_date', fromSql)
      .lt('events.start_date', toSql),
  )
  const myEventIds = new Set(rows.map((row) => row.event_id))

  const [friendsByEvent, companions] = await Promise.all([
    fetchFriendsByEvent(actorId, [...myEventIds]),
    fetchCompanions(actorId, fromSql, toSql, myEventIds),
  ])

  const dates = rows.map<CalendarDate>((row) => {
    const startDate = parseSqlDate(row.events.start_date)
    return {
      eventId: row.event_id,
      name: row.events.name,
      place: `${row.events.city} (${row.events.department})`,
      imageUrl: row.events.image_url,
      startDate,
      endDate: parseSqlDate(row.events.end_date),
      status: row.status,
      daysAway: daysUntil(startDate, today),
      friends: friendsByEvent.get(row.event_id) ?? [],
    }
  })

  const companionDates = companions.map<CalendarCompanion>((c: CompanionEvent) => ({
    eventId: c.eventId,
    name: c.name,
    startDate: parseSqlDate(c.startDate),
    endDate: parseSqlDate(c.endDate),
    friends: c.friends,
  }))

  const dateBuckets = bucketByStartMonth(dates, slots)
  const companionBuckets = bucketByStartMonth(companionDates, slots)
  const engaged = dates.filter((date) => isEngaged(date.status))
  const next = engaged.reduce<CalendarDate | null>(
    (soonest, date) => (!soonest || date.startDate < soonest.startDate ? date : soonest),
    null,
  )

  return {
    months: slots.map((slot) => ({
      ...slot,
      dates: dateBuckets.get(slot.key) ?? [],
      companions: companionBuckets.get(slot.key) ?? [],
    })),
    count: engaged.length,
    daysToNext: next ? Math.max(0, next.daysAway) : null,
    loading: false,
    error: null,
  }
}

/** Le calendrier de l'acteur actif. */
export function useCalendar(actorId: string | null | undefined): CalendarData {
  const [state, setState] = useState<CalendarData>(EMPTY)

  useEffect(() => {
    if (!actorId) return
    let cancelled = false

    async function run(currentActorId: string) {
      setState((s) => ({ ...s, loading: true, error: null }))
      let next: CalendarData
      try {
        next = await loadCalendar(currentActorId, new Date())
      } catch {
        next = { ...EMPTY, loading: false, error: 'Ton calendrier n’a pas pu être chargé.' }
      }
      if (cancelled) return
      setState(next)
    }

    void run(actorId)
    return () => {
      cancelled = true
    }
  }, [actorId])

  if (!actorId) return { ...EMPTY, loading: false }
  return state
}
