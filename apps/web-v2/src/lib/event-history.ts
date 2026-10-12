/**
 * QUOI     — l'histoire d'une fiche en mots : la phrase d'une version (« a changé les dates et
 *            l'adresse »), son auteur, son titre, et la comparaison avec la version précédente.
 * POURQUOI — lot 10c, méthode des lieux de Runes de Chêne : on doit voir ce que chacun a ajouté ou
 *            retiré. Les textes longs se comparent mot à mot (`diff`, la bibliothèque de référence).
 * ATTENTION — la position (latitude, longitude, précision) suit l'adresse : elle ne se dit pas à part.
 */
import { diffWords } from 'diff'
import { formatDayMonth, formatFullDate, parseSqlDate } from '@/lib/dates'
import { htmlToText } from '@/lib/rich-text'

/** Dans l'ordre de la fiche. Les deux dates ne se disent qu'une fois. */
const SENTENCE_LABELS: [string, string][] = [
  ['name', 'le nom'],
  ['address', 'l’adresse'],
  ['city', 'la ville'],
  ['department', 'le département'],
  ['start_date', 'les dates'],
  ['end_date', 'les dates'],
  ['tags', 'les catégories'],
  ['image_url', 'l’affiche'],
  ['registration_deadline', 'la date limite'],
  ['registration_note', '« Comment candidater »'],
  ['registration_url', 'le lien d’inscription'],
  ['contact_email', 'l’e-mail de contact'],
  ['external_url', 'le site'],
  ['description', 'la description'],
]

function joinFrench(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1] ?? ''}`
}

export function versionSentence(changed: string[], isOrigin: boolean): string {
  if (isOrigin) return 'a ajouté l’événement'
  const labels = SENTENCE_LABELS.filter(([field]) => changed.includes(field)).map(
    ([, label]) => label,
  )
  const unique = [...new Set(labels)]
  return unique.length === 0 ? 'a modifié la fiche' : `a changé ${joinFrench(unique)}`
}

export function authorName(name: string | null, brand: string | null): string {
  if (!name) return 'Un compte supprimé'
  return brand ? `${name} de ${brand}` : name
}

export function versionTitle(createdAt: Date): string {
  return `La version du ${formatDayMonth(createdAt)}`
}

export type ChangeBlock =
  | { field: string; label: string; kind: 'short'; before: string | null; after: string | null }
  | {
      field: string
      label: string
      kind: 'text'
      parts: { text: string; added: boolean; removed: boolean }[]
    }

/** Dans l'ordre de la fiche ; la position n'a pas de bloc. */
const BLOCK_LABELS: [string, string][] = [
  ['name', 'Nom'],
  ['address', 'Adresse ou lieu'],
  ['city', 'Ville'],
  ['department', 'Département'],
  ['start_date', 'Début'],
  ['end_date', 'Fin'],
  ['tags', 'Catégories'],
  ['image_url', 'Affiche'],
  ['registration_deadline', 'Date limite d’inscription'],
  ['registration_note', 'Comment candidater'],
  ['registration_url', 'Lien d’inscription'],
  ['contact_email', 'E-mail de contact'],
  ['external_url', 'Site de l’événement'],
  ['description', 'Description'],
]

const TEXT_FIELDS = ['description', 'registration_note']
const DATE_FIELDS = ['start_date', 'end_date', 'registration_deadline']

/** Une valeur courte, telle qu'on la lit ; `null` quand il n'y avait rien. */
function shortValue(field: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : null
  if (field === 'image_url') return 'une affiche'
  if (typeof value !== 'string') return String(value)
  return DATE_FIELDS.includes(field) ? formatFullDate(parseSqlDate(value)) : value
}

const asText = (value: unknown) => htmlToText(typeof value === 'string' ? value : null)

export function changeBlocks(
  rows: { field: string; before: unknown; after: unknown }[],
): ChangeBlock[] {
  return BLOCK_LABELS.flatMap(([field, label]): ChangeBlock[] => {
    const row = rows.find((candidate) => candidate.field === field)
    if (!row) return []
    if (TEXT_FIELDS.includes(field)) {
      const parts = diffWords(asText(row.before), asText(row.after)).map((part) => ({
        text: part.value,
        added: Boolean(part.added),
        removed: Boolean(part.removed),
      }))
      return [{ field, label, kind: 'text', parts }]
    }
    return [
      {
        field,
        label,
        kind: 'short',
        before: shortValue(field, row.before),
        after: shortValue(field, row.after),
      },
    ]
  })
}
