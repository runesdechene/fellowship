import { useState } from 'react'
import { useAdminUsers } from '@/hooks/use-admin'
import { supabase } from '@/lib/supabase'
import { Loader2, Search, Ban, CheckCircle } from 'lucide-react'

export function AdminUsers() {
  const { users, loading, refetch } = useAdminUsers()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'exposant' | 'public'>('all')

  const filtered = users
    .filter(u => filter === 'all' || u.type === filter)
    .filter(u =>
      (u.display_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.brand_name ?? '').toLowerCase().includes(search.toLowerCase())
    )

  async function toggleSuspend(userId: string, currentRole: string) {
    const newRole = currentRole === 'suspended' ? 'user' : 'suspended'
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    await refetch()
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
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border text-sm"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as 'all' | 'exposant' | 'public')}
          className="rounded-xl bg-card border border-border px-3 py-2 text-sm"
        >
          <option value="all">Tous</option>
          <option value="exposant">Exposants</option>
          <option value="public">Visiteurs</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-3 font-medium">Nom</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Métier</th>
              <th className="p-3 font-medium">Inscrit le</th>
              <th className="p-3 font-medium">Statut</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-3 font-medium">{user.display_name ?? user.brand_name ?? '—'}</td>
                <td className="p-3 text-muted-foreground">{user.email}</td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.type === 'exposant'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.type === 'exposant' ? 'Exposant' : 'Visiteur'}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{user.craft_type ?? '—'}</td>
                <td className="p-3 text-muted-foreground">{new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                <td className="p-3">
                  {user.role === 'suspended' ? (
                    <span className="text-red-500 text-xs font-medium">Suspendu</span>
                  ) : (
                    <span className="text-green-600 text-xs font-medium">Actif</span>
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => toggleSuspend(user.id, user.role)}
                    className={`p-1.5 rounded-lg ${
                      user.role === 'suspended'
                        ? 'hover:bg-green-50 text-green-600'
                        : 'hover:bg-red-50 text-red-500'
                    }`}
                    title={user.role === 'suspended' ? 'Réactiver' : 'Suspendre'}
                  >
                    {user.role === 'suspended'
                      ? <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                      : <Ban className="h-4 w-4" strokeWidth={1.5} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-6 text-center text-muted-foreground">Aucun utilisateur trouvé</p>
        )}
      </div>
    </div>
  )
}
