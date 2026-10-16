/**
 * QUOI     — transforme les lignes d'un CSV (titres en première ligne) en prospects à ajouter, et
 *            compte les doublons et les lignes ignorées, pour l'aperçu avant import.
 * POURQUOI — les fichiers viennent d'Excel ou de Google Sheets, titrés à la main : on reconnaît les
 *            titres sans accents ni casse, avec leurs synonymes.
 * ATTENTION — un doublon est un e-mail déjà connu (dans la base ou plus haut dans le fichier).
 */
import { normalizeEmail } from './prospect'

export interface NewProspect {
  name: string | null
  brand: string | null
  activity: string | null
  city: string | null
  email: string | null
  phone: string | null
  source: string | null
  note: string | null
}

type Field = keyof NewProspect

export interface ImportPlan {
  toAdd: NewProspect[]
  duplicates: number
  ignored: number
}

const SYNONYMS: Record<Field, readonly string[]> = {
  name: ['nom', 'prenom', 'personne', 'contact', 'nomcomplet'],
  brand: ['marque', 'enseigne', 'boutique'],
  activity: ['activite', 'metier'],
  city: ['ville'],
  email: ['email', 'mail', 'courriel', 'adressemail'],
  phone: ['telephone', 'tel', 'portable', 'mobile'],
  source: ['source'],
  note: ['note', 'notes', 'commentaire', 'commentaires'],
}

function simplify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

function fieldOf(title: string): Field | null {
  const key = simplify(title)
  const found = (Object.keys(SYNONYMS) as Field[]).find((field) => SYNONYMS[field].includes(key))
  return found ?? null
}

function emptyProspect(): NewProspect {
  return {
    name: null,
    brand: null,
    activity: null,
    city: null,
    email: null,
    phone: null,
    source: null,
    note: null,
  }
}

function readRow(fields: (Field | null)[], cells: string[]): NewProspect {
  const prospect = emptyProspect()
  fields.forEach((field, index) => {
    const value = (cells[index] ?? '').trim()
    if (!field || !value) return
    const previous = prospect[field]
    prospect[field] = previous ? `${previous} ${value}` : value
  })
  return { ...prospect, email: normalizeEmail(prospect.email) }
}

export function planImport(
  rows: string[][],
  known: ReadonlySet<string>,
  commonSource: string,
): ImportPlan {
  const [header, ...lines] = rows
  const fields = (header ?? []).map(fieldOf)
  const seen = new Set(known)
  const plan: ImportPlan = { toAdd: [], duplicates: 0, ignored: 0 }
  if (!fields.some(Boolean)) return plan
  for (const cells of lines) {
    const prospect = readRow(fields, cells)
    if (!prospect.name && !prospect.brand && !prospect.email) {
      plan.ignored += 1
      continue
    }
    if (prospect.email && seen.has(prospect.email)) {
      plan.duplicates += 1
      continue
    }
    if (prospect.email) seen.add(prospect.email)
    plan.toAdd.push({ ...prospect, source: prospect.source ?? (commonSource.trim() || null) })
  }
  return plan
}

/** Les e-mails du fichier, rangés : ceux qu'on demande à la base avant l'aperçu. */
export function emailsOf(rows: string[][]): string[] {
  const [header, ...lines] = rows
  const column = (header ?? []).findIndex((title) => fieldOf(title) === 'email')
  if (column < 0) return []
  return lines
    .map((cells) => normalizeEmail(cells[column] ?? null))
    .filter((email): email is string => email !== null)
}
