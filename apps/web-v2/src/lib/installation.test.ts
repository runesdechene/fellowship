/**
 * QUOI     — l'iPhone reçoit le geste à faire, les autres le bouton du navigateur.
 * POURQUOI — Safari ne propose jamais l'installation de lui-même.
 */
import { describe, expect, it } from 'vitest'
import { isIPhone } from './installation'

describe('isIPhone', () => {
  it('reconnaît un iPhone et un iPad', () => {
    expect(isIPhone('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(true)
    expect(isIPhone('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)')).toBe(true)
  })

  it('laisse Android au bouton du navigateur', () => {
    expect(isIPhone('Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/131')).toBe(false)
  })
})
