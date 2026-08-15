import { describe, it, expect, beforeEach } from 'vitest'
import { getInitialTheme, resolveInitialTheme, applyThemeClass, persistTheme, THEME_STORAGE_KEY } from './theme'

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('défaut = night quand rien en storage', () => {
    expect(getInitialTheme()).toBe('night')
  })

  it('lit le thème persisté', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'day')
    expect(getInitialTheme()).toBe('day')
  })

  it('ignore une valeur storage invalide et retombe sur night', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'banana')
    expect(getInitialTheme()).toBe('night')
  })

  it('storage vide + classe .light déjà posée (script anti-flash V2) -> day, pas de divergence', () => {
    document.documentElement.classList.add('light')
    expect(getInitialTheme()).toBe('day')
  })

  it('storage vide + pas de classe .light -> night (V1, défaut historique inchangé)', () => {
    expect(getInitialTheme()).toBe('night')
  })

  it('storage = "day" prime toujours sur la classe DOM (cohérent par construction, mais vérifié)', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'day')
    expect(getInitialTheme()).toBe('day')
  })

  it('storage = "night" prime toujours sur la classe DOM (cohérent par construction, mais vérifié)', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'night')
    document.documentElement.classList.add('light')
    expect(getInitialTheme()).toBe('night')
  })

  it('applyThemeClass("day") + persistTheme("day") = l\'ancien applyTheme', () => {
    applyThemeClass('day')
    persistTheme('day')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('day')
  })
  it('applyThemeClass("night") + persistTheme("night") = l\'ancien applyTheme', () => {
    document.documentElement.classList.add('light')
    applyThemeClass('night')
    persistTheme('night')
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('night')
  })

  describe('resolveInitialTheme — les trois états', () => {
    it('aucun choix + V1 → night (défaut historique)', () => {
      expect(resolveInitialTheme(null, false, false)).toBe('night')
    })
    it('aucun choix + V2 → day (le parchemin est le défaut, décision 0007)', () => {
      expect(resolveInitialTheme(null, false, true)).toBe('day')
    })
    it('choix "night" + V2 → night (un choix explicite est roi)', () => {
      expect(resolveInitialTheme('night', false, true)).toBe('night')
    })
    it('choix "day" + V1 → day', () => {
      expect(resolveInitialTheme('day', false, false)).toBe('day')
    })
    it('valeur invalide + V2 → day (on retombe sur le défaut du contexte)', () => {
      expect(resolveInitialTheme('banana', false, true)).toBe('day')
    })
    it('aucun choix + classe .light déjà posée par l\'anti-flash → day, pas de divergence', () => {
      expect(resolveInitialTheme(null, true, false)).toBe('day')
    })
  })

  describe('applyThemeClass / persistTheme — la séparation', () => {
    it('applyThemeClass("day") pose la classe SANS rien mémoriser', () => {
      applyThemeClass('day')
      expect(document.documentElement.classList.contains('light')).toBe(true)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    })
    it('applyThemeClass("night") retire la classe SANS rien mémoriser', () => {
      document.documentElement.classList.add('light')
      applyThemeClass('night')
      expect(document.documentElement.classList.contains('light')).toBe(false)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    })
    it('persistTheme écrit le choix', () => {
      persistTheme('night')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('night')
    })
  })
})
