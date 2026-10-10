/**
 * QUOI     — tests des six lignes du téléphone et du message envoyé.
 * POURQUOI — la fonction send-push se sert de ce code (recopié) : une erreur ici sonne, ou se
 *            tait, sur tous les téléphones.
 */
import { describe, expect, test } from 'vitest'
import { PUSH_LINES, isPushEndpoint, lineOf, pushMessage } from './push-lines'

describe('lineOf', () => {
  test.each([
    ['deadline_reminder', 'deadline'],
    ['new_edition', 'new_edition'],
    ['friend_added_event', 'friends'],
    ['friend_going', 'friends'],
    ['thread_question', 'discussions'],
    ['thread_reply', 'discussions'],
    ['best_reply', 'discussions'],
    ['review_reply', 'discussions'],
    ['new_follower', 'new_followers'],
    ['weekly_new_events', 'weekly'],
  ])('%s sonne sous la ligne %s', (type, line) => {
    expect(lineOf(type)).toBe(line)
  })

  test('« mis à jour » et les types inconnus restent dans la cloche', () => {
    expect(lineOf('event_updated')).toBeNull()
    expect(lineOf('event_created')).toBeNull()
    expect(lineOf('inconnu')).toBeNull()
  })
})

test('les six lignes, dans l’ordre de la maquette, les deux premières Pro', () => {
  expect(PUSH_LINES.map((line) => line.key)).toEqual([
    'deadline',
    'new_edition',
    'friends',
    'discussions',
    'new_followers',
    'weekly',
  ])
  expect(PUSH_LINES.filter((line) => line.pro).map((line) => line.key)).toEqual([
    'deadline',
    'new_edition',
  ])
})

describe('pushMessage', () => {
  test('la phrase de la cloche, sans le gras, et le lien comme étiquette', () => {
    expect(pushMessage('weekly_new_events', { count: 3 })).toEqual({
      title: 'Fellowship',
      body: '3 nouveaux événements sur Fellowship cette semaine.',
      url: '/explorer',
      tag: 'weekly_new_events:/explorer',
    })
  })

  test('deux notifications différentes sur un même festival ne s’écrasent pas', () => {
    const data = { event_id: 'e1', event_name: 'X', actor_name: 'Gautier', city: 'Lyon' }
    const going = pushMessage('friend_going', { ...data, start_date: '2027-07-03' })
    const added = pushMessage('friend_added_event', {
      ...data,
      start_date: '2027-07-03',
      end_date: '2027-07-05',
    })
    expect(going?.tag).not.toBe(added?.tag)
  })

  test('une notification de festival mène à sa fiche', () => {
    const message = pushMessage('deadline_reminder', {
      event_id: 'e1',
      event_name: 'Plane’R Fest',
      deadline: '2026-10-14',
      days_left: 0,
    })
    expect(message?.body).toBe('Dernier jour pour candidater à Plane’R Fest.')
    expect(message?.url).toBe('/evenement/e1')
  })

  test('une donnée manquante n’envoie rien', () => {
    expect(pushMessage('deadline_reminder', { event_name: 'X', days_left: 3 })).toBeNull()
  })

  test('un type sans ligne n’envoie rien, même s’il se dit dans la cloche', () => {
    expect(pushMessage('event_updated', { event_id: 'e1', event_name: 'X' })).toBeNull()
  })
})

describe('isPushEndpoint', () => {
  test.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://web.push.apple.com/QGx',
    'https://updates.push.services.mozilla.com/wpush/v2/x',
    'https://wns2-par02p.notify.windows.com/w/?token=x',
  ])('accepte un vrai service de notification : %s', (url) => {
    expect(isPushEndpoint(url)).toBe(true)
  })

  test.each([
    '',
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://evil.example.com/fcm.googleapis.com/',
    'https://fcm.googleapis.com.evil.example/x',
    'https://notify.windows.com.evil.example/x',
  ])('refuse toute autre adresse : %s', (url) => {
    expect(isPushEndpoint(url)).toBe(false)
  })
})
