import { describe, it, expect, beforeEach } from 'vitest'
import { getInitialTheme, applyTheme, THEME_STORAGE_KEY } from './theme'

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

  it('applyTheme("day") ajoute la classe light et persiste', () => {
    applyTheme('day')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('day')
  })

  it('applyTheme("night") retire la classe light et persiste', () => {
    document.documentElement.classList.add('light')
    applyTheme('night')
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('night')
  })
})
