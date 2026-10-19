/**
 * QUOI     — charge les catégories et leur usage, les enregistre (création ou correction) et les
 *            supprime.
 * POURQUOI — renommer doit suivre dans les fiches : `admin_categorie_enregistrer` remplace l'ancien
 *            nom et l'ancien slug dans `events.tags`. Créer et supprimer passent par les politiques
 *            admin de `tags`.
 * ATTENTION — une erreur de la base s'affiche telle quelle : jamais une liste vide qui ment.
 */
import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'
import type { TagStyle } from '@/lib/tags'
import type { Database } from '@/types/supabase'

export type Category = Database['public']['Functions']['admin_categories']['Returns'][number]

export interface CategoryDraft {
  name: string
  slug: string
  bg_color: string
  text_color: string
  sort_order: number
}

/** La pastille d'une catégorie telle qu'elle s'affichera, pour la liste et l'aperçu. */
export function styleOf(
  category: Pick<CategoryDraft, 'name' | 'bg_color' | 'text_color'>,
): TagStyle {
  return {
    label: category.name || 'Catégorie',
    bgColor: category.bg_color,
    textColor: category.text_color,
  }
}

/** Une nouvelle catégorie s'insère ; une correction passe par la fonction, qui suit dans les fiches. */
export async function saveCategory(id: string | null, draft: CategoryDraft): Promise<void> {
  const { error } = id
    ? await supabase.rpc('admin_categorie_enregistrer', {
        p_id: id,
        p_name: draft.name,
        p_slug: draft.slug,
        p_bg: draft.bg_color,
        p_text: draft.text_color,
        p_ordre: draft.sort_order,
      })
    : await supabase.from('tags').insert(draft)
  if (error) throw new Error(error.message)
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export function useCategories() {
  const [state, setState] = useState<{ categories: Category[] | null; error: string | null }>({
    categories: null,
    error: null,
  })
  const [round, setRound] = useState(0)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const categories = must(await supabase.rpc('admin_categories'))
        if (cancelled) return
        setState({ categories, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          categories: null,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [round])
  const reload = useCallback(() => setRound((r) => r + 1), [])
  return { ...state, reload }
}
