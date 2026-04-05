import { Link } from 'react-router-dom'
import { Calendar, MapPin } from 'lucide-react'
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

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  if (start.getTime() === end.getTime()) return start.toLocaleDateString('fr-FR', opts)
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.toLocaleDateString('fr-FR', opts)}`
  }
  return `${start.toLocaleDateString('fr-FR', opts)} — ${end.toLocaleDateString('fr-FR', opts)}`
}

interface CalendarMonthProps {
  data: CalendarMonthType
}

export function CalendarMonth({ data }: CalendarMonthProps) {
  const { label, events } = data
  const isEmpty = events.length === 0

  return (
    <div className={`rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-4 ${isEmpty ? 'opacity-40' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold capitalize">{label}</h3>
        {events.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary" style={{ fontFamily: "'Inter', sans-serif" }}>
            {events.length}
          </span>
        )}
      </div>

      {/* Events */}
      {isEmpty ? (
        <p className="py-4 text-center text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
          Aucun événement
        </p>
      ) : (
        <div className="space-y-2">
          {events.map(ev => (
            <Link
              key={ev.id}
              to={`/evenement/${ev.id}`}
              className="group block overflow-hidden rounded-xl hover:shadow-md"
              style={{ borderLeft: `4px solid ${getTagColor(ev.primaryTag)}` }}
            >
              {ev.imageUrl ? (
                <div className="relative h-24 overflow-hidden">
                  <img src={ev.imageUrl} alt={ev.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs font-bold text-white truncate">{ev.name}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 px-3 pt-2.5">
                  <p className="text-sm font-bold truncate group-hover:text-primary">{ev.name}</p>
                </div>
              )}
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/20" style={{ fontFamily: "'Inter', sans-serif" }}>
                <span className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDateRange(ev.startDate, ev.endDate)}
                </span>
                <span className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {ev.city}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
