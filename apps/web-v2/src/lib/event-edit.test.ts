/**
 * QUOI     — tests du passage entre une fiche et son formulaire de modification, des infos manquantes
 *            et du droit de modifier.
 * POURQUOI — lot 10c : une fiche ouverte puis enregistrée sans rien toucher ne doit rien réécrire,
 *            surtout pas une description mise en forme par la V1.
 */
import { describe, expect, test } from 'vitest'
import type { EventRow } from '@/types/database'
import { canEditEvent, changedFields, eventToDraft, missingFields } from './event-edit'

const row: EventRow = {
  id: 'e1',
  name: 'Les Aventuriales',
  address: 'Salle polyvalente',
  city: 'Ménétrol',
  department: '63',
  latitude: 45.86,
  longitude: 3.12,
  geo_precision: 'precise',
  start_date: '2026-09-25',
  end_date: '2026-09-27',
  tags: ['Fantastique', 'Marché'],
  image_url: 'https://x/a.webp',
  registration_deadline: null,
  registration_note: 'Dossier par e-mail',
  registration_url: null,
  contact_email: 'a@b.fr',
  external_url: null,
  description: '<p>Un <strong>village</strong> pirate.</p><ul><li>Viking</li></ul>',
  is_private: false,
  created_by_actor: 'u1',
  acted_by_user_id: 'u1',
  created_at: '2026-06-18T10:00:00Z',
  edition: null,
  expected_attendance: null,
  opening_hours: null,
  previous_edition_id: null,
  slug: 'les-aventuriales',
  stand_price: null,
  stand_size: null,
}

describe('eventToDraft', () => {
  test('la fiche devient le formulaire, la description en texte', () => {
    const draft = eventToDraft(row)
    expect(draft.name).toBe('Les Aventuriales')
    expect(draft.registrationDeadline).toBe('')
    expect(draft.description).toBe('Un village pirate.\n\n• Viking')
    expect(draft.geoPrecision).toBe('precise')
  })
})

describe('changedFields', () => {
  test('une fiche ouverte puis enregistrée sans rien toucher ne change rien (description HTML comprise)', () => {
    expect(changedFields(row, eventToDraft(row))).toEqual({})
  })
  test('seulement ce qui change, vide devient null, la description repart en HTML', () => {
    const draft = {
      ...eventToDraft(row),
      registrationDeadline: '2026-08-15',
      contactEmail: '  ',
      description: 'Neuf',
    }
    expect(changedFields(row, draft)).toEqual({
      registration_deadline: '2026-08-15',
      contact_email: null,
      description: '<p>Neuf</p>',
    })
  })
  test('une adresse changée envoie aussi sa position', () => {
    const draft = {
      ...eventToDraft(row),
      address: 'Place de Jaude',
      latitude: null,
      longitude: null,
      geoPrecision: '' as const,
    }
    expect(changedFields(row, draft)).toEqual({
      address: 'Place de Jaude',
      latitude: null,
      longitude: null,
      geo_precision: null,
    })
  })
  test('les catégories comparées dans l’ordre (la première est la principale)', () => {
    const draft = { ...eventToDraft(row), tags: ['Marché', 'Fantastique'] }
    expect(changedFields(row, draft)).toEqual({ tags: ['Marché', 'Fantastique'] })
  })
})

describe('missingFields', () => {
  test('ce qui manque, dans l’ordre de la fiche', () => {
    expect(missingFields(row)).toEqual([
      'registration_deadline',
      'registration_url',
      'external_url',
    ])
  })
  test('une description vide compte comme manquante', () => {
    expect(missingFields({ ...row, description: '<p> </p>' })).toContain('description')
  })
})

describe('canEditEvent', () => {
  test('publique : tout compte connecté ; privée : son créateur ; personne sans compte', () => {
    expect(canEditEvent({ is_private: false, created_by_actor: 'u1' }, ['u9'])).toBe(true)
    expect(canEditEvent({ is_private: true, created_by_actor: 'u1' }, ['u9', 'ent9'])).toBe(false)
    expect(canEditEvent({ is_private: true, created_by_actor: 'ent1' }, ['u1', 'ent1'])).toBe(true)
    expect(canEditEvent({ is_private: false, created_by_actor: 'u1' }, [])).toBe(false)
  })
})
