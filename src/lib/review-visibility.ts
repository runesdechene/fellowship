export type ReviewIdentityRow = {
  is_self: boolean
  identity_visible: boolean
  author_label: string | null
  author_avatar_url: string | null
  author_slug: string | null
}

/** Centralise l'affichage de l'auteur d'un avis / d'une réponse selon ce que la RPC a révélé. */
export function reviewerDisplay(
  row: ReviewIdentityRow,
  opts?: { anonLabel?: string },
): { mode: 'self' | 'named' | 'anonymous'; label: string; avatarUrl: string | null; slug: string | null } {
  if (row.is_self) {
    return { mode: 'self', label: row.author_label ?? 'Toi', avatarUrl: row.author_avatar_url, slug: row.author_slug }
  }
  if (row.identity_visible) {
    return { mode: 'named', label: row.author_label ?? 'Un exposant', avatarUrl: row.author_avatar_url, slug: row.author_slug }
  }
  return { mode: 'anonymous', label: opts?.anonLabel ?? 'Un exposant vérifié', avatarUrl: null, slug: null }
}

/** Peut laisser un avis seulement si présence acquise (inscrit) sur cette édition. */
export function canReview(participationStatus: string | null | undefined): boolean {
  return participationStatus === 'inscrit'
}
