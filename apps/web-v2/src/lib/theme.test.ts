/**
 * QUOI     — les tests de lib/theme.ts : quel thème afficher selon le choix retenu et l'appareil.
 * POURQUOI — un choix « clair » oublié au profit du réglage de l'appareil, et l'interrupteur ment.
 */
import { describe, expect, it } from 'vitest'
import { readThemeChoice, resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('un choix explicite l’emporte sur l’appareil', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('sans choix, on suit l’appareil', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
  })
})

describe('readThemeChoice', () => {
  it('ne retient que « light » ou « dark »', () => {
    expect(readThemeChoice('dark')).toBe('dark')
    expect(readThemeChoice('light')).toBe('light')
    expect(readThemeChoice('bleu')).toBeNull()
    expect(readThemeChoice(null)).toBeNull()
  })
})
