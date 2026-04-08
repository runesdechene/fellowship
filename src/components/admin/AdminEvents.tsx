import { useState } from 'react'
import { useAdminEvents, adminDeleteEvent } from '@/hooks/use-admin'
import { Loader2, Trash2, ExternalLink, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function AdminEvents() {
  const { events, loading, refetch } = useAdminEvents()
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const navigate = useNavigate()

  const filtered = events.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer "${name}" ? Cette action est irréversible.`)) return
    setDeleting(id)
    await adminDeleteEvent(id)
    await refetch()
    setDeleting(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Rechercher un événement..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-3 font-medium">Nom</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Ville</th>
              <th className="p-3 font-medium">Créateur</th>
              <th className="p-3 font-medium">Participants</th>
              <th className="p-3 font-medium">Tag</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(event => (
              <tr key={event.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-3 font-medium">{event.name}</td>
                <td className="p-3 text-muted-foreground">{new Date(event.start_date).toLocaleDateString('fr-FR')}</td>
                <td className="p-3">{event.city}</td>
                <td className="p-3 text-muted-foreground">{event.creator_name ?? '—'}</td>
                <td className="p-3">{event.participant_count}</td>
                <td className="p-3">{event.primary_tag}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/evenement/${event.id}`)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                      title="Voir"
                    >
                      <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id, event.name)}
                      disabled={deleting === event.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                      title="Supprimer"
                    >
                      {deleting === event.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-6 text-center text-muted-foreground">Aucun événement trouvé</p>
        )}
      </div>
    </div>
  )
}
