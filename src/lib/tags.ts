import { supabase } from '@/lib/supabase'

/**
 * Une catégorie, telle qu'elle est réglée dans l'administration. Les deux
 * couleurs viennent de la base : elles ne sont PAS un choix de design, c'est
 * Uriel qui les pose par tag depuis le back-office. Les coder en dur, ou les
 * remplacer par une couleur d'interface, casse ce réglage.
 */
export interface TagRow {
  name: string
  slug: string
  bgColor: string
  textColor: string
}

/** Les couleurs d'un tag, prêtes à poser. */
export interface TagStyle {
  bgColor: string
  textColor: string
}

/**
 * Toutes les catégories, dans l'ordre décidé en base (`sort_order`). Un ajout
 * côté administration apparaît sans toucher au code.
 */
export async function fetchTags(): Promise<TagRow[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('name, slug, bg_color, text_color')
    .order('sort_order', { ascending: true })

  if (error) {
    console.warn('tags:', error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    name: row.name,
    slug: row.slug,
    bgColor: row.bg_color,
    textColor: row.text_color,
  }))
}

/**
 * Les couleurs indexées par nom. Les événements stockent le NOM du tag dans
 * `events.tags`, pas son slug — c'est ce que l'atelier de création y écrit.
 */
export function tagStylesByName(rows: TagRow[]): Map<string, TagStyle> {
  return new Map(rows.map((row) => [row.name, { bgColor: row.bgColor, textColor: row.textColor }]))
}
