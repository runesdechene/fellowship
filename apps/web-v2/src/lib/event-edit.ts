/**
 * QUOI     — le passage entre une fiche et son formulaire de modification, ce qui manque à une
 *            fiche, et qui a le droit de la modifier.
 * POURQUOI — lot 10c : la porte d'écriture (`modifier_evenement`) ne reçoit que ce qui change ; une
 *            fiche ouverte puis enregistrée sans rien toucher ne doit rien réécrire.
 * ATTENTION — la description se modifie en texte (paragraphes, puces) : on la compare en texte, et
 *            on ne la renvoie en HTML que si elle a vraiment changé — sinon la mise en forme de la
 *            V1 se perdrait sans que personne n'y ait touché.
 */
import type { EventDraft } from '@/features/event-create/useEventDraft'
import { htmlToText, isRichTextEmpty, textToHtml } from '@/lib/rich-text'
import type { EventRow } from '@/types/database'
import type { Json } from '@/types/supabase'

export type EditableField =
  | 'name'
  | 'address'
  | 'city'
  | 'department'
  | 'latitude'
  | 'longitude'
  | 'geo_precision'
  | 'start_date'
  | 'end_date'
  | 'tags'
  | 'image_url'
  | 'registration_deadline'
  | 'registration_note'
  | 'registration_url'
  | 'contact_email'
  | 'external_url'
  | 'description'

export function eventToDraft(event: EventRow): EventDraft {
  const precision = event.geo_precision
  return {
    name: event.name,
    isPrivate: event.is_private,
    address: event.address ?? '',
    city: event.city,
    department: event.department,
    startDate: event.start_date,
    endDate: event.end_date,
    tags: event.tags ?? [],
    description: htmlToText(event.description),
    registrationDeadline: event.registration_deadline ?? '',
    registrationUrl: event.registration_url ?? '',
    externalUrl: event.external_url ?? '',
    contactEmail: event.contact_email ?? '',
    registrationNote: event.registration_note ?? '',
    previousEditionId: '',
    latitude: event.latitude,
    longitude: event.longitude,
    geoPrecision: precision === 'precise' || precision === 'city' ? precision : '',
  }
}

const text = (value: string) => value.trim() || null

type SentField = Exclude<EditableField, 'image_url' | 'description'>

/** Ce que le formulaire envoie pour chaque champ, sous la forme où la fiche le range. */
function sent(draft: EventDraft): Record<SentField, Json> {
  return {
    name: draft.name.trim(),
    address: text(draft.address),
    city: draft.city.trim(),
    department: draft.department.trim(),
    latitude: draft.latitude,
    longitude: draft.longitude,
    geo_precision: draft.geoPrecision || null,
    start_date: draft.startDate,
    end_date: draft.endDate || draft.startDate,
    tags: draft.tags,
    registration_deadline: draft.registrationDeadline || null,
    registration_note: text(draft.registrationNote),
    registration_url: text(draft.registrationUrl),
    contact_email: text(draft.contactEmail),
    external_url: text(draft.externalUrl),
  }
}

/** Seulement ce qui change entre la fiche et le formulaire, prêt pour `modifier_evenement`. */
export function changedFields(
  event: EventRow,
  draft: EventDraft,
): Partial<Record<EditableField, Json>> {
  const before = sent(eventToDraft(event))
  const after = sent(draft)
  const changes: Partial<Record<EditableField, Json>> = {}
  for (const key of Object.keys(after) as SentField[]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changes[key] = after[key]
  }
  if (draft.description.trim() !== htmlToText(event.description)) {
    changes.description = textToHtml(draft.description)
  }
  return changes
}

export type MissingField =
  | 'registration_deadline'
  | 'registration_note'
  | 'registration_url'
  | 'contact_email'
  | 'external_url'
  | 'description'

export const MISSING_LABELS: Record<MissingField, string> = {
  registration_deadline: 'Date limite',
  registration_note: 'Comment candidater',
  registration_url: 'Lien d’inscription',
  contact_email: 'E-mail de contact',
  external_url: 'Site de l’événement',
  description: 'Description',
}

/** Ce qui manque à une fiche, dans l'ordre où la fiche le montre. */
export function missingFields(event: EventRow): MissingField[] {
  const missing: MissingField[] = []
  const empty = (value: string | null) => !value?.trim()
  if (empty(event.registration_deadline)) missing.push('registration_deadline')
  if (empty(event.registration_note)) missing.push('registration_note')
  if (empty(event.registration_url)) missing.push('registration_url')
  if (empty(event.contact_email)) missing.push('contact_email')
  if (empty(event.external_url)) missing.push('external_url')
  if (isRichTextEmpty(event.description)) missing.push('description')
  return missing
}

/** Une fiche publique, tout compte connecté ; une privée, son créateur (ou son enseigne). */
export function canEditEvent(
  event: Pick<EventRow, 'is_private' | 'created_by_actor'>,
  myActorIds: string[],
): boolean {
  if (myActorIds.length === 0) return false
  if (!event.is_private) return true
  return event.created_by_actor !== null && myActorIds.includes(event.created_by_actor)
}
