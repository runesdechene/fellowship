import { useState } from 'react'
import { useEvents } from '@/hooks/use-events'
import { EventCard } from '@/components/events/EventCard'
import { EventForm } from '@/components/events/EventForm'
import { Button } from '@/components/ui/button'
import { PRIMARY_TAGS } from '@/lib/constants'
import { Search, SlidersHorizontal, Plus, X } from 'lucide-react'

function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="h-44 animate-pulse bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  )
}

export function ExplorerPage() {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { events, loading } = useEvents({
    search: search || undefined,
    department: department || undefined,
    tag: selectedTag || undefined,
  })

  const hasSearched = search.length > 0
  const noResults = hasSearched && events.length === 0 && !loading

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl">Explorer</h1>
        <p className="text-muted-foreground text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>Trouve ton prochain événement</p>
      </div>

      {/* Search */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className="w-full rounded-full border border-input bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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

        {/* Tag filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag('')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${
              !selectedTag ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            Tous
          </button>
          {PRIMARY_TAGS.map(tag => (
            <button
              key={tag.value}
              onClick={() => setSelectedTag(selectedTag === tag.value ? '' : tag.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${
                selectedTag === tag.value ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <input
              type="text"
              className="w-full rounded-full border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Filtrer par département (ex: 77)"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <EventCardSkeleton key={i} />)}
        </div>
      ) : noResults ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground/20" />
          <h3 className="mt-4 text-lg">Aucun résultat pour "{search}"</h3>
          <p className="mt-2 text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            Cet événement n'existe pas encore sur Fellowship
          </p>
          <Button className="mt-5" onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Créer "{search}"
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground/20" />
          <h3 className="mt-4 text-lg">Aucun événement</h3>
          <p className="mt-2 text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            Commence par chercher un événement ou crée le premier !
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCreateModal(false)}>
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg">Nouvel événement</h2>
              <button onClick={() => setShowCreateModal(false)} className="rounded-full p-1.5 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <EventForm onClose={() => setShowCreateModal(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
