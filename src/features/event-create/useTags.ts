import { useEffect, useState } from 'react'
import { fetchTags } from '@/lib/tags'

/**
 * Les catégories proposées, dans l'ordre décidé en base (`sort_order`).
 * Elles ne sont pas codées en dur : un ajout côté administration apparaît
 * ici sans toucher au code.
 *
 * L'atelier ne montre que des noms : ses pastilles se colorent au choix, pas
 * à la catégorie. Les couleurs de l'administration servent là où un tag
 * DÉCRIT — la fiche d'un événement.
 */
export function useTags(): string[] {
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const rows = await fetchTags()
      if (cancelled) return
      setTags(rows.map((row) => row.name))
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return tags
}
