// Mémoire locale « dernière visite de Communauté », par acteur, pour le badge leftbar.
export function seenKey(actorId: string): string {
  return `fellowship-communaute-seen-${actorId}`
}

export function getLastSeen(actorId: string): string {
  return localStorage.getItem(seenKey(actorId)) ?? new Date(0).toISOString()
}

// `nowIso` injectable pour les tests (sinon new Date().toISOString()).
export function markSeenNow(actorId: string, nowIso?: string): void {
  localStorage.setItem(seenKey(actorId), nowIso ?? new Date().toISOString())
}
