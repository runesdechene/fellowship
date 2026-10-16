/**
 * QUOI     — les valeurs d'un prospect et leurs libellés : statut de l'e-mail, canal de contact,
 *            « Mail · 10 oct. », pourcentages, messages d'écriture, e-mail rangé.
 * POURQUOI — le tableau, les chiffres et l'import parlent la même langue que la base (les valeurs
 *            des contraintes check de la table prospects).
 */
import { formatDayMonthShort, parseSqlDate } from './dates'

export type EmailStatus = 'pas_envoye' | 'envoye' | 'repondu' | 'rebond'

export const EMAIL_STATUSES: readonly { value: EmailStatus; label: string }[] = [
  { value: 'pas_envoye', label: 'Pas envoyé' },
  { value: 'envoye', label: 'Envoyé' },
  { value: 'repondu', label: 'Répondu' },
  { value: 'rebond', label: 'Rebond' },
]

/** Les usages d'un modèle d'e-mail (valeurs du check de prospect_templates.kind). */
export const TEMPLATE_KINDS = [
  { value: 'premier_contact', label: 'Premier contact' },
  { value: 'relance', label: 'Relance' },
  { value: 'bienvenue', label: 'Bienvenue' },
] as const

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

const FIRST_YEAR = 2000

/** Une date de contact complète et plausible : le champ date rend « 0002-10-16 » en pleine frappe. */
export function validContactDate(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && Number(iso.slice(0, 4)) >= FIRST_YEAR
}

export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part * 100) / whole) : 0
}

/** Les refus de la base en français : 23505 = déjà pris, 23514 = forme refusée. */
export function writeError(error: { code?: string; message: string }): string {
  const alias = error.message.includes('prospect_senders_alias')
  if (error.code === '23505')
    return alias ? 'Cette adresse est déjà prise.' : 'Cet e-mail est déjà dans la liste.'
  if (error.code === '23514' && alias)
    return 'Lettres minuscules, chiffres, points et tirets seulement.'
  return error.message
}

/** L'e-mail est rangé en minuscules, sans espaces (contrainte de la table). */
export function normalizeEmail(raw: string | null): string | null {
  const email = (raw ?? '').trim().toLowerCase()
  return email || null
}
