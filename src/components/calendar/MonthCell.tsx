import { Link } from 'react-router-dom'

interface CalendarEvent {
  id: string
  name: string
  startDate: Date
  endDate: Date
  primaryTag: string
  status: string
}

interface MonthCellProps {
  label: string
  events: CalendarEvent[]
  onClick: () => void
}

const tagColors: Record<string, string> = {
  'médiéval': 'bg-purple-400',
  'geek': 'bg-blue-400',
  'marché': 'bg-accent',
  'salon': 'bg-green-400',
  'foire': 'bg-yellow-400',
}

function getTagColor(tag: string): string {
  const key = Object.keys(tagColors).find(k => tag.toLowerCase().includes(k))
  return key ? tagColors[key] : 'bg-primary'
}

export function MonthCell({ label, events, onClick }: MonthCellProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-xl border border-border bg-card p-3 text-left transition-shadow hover:shadow-md min-h-[100px]"
    >
      <span className="text-sm font-semibold capitalize">{label}</span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {events.map((event) => (
          <Link
            key={event.id}
            to={`/evenement/${event.id}`}
            onClick={(e) => e.stopPropagation()}
            title={event.name}
            className={`h-3 w-3 rounded-full ${getTagColor(event.primaryTag)} transition-transform hover:scale-125`}
          />
        ))}
        {events.length === 0 && (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </div>
      {events.length > 0 && (
        <span className="mt-auto pt-2 text-xs text-muted-foreground">
          {events.length} événement{events.length > 1 ? 's' : ''}
        </span>
      )}
    </button>
  )
}
