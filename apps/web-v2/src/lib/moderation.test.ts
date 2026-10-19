/**
 * QUOI     — tests de lib/moderation.ts : statut dans l'adresse, libellés du motif et de la cible.
 * POURQUOI — une adresse inconnue retombe sur « À traiter » ; un contenu supprimé depuis se dit.
 */
import { describe, expect, it } from 'vitest'
import { readModerationStatus, reasonLabel, targetLabel, writeModerationStatus } from './moderation'

describe('le statut des signalements dans l’adresse', () => {
  it('lit « À traiter » par défaut, et sur une valeur inconnue', () => {
    expect(readModerationStatus(new URLSearchParams())).toBe('pending')
    expect(readModerationStatus(new URLSearchParams('statut=nimporte'))).toBe('pending')
  })

  it('lit les résolus et les rejetés', () => {
    expect(readModerationStatus(new URLSearchParams('statut=resolus'))).toBe('resolved')
    expect(readModerationStatus(new URLSearchParams('statut=rejetes'))).toBe('dismissed')
  })

  it('n’écrit rien pour le statut par défaut', () => {
    expect(writeModerationStatus('pending').toString()).toBe('')
    expect(writeModerationStatus('dismissed').toString()).toBe('statut=rejetes')
  })
})

describe('les libellés', () => {
  it('nomme le motif, et rend tel quel un motif inconnu', () => {
    expect(reasonLabel('info_erronee')).toBe('Information erronée')
    expect(reasonLabel('autre')).toBe('autre')
  })

  it('nomme ce qui est visé, même supprimé depuis', () => {
    expect(targetLabel('profile', 'Atelier Sauvage')).toBe('Vitrine · Atelier Sauvage')
    expect(targetLabel('event', null)).toBe('Fiche · supprimé depuis')
  })
})
