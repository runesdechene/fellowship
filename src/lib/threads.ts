/**
 * La discussion d'un festival : des questions, des réponses, et une réponse
 * élue par celui qui a posé la question.
 *
 * Tout ce fichier est de la logique pure — aucun React, aucun réseau. C'est ce
 * qui permet de la tester pour de vrai, et de la relire sans dérouler un
 * composant.
 */

/**
 * Le canal d'une question. Il n'est pas choisi : il se DÉDUIT du type de
 * l'acteur qui poste, et la base l'impose (policy `event_threads_insert`).
 * Un exposant ne peut pas poster dans le canal des organisateurs.
 */
export type ThreadAudience = 'festivalier' | 'exposant' | 'organisateur'

/** L'acteur actif, réduit à ce dont la discussion a besoin. */
export interface ThreadActor {
  id: string
  kind: 'person' | 'entity'
  entityType?: string | null
}

const CHANNEL_LABELS: Record<ThreadAudience, string> = {
  festivalier: 'Festivaliers',
  exposant: 'Exposants',
  organisateur: 'Organisateurs',
}

export function channelLabel(audience: ThreadAudience): string {
  return CHANNEL_LABELS[audience]
}

/**
 * Dans quel canal atterrit une question posée par cet acteur.
 *
 * `null` = il ne peut pas en poser. Une entité qui n'est ni exposant ni
 * festival (une entreprise, par exemple) n'a pas de canal : la lui laisser
 * choisir la ferait rejeter par la base, ce qui est pire que de ne pas
 * proposer le bouton.
 */
export function deriveAudience(actor: ThreadActor | null): ThreadAudience | null {
  if (!actor) return null
  // Un compte PERSONNEL n'a plus de canal : Fellowship ne sert plus les
  // festivaliers (décision du 19 août 2026). Le type 'festivalier' reste
  // dans l'union parce que la BASE le porte encore sur d'anciennes lignes —
  // le retirer ferait mentir le type sur ce qu'on lit vraiment.
  if (actor.kind === 'person') return null
  if (actor.entityType === 'exposant') return 'exposant'
  if (actor.entityType === 'festival') return 'organisateur'
  return null
}

/**
 * Les canaux qu'on propose de filtrer, selon les casquettes possédées.
 * L'ordre est stable — il ne doit pas danser d'une session à l'autre.
 *
 * « festivalier » n'y figure plus : Fellowship ne leur fournit plus rien.
 * Les anciennes questions posées dans ce canal restent en base mais ne
 * s'affichent nulle part, puisque `filterByChannels` ne garde que les
 * canaux visibles. On ne les efface pas — les effacer serait irréversible
 * pour un changement de cap qui, lui, ne l'est pas.
 */
export function visibleChannels(entityTypes: string[]): ThreadAudience[] {
  const channels: ThreadAudience[] = []
  if (entityTypes.includes('exposant')) channels.push('exposant')
  if (entityTypes.includes('festival')) channels.push('organisateur')
  return channels
}

/** Poser une question suppose un canal. */
export function canAsk(actor: ThreadActor | null): boolean {
  return deriveAudience(actor) !== null
}

/**
 * Répondre est ouvert à tout acteur connecté, y compris hors de son canal :
 * c'est justement l'intérêt: un organisateur répond aux exposants.
 */
export function canReply(actor: ThreadActor | null): boolean {
  return Boolean(actor)
}

export function canEdit(actor: ThreadActor | null, content: { actorId: string }): boolean {
  return Boolean(actor) && actor?.id === content.actorId
}

export function canDelete(
  actor: ThreadActor | null,
  content: { actorId: string },
  isAdmin: boolean,
): boolean {
  if (!actor) return false
  return actor.id === content.actorId || isAdmin
}

/** Seul l'auteur de la question élit la meilleure réponse. */
export function canMarkBest(actor: ThreadActor | null, thread: { actorId: string }): boolean {
  return Boolean(actor) && actor?.id === thread.actorId
}

/** Une question à laquelle on a répondu pour de bon. */
export function isSolved(thread: { bestReplyId: string | null }): boolean {
  return thread.bestReplyId !== null
}

/**
 * La meilleure réponse en tête, puis l'ordre chronologique. Non mutant : on
 * ne trie jamais en place un tableau qui vient d'un état React.
 */
export function sortReplies<T extends { id: string; createdAt: string }>(
  rows: T[],
  bestReplyId: string | null,
): T[] {
  return [...rows].sort((a, b) => {
    if (bestReplyId) {
      if (a.id === bestReplyId) return -1
      if (b.id === bestReplyId) return 1
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

/** La plus récente d'abord. Non mutant. */
export function sortThreads<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function filterByChannels<T extends { audience: ThreadAudience }>(
  rows: T[],
  active: ThreadAudience[],
): T[] {
  return rows.filter((row) => active.includes(row.audience))
}

/** Les bornes que la base impose. Les redire ici évite un aller-retour perdu. */
export const TITLE_MIN = 3
export const TITLE_MAX = 140
export const BODY_MAX = 2000

/**
 * Ce qui empêche de poster, ou `null` si tout va bien. On rend la RAISON, pas
 * un booléen : un bouton grisé sans explication est un cul-de-sac.
 */
export function askBlocker(title: string, body: string): string | null {
  const cleanTitle = title.trim()
  if (cleanTitle.length < TITLE_MIN) return 'La question fait au moins trois caractères.'
  if (cleanTitle.length > TITLE_MAX) return `La question dépasse ${TITLE_MAX} caractères.`
  if (body.trim().length > BODY_MAX) return `Le détail dépasse ${BODY_MAX} caractères.`
  return null
}
