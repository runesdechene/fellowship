/**
 * QUOI     — les valeurs d'un prospect et leurs libellés : statut de l'e-mail, canal de contact,
 *            « Mail · 10 oct. », pourcentages, messages d'écriture, e-mail rangé.
 * POURQUOI — le tableau, les chiffres et l'import parlent la même langue que la base (les valeurs
 *            des contraintes check de la table prospects).
 */
import { formatDayMonthShort, parseSqlDate } from './dates'

export type EmailStatus = 'pas_envoye' | 'envoye' | 'ouvert' | 'repondu' | 'rebond'

export const EMAIL_STATUSES: readonly { value: EmailStatus; label: string }[] = [
  { value: 'pas_envoye', label: 'Pas envoyé' },
  { value: 'envoye', label: 'Envoyé' },
  { value: 'ouvert', label: 'Ouvert' },
  { value: 'repondu', label: 'Répondu' },
  { value: 'rebond', label: 'Rebond' },
]

export type ContactChannel = 'mail' | 'appel' | 'salon' | 'message'

export const CHANNELS: readonly { value: ContactChannel; label: string }[] = [
  { value: 'mail', label: 'Mail' },
  { value: 'appel', label: 'Appel' },
  { value: 'salon', label: 'Salon' },
  { value: 'message', label: 'Message' },
]

/** « Mail · 10 oct. » ; l'un sans l'autre ; null si rien n'est noté. */
export function contactLabel(channel: string | null, on: string | null): string | null {
  const parts = [
    CHANNELS.find((c) => c.value === channel)?.label,
    on ? formatDayMonthShort(parseSqlDate(on)) : undefined,
  ].filter((part): part is string => Boolean(part))
  return parts.length ? parts.join(' · ') : null
}

export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part * 100) / whole) : 0
}

/** 23505 : la contrainte unique de l'e-mail. */
export function writeError(error: { code?: string; message: string }): string {
  return error.code === '23505' ? 'Cet e-mail est déjà dans la liste.' : error.message
}

/** L'e-mail est rangé en minuscules, sans espaces (contrainte de la table). */
export function normalizeEmail(raw: string | null): string | null {
  const email = (raw ?? '').trim().toLowerCase()
  return email || null
}
