/**
 * QUOI     — tests de lib/event-path.ts : l'adresse d'une fiche et de ses sous-pages.
 * POURQUOI — toute l'app lie une fiche par ce seul helper ; une adresse fausse casse tous les liens.
 */
import { eventPath, legacyEventPath } from './event-path'

describe('eventPath', () => {
  it('mène à la fiche, puis à ses sous-pages', () => {
    expect(eventPath('fenrir-2027')).toBe('/evenements/fenrir-2027')
    expect(eventPath('fenrir-2027', 'avis')).toBe('/evenements/fenrir-2027/avis')
    expect(eventPath('fenrir-2027', 'historique/3')).toBe('/evenements/fenrir-2027/historique/3')
  })
})

describe('legacyEventPath', () => {
  it('passe les anciennes adresses sous /evenements, sous-page comprise', () => {
    expect(legacyEventPath('/evenement/3f9a/modifier')).toBe('/evenements/3f9a/modifier')
    expect(legacyEventPath('/evenement/nouveau')).toBe('/evenements/nouveau')
    expect(legacyEventPath('/e/fenrir-liffre')).toBe('/evenements/fenrir-liffre')
  })
})
