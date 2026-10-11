/**
 * QUOI     — les couleurs des catégories, lues une fois par session et partagées.
 * POURQUOI — une affiche absente se teinte de la couleur de sa catégorie (lot 9a) ; dix affiches
 *            à l'écran ne relisent pas dix fois la table `tags`.
 * ATTENTION — tant que la lecture n'est pas arrivée (ou si elle échoue), la carte est vide : les
 *            affiches retombent sur la teinte neutre, jamais sur une couleur inventée.
 */
import { useEffect, useState } from 'react'
import { firstCategory } from './category-icons'
import { fetchTags, tagStyleFor, tagStylesByName, type TagStyle } from './tags'

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

/** Les couleurs de la catégorie d'un festival : la première catégorie connue de ses tags. */
export function useCategoryColors(tags: readonly string[] | null): TagStyle | undefined {
  const styles = useTagStyles()
  const category = firstCategory(tags)
  return category ? tagStyleFor(styles, category) : undefined
}
