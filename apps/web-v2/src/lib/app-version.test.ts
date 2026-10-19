/**
 * QUOI     — tests de lib/app-version.ts : quand le bandeau « nouvelle version » apparaît.
 * POURQUOI — un version.json absent ou abîmé ne doit jamais faire croire à une mise à jour.
 */
import { isOutdated, servedVersion } from './app-version'

describe('servedVersion', () => {
  it('rend la version publiée', () => {
    expect(servedVersion({ version: '3.0.0' })).toBe('3.0.0')
  })

  it('ignore une réponse vide ou abîmée', () => {
    expect(servedVersion(null)).toBeNull()
    expect(servedVersion({})).toBeNull()
    expect(servedVersion({ version: 3 })).toBeNull()
    expect(servedVersion({ version: '' })).toBeNull()
    expect(servedVersion('3.0.0')).toBeNull()
  })
})

describe('isOutdated', () => {
  it('vrai seulement si le site publie une autre version que celle qui tourne', () => {
    expect(isOutdated('3.0.0', '3.0.1')).toBe(true)
    expect(isOutdated('3.0.0', '3.0.0')).toBe(false)
    expect(isOutdated('3.0.0', null)).toBe(false)
  })
})
