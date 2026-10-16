/**
 * QUOI     — charge les modèles (avec envois et réponses), les expéditeurs et les comptes admins.
 * POURQUOI — la page « Modèles et expéditeurs » (maquette 2356:2) ; `reload` après chaque écriture.
 */
import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'
import type { Sender, Template } from './useProspect'

export interface Admin {
  actor_id: string
  display_name: string | null
}

export interface TemplatesData {
  templates: Template[]
  senders: Sender[]
  admins: Admin[]
}

async function loadTemplates(): Promise<TemplatesData> {
  const [templates, senders, admins] = await Promise.all([
    supabase.rpc('admin_prospect_modeles'),
    supabase.rpc('admin_prospect_expediteurs'),
    supabase
      .from('users')
      .select('actor_id, display_name')
      .eq('role', 'admin')
      .order('display_name')
      .order('actor_id'),
  ])
  return { templates: must(templates), senders: must(senders), admins: must(admins) }
}

export function useTemplates() {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<{ data: TemplatesData | null; error: string | null }>({
    data: null,
    error: null,
  })
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadTemplates()
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
  }, [version])
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  return { ...state, reload }
}
