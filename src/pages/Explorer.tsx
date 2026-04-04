import { useState } from 'react'
import { useEvents } from '@/hooks/use-events'
import { EventCard } from '@/components/events/EventCard'
import { EventForm } from '@/components/events/EventForm'
import { Button } from '@/components/ui/button'
import { Search, Plus, X, SlidersHorizontal } from 'lucide-react'

export function ExplorerPage() {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [tag, setTag] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { events, loading } = useEvents({
    search: search || undefined,
    department: department || undefined,
    tag: tag || undefined,
  })

  const inputClass = "w-full rounded-xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Explorer</h1>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showCreateForm ? 'Fermer' : 'Créer un événement'}
        </Button>
      </div>

      {showCreateForm && (
        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Nouvel événement</h2>
          <EventForm />
        </div>
      )}

      {/* Search + Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className={`${inputClass} pl-10`}
              placeholder="Rechercher un événement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-primary/10' : ''}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              className={inputClass}
              placeholder="Département (ex: 77)"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
            <input
              type="text"
              className={inputClass}
              placeholder="Tag (ex: Médiéval)"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-4 font-semibold">Aucun événement trouvé</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {search ? 'Essaie avec d\'autres mots-clés' : 'Sois le premier à créer un événement !'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
