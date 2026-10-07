export type ReplyActor = { id: string; kind: string } | null

/** Tri ascendant (plus ancien d'abord) — le fil se lit de haut en bas. Non mutant. */
export function sortReplies<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

/** Seul un exposant (entité) peut répondre. */
export function canReply(actor: ReplyActor): boolean {
  return !!actor && actor.kind === 'entity'
}

export function canEditReply(actor: ReplyActor, reply: { actor_id: string }): boolean {
  return !!actor && actor.id === reply.actor_id
}

export function canDeleteReply(actor: ReplyActor, reply: { actor_id: string }, isAdmin: boolean): boolean {
  if (!actor) return false
  return actor.id === reply.actor_id || isAdmin
}
