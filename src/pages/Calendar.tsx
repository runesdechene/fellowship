import { useState } from 'react'
import { useMyParticipations } from '@/hooks/use-participations'
import { useCalendarYear } from '@/hooks/use-calendar'
import { CalendarMonth } from '@/components/calendar/CalendarMonth'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { participations, loading } = useMyParticipations(year)
  const months = useCalendarYear(participations, year)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendrier</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(year - 1)}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[4rem] text-center text-lg font-bold" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
            {year}
          </span>
          <button
            onClick={() => setYear(year + 1)}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {months.map(month => (
            <CalendarMonth key={month.month} data={month} />
          ))}
        </div>
      )}
    </div>
  )
}
