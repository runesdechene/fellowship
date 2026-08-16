import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Les catégories proposées, dans l'ordre décidé en base (`sort_order`).
 * Elles ne sont pas codées en dur : un ajout côté administration apparaît
 * ici sans toucher au code.
 */
export function useTags(): string[] {
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('tags')
        .select('name')
        .order('sort_order', { ascending: true })
      if (cancelled) return
      setTags((data ?? []).map((row) => row.name))
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return tags
}
