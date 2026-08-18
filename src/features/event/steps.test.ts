import { describe, expect, it } from 'vitest'
import { participationState, paymentState } from './steps'

// Les index suivent PARTICIPATION_STEPS : 0 intéressé, 1 dossier, 2 inscrit.
describe('les crans de participation', () => {
  it('coche tout ce qui précède le cran atteint', () => {
    // Inscrit implique d'avoir été intéressé : l'inverse n'aurait aucun sens.
    expect(participationState(0, 2)).toBe('done')
    expect(participationState(1, 2)).toBe('done')
    expect(participationState(2, 2)).toBe('done')
  })

  it('désigne la prochaine étape, sans la cocher', () => {
    expect(participationState(1, 0)).toBe('next')
    expect(participationState(2, 0)).toBe('todo')
  })

  // Sans participation, l'index vaut -1 : rien n'est acquis et le premier cran
  // est ce qu'on peut faire.
  it('sans participation, propose le premier cran', () => {
    expect(participationState(0, -1)).toBe('next')
    expect(participationState(1, -1)).toBe('todo')
  })
})

// Index : 0 à payer, 1 acompte versé, 2 payé.
describe('les crans de paiement', () => {
  // Le piège : « à payer » décrit une dette, pas une chose faite. Le cocher
  // ferait dire à la case le contraire de ce qu'elle montre.
  it('ne coche jamais « à payer » quand rien n’a été versé', () => {
    expect(paymentState(0, 0)).toBe('next')
    expect(paymentState(1, 0)).toBe('todo')
  })

  it('coche ce qui est réglé une fois un versement posé', () => {
    expect(paymentState(0, 1)).toBe('done')
    expect(paymentState(1, 1)).toBe('done')
    expect(paymentState(2, 1)).toBe('next')
  })

  it('coche tout quand la place est soldée', () => {
    expect(paymentState(2, 2)).toBe('done')
  })
})
