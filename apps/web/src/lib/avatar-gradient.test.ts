import { describe, it, expect } from 'vitest'
import { avatarGradient } from './avatar-gradient'

describe('avatarGradient', () => {
  it('renvoie un linear-gradient CSS', () => {
    expect(avatarGradient('Marie')).toMatch(/^linear-gradient\(135deg, #[0-9a-f]{6}, #[0-9a-f]{6}\)$/i)
  })
  it('est déterministe (même nom → même dégradé)', () => {
    expect(avatarGradient('Marie')).toBe(avatarGradient('Marie'))
  })
  it('gère la chaîne vide sans planter', () => {
    expect(avatarGradient('')).toMatch(/^linear-gradient/)
  })
})
