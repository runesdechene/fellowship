import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MonthCell } from './MonthCell'
import type { CalendarMonth } from '@/hooks/use-calendar'

interface YearViewProps {
  months: CalendarMonth[]
  year: number
  onYearChange: (year: number) => void
}

export function YearView({ months, year, onYearChange }: YearViewProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => onYearChange(year - 1)} className="rounded-lg p-2 hover:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold">{year}</h2>
        <button onClick={() => onYearChange(year + 1)} className="rounded-lg p-2 hover:bg-muted">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {months.map((month) => (
          <MonthCell
            key={month.month}
            label={month.label}
            events={month.events}
            onClick={() => {}}
          />
        ))}
      </div>
    </div>
  )
}
