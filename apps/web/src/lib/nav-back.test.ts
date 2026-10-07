import { describe, it, expect } from 'vitest'
import { canGoBackInApp } from './nav-back'

describe('canGoBackInApp', () => {
  it("retourne false quand la location est l'entrée initiale (key 'default') → on prend le fallback", () => {
    // Arrivée directe (lien partagé, deep-link) : pas d'historique in-app à remonter.
    expect(canGoBackInApp('default')).toBe(false)
  })

  it('retourne true quand on a navigué dans l’app (key générée) → navigate(-1)', () => {
    // React Router attribue une key aléatoire à chaque navigation interne.
    expect(canGoBackInApp('a1b2c3')).toBe(true)
  })

  it('retourne false quand la key est absente', () => {
    expect(canGoBackInApp(undefined)).toBe(false)
  })
})
