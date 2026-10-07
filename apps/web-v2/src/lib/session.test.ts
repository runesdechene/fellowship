/**
 * QUOI     — tests de lib/session.ts : quels événements de session relisent l'identité.
 * POURQUOI — la logique pure se teste ici, sans navigateur (méthode du dépôt : .claude/rules/dev.md).
 */
import { describe, expect, it } from 'vitest'
import { shouldLoadIdentity } from './session'

describe('shouldLoadIdentity', () => {
  it('relit l’identité à l’ouverture, à la connexion et quand le compte change', () => {
    expect(shouldLoadIdentity('INITIAL_SESSION')).toBe(true)
    expect(shouldLoadIdentity('SIGNED_IN')).toBe(true)
    expect(shouldLoadIdentity('USER_UPDATED')).toBe(true)
  })
  it('ne relit rien sur un simple rafraîchissement de jeton', () => {
    expect(shouldLoadIdentity('TOKEN_REFRESHED')).toBe(false)
  })
})
