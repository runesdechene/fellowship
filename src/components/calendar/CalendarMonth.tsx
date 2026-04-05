import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import type { CalendarMonth as CalendarMonthType } from '@/hooks/use-calendar'

const tagColors: Record<string, { bg: string; text: string; border: string }> = {
  'fantastique': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400' },
  'médiéval': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400' },
  'geek': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-400' },
  'marché': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-400' },
  'salon': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-400' },
  'foire': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400' },
  'musique': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-400' },
  'littéraire': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-400' },
  'historique': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-400' },
}

function getTagStyle(tag: string) {
  const key = Object.keys(tagColors).find(k => tag.toLowerCase().includes(k))
  return key ? tagColors[key] : { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-400' }
}

const monthEmojis = ['❄️', '💝', '🌱', '🌸', '🌹', '☀️', '🏖️', '🌙', '🍂', '🎃', '🍁', '🎄']

function formatDateRange(start: Date, end: Date): string {
  const dayStart = start.getDate()
  const dayEnd = end.getDate()
  const monthStart = start.toLocaleDateString('fr-FR', { month: 'long' })
  if (start.getTime() === end.getTime()) return `${dayStart} ${monthStart}`
  if (start.getMonth() === end.getMonth()) return `${dayStart} - ${dayEnd} ${monthStart}`
  const monthEnd = end.toLocaleDateString('fr-FR', { month: 'long' })
  return `${dayStart} ${monthStart} - ${dayEnd} ${monthEnd}`
}

interface CalendarMonthProps {
  data: CalendarMonthType
}

export function CalendarMonth({ data }: CalendarMonthProps) {
  const { month, year, label, events } = data
  const isEmpty = events.length === 0

  return (
    <div className={isEmpty ? 'py-2' : ''}>
      {/* Month header */}
      <div className="text-center mb-3">
        <div className="text-base font-bold uppercase tracking-wide">
          {monthEmojis[month]} {label}
        </div>
        <div className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
          {year}
        </div>
      </div>

      {/* Event cards */}
      {!isEmpty && (
        <div className="space-y-3">
          {events.map(ev => {
            const style = getTagStyle(ev.primaryTag)
            return (
              <Link
                key={ev.id}
                to={`/evenement/${ev.id}`}
                className={`flex gap-3 rounded-xl bg-card p-3 border-l-4 ${style.border}`}
              >
                {ev.imageUrl && (
                  <img src={ev.imageUrl} alt="" className="h-20 w-14 shrink-0 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm leading-snug truncate">{ev.name}</h4>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${style.bg} ${style.text}`}>
                    {ev.primaryTag}
                  </span>
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                    <span>{formatDateRange(ev.startDate, ev.endDate)}</span>
                    <span className="mx-1">·</span>
                    <MapPin className="h-3 w-3" />
                    <span>{ev.city}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
