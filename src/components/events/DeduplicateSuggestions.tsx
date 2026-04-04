import type { Event } from '@/types/database'

interface DeduplicateSuggestionsProps {
  suggestions: Pick<Event, 'id' | 'name' | 'city' | 'department' | 'start_date' | 'end_date'>[]
  onSelect: (eventId: string) => void
  onDismiss: () => void
}

export function DeduplicateSuggestions({ suggestions, onSelect, onDismiss }: DeduplicateSuggestionsProps) {
  if (suggestions.length === 0) return null

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="rounded-xl border border-accent/30 bg-secondary p-4">
      <p className="mb-3 text-sm font-medium">Tu voulais peut-être dire ?</p>
      <div className="space-y-2">
        {suggestions.map((event) => (
          <button
            key={event.id}
            onClick={() => onSelect(event.id)}
            className="flex w-full items-center justify-between rounded-lg bg-card p-3 text-left text-sm transition-colors hover:bg-muted"
          >
            <div>
              <p className="font-medium">{event.name}</p>
              <p className="text-muted-foreground">{event.city} — {formatDate(event.start_date)}</p>
            </div>
            <span className="text-xs text-primary">Sélectionner</span>
          </button>
        ))}
      </div>
      <button onClick={onDismiss} className="mt-3 text-sm text-muted-foreground hover:text-foreground">
        Non, c'est un nouvel événement
      </button>
    </div>
  )
}
