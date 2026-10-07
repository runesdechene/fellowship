export type ThreadAudience = 'festivalier' | 'exposant' | 'organisateur'
export type ThreadActor = { id: string; kind: 'person' | 'entity'; entityType?: string | null } | null

/** Canal dans lequel un nouvel élément posté par cet acteur atterrit. null = ne peut pas poster de thread. */
export function deriveAudience(actor: ThreadActor): ThreadAudience | null {
  if (!actor) return null
  if (actor.kind === 'person') return 'festivalier'
  if (actor.entityType === 'exposant') return 'exposant'
  if (actor.entityType === 'festival') return 'organisateur'
  return null // entreprise, etc.
}

/** Canaux proposés en toggles selon les types de compte possédés. Ordre stable. */
export function visibleChannels(opts: { hasPerson: boolean; entityTypes: string[] }): ThreadAudience[] {
  const chans: ThreadAudience[] = []
  if (opts.hasPerson) chans.push('festivalier')
  if (opts.entityTypes.includes('exposant')) chans.push('exposant')
  if (opts.entityTypes.includes('festival')) chans.push('organisateur')
  return chans
}

export function canAsk(actor: ThreadActor): boolean {
  return deriveAudience(actor) !== null
}

/** Répondre est ouvert à tout acteur connecté (participation cross-canal). */
export function canReply(actor: ThreadActor): boolean {
  return !!actor
}

export function canEdit(actor: ThreadActor, content: { actor_id: string }): boolean {
  return !!actor && actor.id === content.actor_id
}

export function canDelete(actor: ThreadActor, content: { actor_id: string }, isAdmin: boolean): boolean {
  if (!actor) return false
  return actor.id === content.actor_id || isAdmin
}

/** Seul l'auteur du thread élit la meilleure réponse. */
export function canMarkBest(actor: ThreadActor, thread: { actor_id: string }): boolean {
  return !!actor && actor.id === thread.actor_id
}

export function isSolved(thread: { best_reply_id: string | null }): boolean {
  return thread.best_reply_id != null
}

/** Meilleure réponse en tête, puis chronologique ascendant. Non mutant. */
export function sortReplies<T extends { id: string; created_at: string }>(rows: T[], bestReplyId: string | null): T[] {
  return [...rows].sort((a, b) => {
    if (bestReplyId) {
      if (a.id === bestReplyId) return -1
      if (b.id === bestReplyId) return 1
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

/** Plus récent d'abord. Non mutant. */
export function sortThreads<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function filterByChannels<T extends { audience: ThreadAudience }>(rows: T[], active: ThreadAudience[]): T[] {
  return rows.filter(t => active.includes(t.audience))
}

const CHANNEL_LABELS: Record<ThreadAudience, string> = {
  festivalier: 'Festivaliers',
  exposant: 'Exposants',
  organisateur: 'Organisateurs',
}
export function channelLabel(a: ThreadAudience): string {
  return CHANNEL_LABELS[a]
}
