/**
 * QUOI     — charge une page de prospects, les quatre chiffres, le nombre de chaque filtre, les
 *            sources et les correspondances à rapprocher.
 * POURQUOI — l'adresse décide (lib/prospect-list.ts) ; la base filtre, cherche et pagine.
 *            `reload` relance tout après une écriture.
 * ATTENTION — une erreur de la base s'affiche telle quelle : jamais une liste vide qui ment.
 *            Les types générés disent toutes les colonnes d'une fonction remplies ; ProspectRow et
 *            Match disent la vérité (un prospect peut n'avoir ni nom, ni compte relié).
 */
import { useCallback, useEffect, useState } from 'react'
import type { ProspectsQuery } from '@/lib/prospect-list'
import { must, supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Fn = Database['public']['Functions']
export type ProspectStats = Fn['admin_prospects_chiffres']['Returns'][number]

export interface ProspectRow {
  id: string
  name: string | null
  brand: string | null
  activity: string | null
  city: string | null
  email: string | null
  phone: string | null
  source: string | null
  note: string | null
  contact_channel: string | null
  contacted_on: string | null
  email_status: string
  a_relancer: boolean
  user_id: string | null
  user_name: string | null
  linked_at: string | null
  linked_by: string | null
  created_at: string
  total: number
}

export interface Match {
  prospect_id: string
  prospect_name: string | null
  prospect_brand: string | null
  user_id: string
  user_name: string | null
  user_email: string
  par: string
}

export interface ProspectsData {
  rows: ProspectRow[]
  total: number
  stats: ProspectStats | null
  counts: Map<string, number>
  sources: string[]
  matches: Match[]
}

async function loadProspects({ q, filter, source, page }: ProspectsQuery): Promise<ProspectsData> {
  const [list, stats, filters, sources, matches] = await Promise.all([
    supabase.rpc('admin_prospects', { p_q: q, p_filtre: filter, p_source: source, p_page: page }),
    supabase.rpc('admin_prospects_chiffres'),
    supabase.rpc('admin_prospects_filtres', { p_q: q, p_source: source }),
    supabase.rpc('admin_prospects_sources'),
    supabase.rpc('admin_prospects_a_rapprocher'),
  ])
  const rows = must(list)
  return {
    rows,
    total: rows[0]?.total ?? 0,
    stats: must(stats)[0] ?? null,
    counts: new Map(must(filters).map((row) => [row.filtre, row.nombre])),
    sources: must(sources).map((row) => row.source),
    matches: must(matches),
  }
}

export function useProspects({ q, filter, source, page }: ProspectsQuery) {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<{ data: ProspectsData | null; error: string | null }>({
    data: null,
    error: null,
  })
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadProspects({ q, filter, source, page })
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
  }, [q, filter, source, page, version])
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  return { ...state, reload }
}
