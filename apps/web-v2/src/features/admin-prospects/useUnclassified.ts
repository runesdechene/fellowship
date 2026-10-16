/**
 * QUOI     — charge les réponses reçues qu'on n'a pas su rattacher à un prospect.
 * POURQUOI — la page « Non classés » : rien ne se perd, chacune se range à la main.
 */
import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'

export interface Unclassified {
  id: string
  from_email: string
  to_email: string
  subject: string
  body_text: string
  has_attachments: boolean
  received_at: string
}

async function loadUnclassified(): Promise<Unclassified[]> {
  return must(await supabase.rpc('admin_prospects_non_classes'))
}

export function useUnclassified() {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<{ data: Unclassified[] | null; error: string | null }>({
    data: null,
    error: null,
  })
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadUnclassified()
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
