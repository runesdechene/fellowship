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

/**
 * Un tag resolu : son libelle propre et ses deux couleurs. Le libelle compte
 * autant que la couleur — un evenement de la V1 porte « marche-de-noel », et
 * c'est « Marche de Noel » qu'il faut lire.
 */
export interface TagStyle {
  label: string
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
 * Les couleurs, indexées par NOM **et** par SLUG.
 *
 * Les deux cohabitent dans `events.tags` : la V1 y ecrivait le slug
 * (« marche-de-noel »), l'atelier de la V2 y ecrit le nom (« Marche de Noel »).
 * N'indexer que l'un des deux laisse la moitie du catalogue en gris.
 *
 * La comparaison ignore la casse pour la meme raison : rien ne garantit que
 * ce qui a ete ecrit dans un evenement corresponde caractere pour caractere a
 * ce que porte la table.
 */
export function tagStylesByName(rows: TagRow[]): Map<string, TagStyle> {
  const map = new Map<string, TagStyle>()
  for (const row of rows) {
    const style = { label: row.name, bgColor: row.bgColor, textColor: row.textColor }
    map.set(row.name.toLowerCase(), style)
    map.set(row.slug.toLowerCase(), style)
  }
  return map
}

/** Retrouve les couleurs d'un tag, qu'il soit stocke par nom ou par slug. */
export function tagStyleFor(
  styles: Map<string, TagStyle>,
  tag: string,
): TagStyle | undefined {
  return styles.get(tag.toLowerCase())
}
