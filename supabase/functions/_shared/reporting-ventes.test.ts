// Lancer : node --test supabase/functions/_shared/reporting-ventes.test.ts (Node retire les types seul).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleVente, journee, statutApresEnvoi, ventesDuDetail, verifierCommande, type Commande } from './reporting-ventes.ts'

const commande = (c: Partial<Commande>): Commande => ({
  nom: '#1', lien: 'l', pays: 'FR', ttc: 3000, tva: 500, articles: 1, payee: true, ...c,
})

test('une commande française juste ne lève rien', () => {
  assert.deepEqual(verifierCommande(commande({})), [])
})

test('un produit sans TVA dans Shopify est signalé (le sweatshirt du 09/11)', () => {
  const [a] = verifierCommande(commande({ ttc: 25173, tva: 899, articles: 3 }))
  assert.match(a?.message ?? '', /TVA de 8,99 € au lieu de 41,96 €/)
})

test('un centime d’arrondi par article est toléré', () => {
  assert.deepEqual(verifierCommande(commande({ ttc: 25173, tva: 4194, articles: 3 })), [])
})

test('l’UE bloque, l’export part en TNT1 à 0 %', () => {
  const j = journee('2026-11-07', {
    shopify: [commande({ pays: 'RE', ttc: 12369, tva: 0 }), commande({ pays: 'BE' }), commande({})],
    sumup: [{ code: 'T1', ttc: 1200 }],
  })
  assert.equal(j.statut, 'a_verifier')
  assert.equal(j.anomalies.length, 1)
  assert.equal(j.lignes[0]?.tax_exclusive_amount, '35.00') // 30 € + 12 € TTC
  assert.equal(j.lignes[0]?.tax_total, '7.00')
  assert.equal(j.lignes[1]?.category_code, 'TNT1')
  assert.equal(j.lignes[1]?.tax_exclusive_amount, '123.69')
  assert.equal(j.lignes[1]?.tax_total, '0.00')
  assert.equal(j.detail.shopify?.ttc, 3000 + 3000 + 12369)
  assert.equal(j.detail.shopify?.ventes, 3)
})

test('une source muette laisse le jour en attente', () => {
  assert.equal(journee('2026-11-07', { shopify: [commande({})], sumup: null }).statut, 'en_attente')
})

test('un jour sans vente est vide, un jour propre est prêt', () => {
  assert.equal(journee('2026-11-02', { shopify: [], sumup: [] }).statut, 'vide')
  assert.equal(journee('2026-11-02', { shopify: [commande({})], sumup: [] }).statut, 'prete')
})

test('un remboursement se déduit du total du jour', () => {
  const j = journee('2026-11-02', { sumup: [{ code: 'T1', ttc: 3000 }, { code: 'T2 remboursement', ttc: -1200 }] })
  assert.equal(j.statut, 'prete')
  assert.equal(j.lignes[0]?.tax_exclusive_amount, '15.00')
  assert.equal(j.lignes[0]?.tax_total, '3.00')
})

test('un total du jour négatif part tel quel : SuperPDP l’accepte (bac à sable, 09/11/2026)', () => {
  const j = journee('2026-11-02', { sumup: [{ code: 'T remboursement', ttc: -1200 }] })
  assert.equal(j.statut, 'prete')
  assert.equal(j.lignes[0]?.tax_total, '-2.00')
})

test('une vente facturée à un pro sort du total et n’alerte plus', () => {
  const ventes = { shopify: [commande({ nom: '#2', pays: 'RE', ttc: 12369, tva: 0 }), commande({})], sumup: [] }
  const j = journee('2026-11-07', ventes, new Set([cleVente('shopify', '#2')]))
  assert.equal(j.statut, 'prete')
  assert.equal(j.lignes[0]?.tax_total, '5.00')
  assert.equal(j.detail.shopify?.liste[0]?.facturee, true)
})

test('une journée se recalcule depuis les ventes qu’elle a gardées', () => {
  const j = journee('2026-11-07', { shopify: [commande({ nom: '#2' })], sumup: null })
  const ventes = ventesDuDetail(j.detail as Parameters<typeof ventesDuDetail>[0])
  assert.equal(ventes.sumup, null)
  assert.equal(journee('2026-11-07', ventes, new Set([cleVente('shopify', '#2')])).lignes.length, 0)
})

test('une TVA comptée sur un export bloque, pas son remboursement', () => {
  assert.equal(journee('2026-11-07', { shopify: [commande({ pays: 'CH', ttc: 3000, tva: 500 })] }).statut, 'a_verifier')
  assert.equal(journee('2026-11-07', { shopify: [commande({ pays: 'CH', ttc: -3000, tva: -500 })] }).statut, 'prete')
})

test('une réponse perdue ne se renvoie pas', () => {
  assert.equal(statutApresEnvoi(200), 'envoyee')
  assert.equal(statutApresEnvoi(422), 'refusee')
  assert.equal(statutApresEnvoi(500), 'inconnue')
  assert.equal(statutApresEnvoi(null), 'inconnue')
})

test('la TVA de Shopify ne se contrôle qu’une fois Shopify Tax actif', () => {
  const sansTva = { shopify: [commande({ tva: 0 })], sumup: [] }
  assert.equal(journee('2026-11-08', sansTva).statut, 'prete')
  assert.equal(journee('2026-11-10', sansTva).statut, 'a_verifier')
})
