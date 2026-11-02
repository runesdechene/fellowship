/**
 * QUOI     — les couleurs des catégories, lues une fois par session et partagées.
 * POURQUOI — les étiquettes de catégorie se teignent des couleurs posées dans l'administration ;
 *            dix étiquettes à l'écran ne relisent pas dix fois la table `tags`.
 * ATTENTION — tant que la lecture n'est pas arrivée (ou si elle échoue), la carte est vide : les
 *            étiquettes retombent sur leur teinte neutre, jamais sur une couleur inventée.
 */
import { useEffect, useState } from 'react'
import { fetchTags, tagStylesByName, type TagStyle } from './tags'

let shared: Promise<Map<string, TagStyle>> | null = null

export function useTagStyles(): Map<string, TagStyle> {
  const [styles, setStyles] = useState<Map<string, TagStyle>>(() => new Map())

  useEffect(() => {
    let cancelled = false
    shared ??= fetchTags().then(tagStylesByName)
    void shared.then((found) => {
      if (cancelled) return
      setStyles(found)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return styles
}
