/**
 * QUOI     — la balise en cours de frappe dans une note (#Orga), les balises existantes qui la
 *            complètent, et la note une fois la balise choisie.
 * POURQUOI — les balises des prospects vivent dans leur note ; la frappe d'un # propose celles
 *            déjà écrites (Uriel, 26/10/2026).
 * ATTENTION — même règle que `prospect_balises` (SQL) : un # en début de texte ou après une
 *            espace, suivi de lettres, chiffres, _ ou -. Une balise se compare sans la casse.
 */

/** Une balise en cours : `start` est la place du #, `prefix` ce qui est tapé après lui. */
export interface TypedHashtag {
  start: number
  prefix: string
}

/** Au plus autant de suggestions : au-delà, on tape une lettre de plus. */
const MAX_SUGGESTIONS = 6

export function hashtagAt(text: string, caret: number): TypedHashtag | null {
  const match = /(^|\s)#([\p{L}\p{N}_-]*)$/u.exec(text.slice(0, caret))
  if (!match) return null
  const prefix = match[2] ?? ''
  return { start: caret - prefix.length - 1, prefix }
}

export function suggestHashtags(tags: readonly string[], prefix: string): string[] {
  const typed = prefix.toLowerCase()
  return tags
    .filter((tag) => tag.toLowerCase().startsWith(typed) && tag.toLowerCase() !== typed)
    .slice(0, MAX_SUGGESTIONS)
}

/** La note avec la balise choisie à la place de ce qui était tapé, et où poser le curseur. */
export function insertHashtag(
  text: string,
  typed: TypedHashtag,
  caret: number,
  tag: string,
): { text: string; caret: number } {
  const before = `${text.slice(0, typed.start)}#${tag} `
  const after = text.slice(caret).replace(/^\s/, '')
  return { text: before + after, caret: before.length }
}
