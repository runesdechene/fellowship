import { AlertTriangle } from 'lucide-react'

interface EventSuggestion {
  id: string; name: string; city: string; department: string; start_date: string; end_date: string; score?: number
}

interface DeduplicateSuggestionsProps {
  suggestions: EventSuggestion[]
  onSelect: (eventId: string) => void
  onDismiss: () => void
}

export function DeduplicateSuggestions({ suggestions, onSelect, onDismiss }: DeduplicateSuggestionsProps) {
  if (suggestions.length === 0) return null

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 p-4" style={{ background: 'hsl(40 80% 96%)' }}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <p className="text-sm font-medium text-amber-800">Attention, cet événement existe peut-être déjà !</p>
      </div>
      <div className="space-y-2">
        {suggestions.map((event) => (
          <button
            key={event.id}
            onClick={() => onSelect(event.id)}
            className="flex w-full items-center justify-between rounded-lg bg-white/80 p-3 text-left text-sm transition-colors hover:bg-white"
          >
            <div>
              <p className="font-medium">{event.name}</p>
              <p className="text-muted-foreground">
                {event.city} — {formatDate(event.start_date)}
                {event.score != null && event.score > 0.6 && (
                  <span className="ml-2 text-amber-600 font-medium">Très similaire</span>
                )}
              </p>
            </div>
            <span className="text-xs text-primary font-medium">Voir →</span>
          </button>
        ))}
      </div>
      <button onClick={onDismiss} className="mt-3 text-sm text-muted-foreground hover:text-foreground">
        Non, c'est un nouvel événement
      </button>
    </div>
  )
}
