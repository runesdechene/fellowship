import { useMemo } from 'react'
import type { ParticipationWithEvent } from '@/types/database'

export interface CalendarEvent {
  id: string
  name: string
  startDate: Date
  endDate: Date
  primaryTag: string
  status: string
  visibility: string
  city: string
  department: string
  imageUrl: string | null
  isFriend?: boolean
  friendName?: string
}

export interface CalendarMonth {
  month: number
  year: number
  label: string
  events: CalendarEvent[]
}

export function useCalendarYear(participations: ParticipationWithEvent[], year: number): CalendarMonth[] {
  return useMemo(() => {
    const months: CalendarMonth[] = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      year,
      label: new Date(year, i).toLocaleDateString('fr-FR', { month: 'long' }),
      events: [],
    }))

    for (const p of participations) {
      if (!p.events) continue
      const start = new Date(p.events.start_date)
      const end = new Date(p.events.end_date)

      for (let m = start.getMonth(); m <= end.getMonth(); m++) {
        if (start.getFullYear() === year || end.getFullYear() === year) {
          months[m]?.events.push({
            id: p.events.id,
            name: p.events.name,
            startDate: start,
            endDate: end,
            primaryTag: p.events.primary_tag,
            status: p.status,
            visibility: p.visibility,
            city: p.events.city,
            department: p.events.department,
            imageUrl: p.events.image_url,
          })
        }
      }
    }

    return months
  }, [participations, year])
}
