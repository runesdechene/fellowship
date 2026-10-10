/**
 * QUOI     — tests de ce que permet un téléphone, du « Plus tard » de l'invitation, et de la clé.
 * POURQUOI — un mauvais état affiche un bouton « Activer » qui ne peut rien (iPhone hors écran
 *            d'accueil, refus déjà donné), ou cache l'invitation pour toujours.
 */
import { describe, expect, test } from 'vitest'
import { inviteHidden, phonePush, vapidKeyBytes } from './push-device'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/129.0'

describe('phonePush', () => {
  test('un iPhone hors de l’écran d’accueil doit d’abord y ajouter Fellowship', () => {
    expect(
      phonePush({ userAgent: IPHONE, hasPush: true, standalone: false, permission: 'default' }),
    ).toBe('installer-d-abord')
  })

  test('un iPhone depuis l’écran d’accueil peut recevoir', () => {
    expect(
      phonePush({ userAgent: IPHONE, hasPush: true, standalone: true, permission: 'default' }),
    ).toBe('possible')
  })

  test('un refus déjà donné au navigateur ne se redemande pas', () => {
    expect(
      phonePush({ userAgent: ANDROID, hasPush: true, standalone: false, permission: 'denied' }),
    ).toBe('refuse')
  })

  test('un navigateur sans push ne peut pas recevoir', () => {
    expect(
      phonePush({ userAgent: ANDROID, hasPush: false, standalone: false, permission: null }),
    ).toBe('impossible')
  })
})

describe('inviteHidden', () => {
  const now = new Date('2026-10-30T12:00:00Z')

  test('« Plus tard » cache l’invitation pendant 30 jours', () => {
    expect(inviteHidden('2026-10-01T12:00:01Z', now)).toBe(true)
  })

  test('elle revient au bout de 30 jours', () => {
    expect(inviteHidden('2026-09-30T12:00:00Z', now)).toBe(false)
  })

  test('sans date, ou une date illisible, elle s’affiche', () => {
    expect(inviteHidden(null, now)).toBe(false)
    expect(inviteHidden('pas une date', now)).toBe(false)
  })
})

test('la clé publique VAPID, écrite en base64 « url », devient des octets', () => {
  expect(Array.from(vapidKeyBytes('AQID-_8'))).toEqual([1, 2, 3, 251, 255])
})
