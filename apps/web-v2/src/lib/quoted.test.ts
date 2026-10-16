/**
 * QUOI     — tests de lib/quoted.ts : séparer la réponse du message cité.
 * POURQUOI — le fil montre ce que le prospect a écrit, pas notre e-mail recopié dessous.
 */
import { describe, expect, it } from 'vitest'
import { splitQuoted } from './quoted'

describe('splitQuoted', () => {
  it('coupe à « Le … a écrit : »', () => {
    expect(splitQuoted('Merci !\n\nLe 16 oct. 2026, Uriel a écrit :\n> Bonjour')).toEqual({
      main: 'Merci !',
      quoted: 'Le 16 oct. 2026, Uriel a écrit :\n> Bonjour',
    })
  })
  it('coupe à « On … wrote: » et aux lignes « > »', () => {
    expect(splitQuoted('Yes\nOn Fri, Uriel wrote:\n> Hi').main).toBe('Yes')
    expect(splitQuoted('Oui\n> Bonjour').main).toBe('Oui')
  })
  it('sans citation : tout est la réponse', () => {
    expect(splitQuoted('Juste ça')).toEqual({ main: 'Juste ça', quoted: '' })
  })
})
