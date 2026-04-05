import { Link } from 'react-router-dom'
import type { CalendarMonth as CalendarMonthType } from '@/hooks/use-calendar'

const tagColors: Record<string, string> = {
  'médiéval': 'hsl(24 72% 44%)',
  'geek': 'hsl(220 70% 50%)',
  'marché': 'hsl(152 32% 40%)',
  'salon': 'hsl(140 40% 50%)',
  'foire': 'hsl(40 80% 50%)',
}

function getTagColor(tag: string): string {
  const key = Object.keys(tagColors).find(k => tag.toLowerCase().includes(k))
  return key ? tagColors[key] : 'hsl(24 72% 44%)'
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Monday = 0
}

interface CalendarMonthProps {
  data: CalendarMonthType
}

export function CalendarMonth({ data }: CalendarMonthProps) {
  const { month, year, label, events } = data
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const todayDate = today.getDate()
  const isEmpty = events.length === 0

  // Build set of days that have events
  const eventDays = new Set<number>()
  for (const ev of events) {
    const start = ev.startDate.getMonth() === month ? ev.startDate.getDate() : 1
    const end = ev.endDate.getMonth() === month ? ev.endDate.getDate() : daysInMonth
    for (let d = start; d <= end; d++) eventDays.add(d)
  }

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div className={`rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-4 ${isEmpty ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold capitalize">{label}</h3>
        {events.length > 0 && (
          <span className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            {events.length} évt{events.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5 mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
        {dayNames.map(d => (
          <div key={d} className="text-center text-[0.6rem] font-medium text-muted-foreground py-0.5">
            {d}
          </div>
        ))}
        {/* Empty cells before first day */}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {/* Day numbers */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const hasEvent = eventDays.has(day)
          const isToday = isCurrentMonth && day === todayDate

          return (
            <div
              key={day}
              className={`text-center text-[0.7rem] py-1 rounded-md ${
                hasEvent
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground'
              } ${isToday ? 'ring-1 ring-primary' : ''}`}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* Event list */}
      {events.length > 0 && (
        <div className="space-y-1.5">
          {events.map(ev => (
            <Link
              key={ev.id}
              to={`/evenement/${ev.id}`}
              className="block rounded-lg p-2 hover:bg-muted/50"
              style={{
                borderLeft: `3px solid ${getTagColor(ev.primaryTag)}`,
                background: `${getTagColor(ev.primaryTag)}08`,
              }}
            >
              <div className="text-xs font-semibold truncate">{ev.name}</div>
              <div className="text-[0.65rem] text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                {ev.startDate.getDate()}{ev.endDate.getDate() !== ev.startDate.getDate() ? `–${ev.endDate.getDate()}` : ''}{' '}
                {ev.startDate.toLocaleDateString('fr-FR', { month: 'short' })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
