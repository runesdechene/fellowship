/**
 * QUOI     — charge une page de la liste des comptes (enseignes ou personnes), ses quatre chiffres,
 *            le nombre de comptes de chaque filtre et, pour les enseignes, leurs membres.
 * POURQUOI — l'adresse décide (lib/admin-list.ts) ; la base filtre, cherche et pagine (admin_*).
 * ATTENTION — une erreur de la base s'affiche telle quelle : jamais une liste vide qui ment.
 */
import { useEffect, useState } from 'react'
import { groupMembers } from '@/lib/admin-members'
import type { AccountsQuery } from '@/lib/admin-list'
import { must, supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Fn = Database['public']['Functions']
export type Stats = Fn['admin_chiffres']['Returns'][number]
export type EntityRow = Fn['admin_enseignes']['Returns'][number]
export type PersonRow = Fn['admin_personnes']['Returns'][number]
export type MemberRow = Fn['admin_membres']['Returns'][number]

interface Common {
  stats: Stats | null
  /** Le nombre de comptes de chaque filtre, par valeur de filtre. */
  counts: Map<string, number>
  total: number
}

export type AccountsData =
  | (Common & { view: 'enseignes'; rows: EntityRow[]; members: Map<string, MemberRow[]> })
  | (Common & { view: 'personnes'; rows: PersonRow[] })

async function loadAccounts(query: AccountsQuery): Promise<AccountsData> {
  const args = { p_q: query.q, p_filtre: query.filter, p_page: query.page }
  const [statsResponse, filtersResponse] = await Promise.all([
    supabase.rpc('admin_chiffres'),
    supabase.rpc('admin_filtres', { p_vue: query.view, p_q: query.q }),
  ])
  const stats = must(statsResponse)[0] ?? null
  const counts = new Map(must(filtersResponse).map((row) => [row.filtre, row.nombre]))
  if (query.view === 'personnes') {
    const rows = must(await supabase.rpc('admin_personnes', args))
    return { view: 'personnes', stats, counts, rows, total: rows[0]?.total ?? 0 }
  }
  const rows = must(await supabase.rpc('admin_enseignes', args))
  const ids = rows.map((row) => row.actor_id)
  const members = ids.length ? must(await supabase.rpc('admin_membres', { p_entities: ids })) : []
  return {
    view: 'enseignes',
    stats,
    counts,
    rows,
    members: groupMembers(members),
    total: rows[0]?.total ?? 0,
  }
}

export function useAccounts({ view, q, filter, page }: AccountsQuery) {
  const [state, setState] = useState<{ data: AccountsData | null; error: string | null }>({
    data: null,
    error: null,
  })
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadAccounts({ view, q, filter, page })
        if (cancelled) return
        setState({ data, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          data: null,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [view, q, filter, page])
  return state
}
