/**
 * QUOI     — les règles du parrainage : base du code, lien, phrase des filleuls.
 * POURQUOI — un code ou un lien faux fait perdre son mois au parrain.
 */
import { describe, expect, test } from 'vitest'
import { referralBase, referralLink, referralStats } from './referral'

describe('referralBase', () => {
  test('majuscules sans accents, lettres et chiffres, 20 au plus', () => {
    expect(referralBase('Runes de Chêne')).toBe('RUNESDECHENE')
    expect(referralBase('L’atelier du Pooka !')).toBe('LATELIERDUPOOKA')
    expect(referralBase('a'.repeat(30))).toHaveLength(20)
  })
})

describe('referralLink', () => {
  test('la racine du site, quel que soit l’écran', () => {
    expect(referralLink('https://flw.sh', 'RUNESDECHENE')).toBe('https://flw.sh/?r=RUNESDECHENE')
  })
})

describe('referralStats', () => {
  test('payants, mois gagnés, puis en attente', () => {
    expect(referralStats(0, 0)).toBe('Aucun filleul payant pour l’instant')
    expect(referralStats(1, 0)).toBe('1 filleul payant · 1 mois gagné')
    expect(referralStats(3, 2)).toBe(
      '3 filleuls payants · 3 mois gagnés · 2 en attente de leur première facture',
    )
  })
})
