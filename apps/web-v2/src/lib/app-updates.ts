/**
 * QUOI     — la logique des Nouveautés : le fil des commentaires (réponses rangées sous leur racine),
 *            la signature « Prénom (Enseigne) », la ligne des cœurs, la pastille, l'enseigne qui signe.
 * POURQUOI — logique pure, testée seule ; la page et l'admin n'ont plus qu'à afficher
 *            (spec docs/superpowers/specs/2026-10-19-v2-nouveautes-design.md).
 */

export type UpdateWeight = 'small' | 'big'

export interface UpdateComment {
  id: string
  /** Le commentaire auquel on répond ; null au premier niveau. */
  parentId: string | null
  /** La personne qui écrit. */
  actorId: string
  /** L'enseigne au nom de laquelle elle écrit. */
  entityActorId: string | null
  body: string
  createdAt: string
}

export interface CommentThread {
  root: UpdateComment
  replies: UpdateComment[]
}

const byTime = (a: UpdateComment, b: UpdateComment) =>
  a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)

/** Les fils, du plus ancien au plus récent : une réponse à une réponse reste sous la racine (un
 *  seul niveau de retrait, Uriel). */
export function threadOf(comments: UpdateComment[]): CommentThread[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]))
  const rootOf = (comment: UpdateComment): UpdateComment => {
    const parent = comment.parentId ? byId.get(comment.parentId) : undefined
    return parent ? rootOf(parent) : comment
  }
  const sorted = [...comments].sort(byTime)
  return sorted
    .filter((comment) => comment.parentId === null)
    .map((root) => ({
      root,
      replies: sorted.filter((comment) => comment.parentId !== null && rootOf(comment) === root),
    }))
}

export function signature(personName: string, entityName: string | null): string {
  return entityName ? `${personName} (${entityName})` : personName
}

/** « Gautier, Lina et 22 autres » : deux prénoms, le reste compté. */
export function likersLabel(names: string[], total: number): string {
  const shown = names.slice(0, 2)
  const others = total - shown.length
  if (others <= 0) return shown.join(' et ')
  return `${shown.join(', ')} et ${String(others)} ${others > 1 ? 'autres' : 'autre'}`
}

export function isUnread(latestPublishedAt: string | null, seenAt: string | null): boolean {
  if (!latestPublishedAt || !seenAt) return false
  return new Date(latestPublishedAt) > new Date(seenAt)
}

/** L'enseigne au nom de laquelle on commente : celle qu'on incarne, sinon la première. */
export function signingEntity(
  actor: { id: string; kind: 'person' | 'entity' },
  entities: { actor_id: string }[],
): string | null {
  if (actor.kind === 'entity') return actor.id
  return entities[0]?.actor_id ?? null
}

export interface TextPiece {
  text: string
  href?: string
}

// Même découpe que les e-mails (supabase/functions/_shared/prospect-mail.ts) : une adresse s'arrête
// aux espaces, guillemets et chevrons ; la ponctuation qui la termine reste du texte.
const URL_PATTERN = /https?:\/\/[^\s<>"]+/g
const TRAILING = /[.,;:!?)\]']+$/

/** Le texte d'une note en paragraphes (lignes vides), adresses cliquables : jamais de HTML injecté. */
export function paragraphsOf(body: string): TextPiece[][] {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const pieces: TextPiece[] = []
      let last = 0
      for (const match of paragraph.matchAll(URL_PATTERN)) {
        const url = match[0].replace(TRAILING, '')
        if (match.index > last) pieces.push({ text: paragraph.slice(last, match.index) })
        pieces.push({ text: url, href: url })
        last = match.index + url.length
      }
      if (last < paragraph.length) pieces.push({ text: paragraph.slice(last) })
      return pieces
    })
}
