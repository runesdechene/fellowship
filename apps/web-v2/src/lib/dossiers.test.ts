/**
 * QUOI     — les tests de lib/dossiers.ts : ce que « Mes dossiers » dit du dossier et du paiement
 *            d'une date.
 * POURQUOI — c'est la fonction plébiscitée du tableau de bord : un libellé faux y fait payer deux
 *            fois ou oublier un solde.
 */
import { describe, expect, it } from 'vitest'
import { balanceOf, dossierView } from './dossiers'
import { formatEuros } from './money'

const base = {
  status: 'inscrit',
  paymentStatus: 'a_payer',
  orientation: 'payeur',
  amount: 450,
} as const

describe('dossierView — le dossier', () => {
  it('un dossier parti sans réponse est « Dossier envoyé », pas encore acquis', () => {
    expect(dossierView({ ...base, status: 'en_cours' }).dossier).toEqual({
      label: 'Dossier envoyé',
      acquired: false,
    })
  })

  it('inscrit ou confirmé, c’est acquis', () => {
    expect(dossierView(base).dossier).toEqual({ label: 'Inscrit', acquired: true })
    expect(dossierView({ ...base, status: 'confirme' }).dossier.acquired).toBe(true)
  })
})

describe('dossierView — le paiement d’un exposant qui paie', () => {
  it('à payer, sous condition tant que le dossier n’est pas accepté', () => {
    expect(dossierView({ ...base, status: 'en_cours' }).payment).toEqual({
      label: 'À payer',
      detail: `${formatEuros(450)} si le dossier est accepté`,
      tone: 'todo',
    })
    expect(dossierView(base).payment.detail).toBe(`${formatEuros(450)} à régler`)
  })

  it('acompte versé : il reste le solde', () => {
    expect(dossierView({ ...base, paymentStatus: 'acompte_verse' }).payment).toEqual({
      label: 'Acompte versé',
      detail: `Reste le solde sur ${formatEuros(450)}`,
      tone: 'partial',
    })
  })

  it('payé : acquis', () => {
    expect(dossierView({ ...base, paymentStatus: 'paye' }).payment).toEqual({
      label: 'Payé',
      detail: `${formatEuros(450)} réglés`,
      tone: 'done',
    })
  })

  it('sans prix renseigné, pas de montant inventé', () => {
    expect(dossierView({ ...base, amount: null }).payment.detail).toBe('Montant à renseigner')
    expect(dossierView({ ...base, amount: null, paymentStatus: 'paye' }).payment.detail).toBeNull()
  })
})

describe('dossierView — le cachet d’un exposant payé', () => {
  const paid = { ...base, orientation: 'paye' } as const

  it('à recevoir, puis reçu', () => {
    expect(dossierView(paid).payment).toEqual({
      label: 'À recevoir',
      detail: `Cachet de ${formatEuros(450)}`,
      tone: 'todo',
    })
    expect(dossierView({ ...paid, paymentStatus: 'paye' }).payment).toEqual({
      label: 'Reçu',
      detail: `${formatEuros(450)} reçus`,
      tone: 'done',
    })
  })
})

describe('balanceOf', () => {
  it('rien de versé tant que c’est à payer', () => {
    expect(balanceOf(450, 150, 'a_payer')).toEqual({ paid: 0, rest: 450, ratio: 0 })
  })

  it('l’acompte compte comme versé', () => {
    expect(balanceOf(450, 150, 'acompte_verse')).toEqual({ paid: 150, rest: 300, ratio: 1 / 3 })
  })

  it('payé : tout est versé, quel que soit l’acompte noté', () => {
    expect(balanceOf(450, 150, 'paye')).toEqual({ paid: 450, rest: 0, ratio: 1 })
  })

  it('un acompte sans montant noté vaut zéro, et ne dépasse jamais le total', () => {
    expect(balanceOf(450, null, 'acompte_verse')?.paid).toBe(0)
    expect(balanceOf(450, 600, 'acompte_verse')).toEqual({ paid: 450, rest: 0, ratio: 1 })
  })

  it('sans total, pas de jauge', () => {
    expect(balanceOf(0, 150, 'acompte_verse')).toBeNull()
  })
})
