// Lancer : node --test supabase/functions/_shared/reporting-ventes.test.ts (Node retire les types seul).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { paysDeStand } from './reporting-stands.ts'
import { cleVente, echeanceDe, horsCartesCadeaux, journee, messageAlerte, messageRecap, statutDeclaration, paysEffectif, statutApresEnvoi, ventesDuDetail, verifierCommande, type Commande } from './reporting-ventes.ts'

const commande = (c: Partial<Commande>): Commande => ({
  nom: '#1', lien: 'l', pays: 'FR', ttc: 3000, tva: 500, articles: 1, payee: true, ...c,
})

test('une carte cadeau vendue sort du montant, le reste de la commande reste', () => {
  assert.equal(horsCartesCadeaux(8000, [{ carteCadeau: true, ttc: 5000 }, { carteCadeau: false, ttc: 3000 }]), 3000)
  assert.equal(horsCartesCadeaux(5000, [{ carteCadeau: true, ttc: 5000 }]), 0)
})

test('le récap du mois additionne ce qui est parti, décade par décade', () => {
  const j = (jour: string, statut: string, ventes: Commande[]) => ({ ...journee(jour, { shopify: ventes, sumup: [] }), statut })
  const { sujet, texte } = messageRecap('2026-11', [
    j('2026-11-04', 'envoyee', [commande({ ttc: 12000, tva: 2000 })]),
    j('2026-11-15', 'envoyee', [commande({ nom: '#2003', pays: 'CH', ttc: 17721, tva: 0 })]),
    j('2026-11-25', 'envoyee', [commande({ ttc: -3000, tva: -500 })]),
    j('2026-11-28', 'a_verifier', [commande({ ttc: 6000, tva: 1000 })]),
  ])
  assert.equal(sujet, 'Runes de Chêne : ventes aux particuliers de novembre 2026')
  assert.match(texte, /- Du 1er au 10 : 100,00 € HT à 20 % \(TVA 20,00 €\), 0,00 € hors TVA française\./)
  assert.match(texte, /- Du 11 au 20 : 0,00 € HT à 20 % \(TVA 0,00 €\), 177,21 € hors TVA française\./)
  assert.match(texte, /- Du 21 au 30 : -25,00 € HT à 20 % \(TVA -5,00 €\)/) // le 28 n'est pas parti : pas compté
  assert.match(texte, /Mois : 75,00 € HT à 20 % \(TVA 15,00 €\), 177,21 € hors TVA française\./)
  assert.match(texte, /Pas encore déclarés : 28\/11\/2026\./)
})

test('la note du mois s’ajoute sous l’introduction du récap', () => {
  const note = 'Avant le 9 novembre, Shopify ne calculait pas la TVA : elle est recalculée à 20 %.'
  const { texte } = messageRecap('2026-11', [], note)
  assert.match(texte, /passent par Pennylane\.\n\nAvant le 9 novembre[^\n]*\n\n- Du 1er au 10/)
  assert.doesNotMatch(messageRecap('2026-11', []).texte, /Avant le 9/)
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

test('l’UE sous le seuil part à 20 %, l’export en TNT1 à 0 %', () => {
  const j = journee('2026-11-07', {
    shopify: [commande({ pays: 'RE', ttc: 12369, tva: 0 }), commande({ pays: 'BE' }), commande({})],
    sumup: [{ code: 'T1', ttc: 1200 }],
  })
  assert.equal(j.statut, 'prete')
  assert.equal(j.lignes[0]?.tax_exclusive_amount, '60.00') // 30 € France + 30 € Belgique + 12 € SumUp, TTC
  assert.equal(j.lignes[0]?.tax_total, '12.00')
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

test('sans pays, seule une commande à 0 € passe', () => {
  assert.equal(verifierCommande(commande({ pays: null, ttc: 0, tva: 0 })).length, 0)
  assert.equal(verifierCommande(commande({ pays: null })).length, 1)
})

test('au-delà du seuil UE, la journée se bloque', () => {
  const ventes = { shopify: [commande({ pays: 'BE' })], sumup: [] }
  assert.equal(journee('2026-11-07', ventes, new Set(), true).statut, 'a_verifier')
})

test('un code postal d’outre-mer saisi avec France part en export, pas Monaco', () => {
  assert.equal(paysEffectif('FR', '97400'), 'FR-OUTRE-MER')
  assert.equal(paysEffectif('FR', '98800'), 'FR-OUTRE-MER')
  assert.equal(paysEffectif('FR', '98000'), 'FR')
  assert.equal(paysEffectif('FR', '75001'), 'FR')
  assert.equal(paysEffectif('BE', '97400'), 'BE')
  const j = journee('2026-11-07', { shopify: [commande({ pays: paysEffectif('FR', '97400'), tva: 0 })] })
  assert.equal(j.lignes[0]?.category_code, 'TNT1')
})

test('un stand se place d’après son GPS', () => {
  assert.equal(paysDeStand(46.8, 7.2), 'CH') // Fribourg
  assert.equal(paysDeStand(46.5, 6.4), 'CH') // Vaud
  assert.equal(paysDeStand(50.85, 4.35), 'BE') // Bruxelles
  assert.equal(paysDeStand(50.63, 3.06), null) // Lille
  assert.equal(paysDeStand(46.19, 6.24), null) // Annemasse
  assert.equal(paysDeStand(43.7, 7.3), null) // Nice
})

test('un stand à l’étranger part en TNT1, sur son HT, et se confirme', () => {
  const j = journee('2026-08-28', { sumup: [{ code: 'T1', ttc: 10810, pays: 'CH' }, { code: 'T2', ttc: 1200 }] })
  assert.equal(j.statut, 'a_verifier')
  assert.equal(j.lignes[0]?.category_code, 'TLB1')
  assert.equal(j.lignes[0]?.tax_total, '2.00')
  assert.equal(j.lignes[1]?.category_code, 'TNT1')
  assert.equal(j.lignes[1]?.tax_exclusive_amount, '108.10') // Suisse : le montant encaissé
})

test('l’échéance d’une décade (tableau 13 de la DGFiP)', () => {
  assert.equal(echeanceDe('2026-11-04'), '2026-11-20')
  assert.equal(echeanceDe('2026-02-15'), '2026-02-28')
  assert.equal(echeanceDe('2026-12-25'), '2027-01-10')
})

test('le dernier événement d’une déclaration fait foi', () => {
  const d = statutDeclaration({ start_period: '2026-11-01', end_period: '2026-11-10', events: [{ status_code: 'ppf:ereporting' }, { status_code: 'ppf:ereporting-rejected' }] })
  assert.deepEqual(d, { debut: '20261101', fin: '20261110', statut: 'ppf:ereporting-rejected' })
})

test('l’e-mail : rien à dire, rien d’envoyé', () => {
  assert.equal(messageAlerte([], [], [], true), null)
  const m = messageAlerte([{ jour: '2026-11-04', statut: 'a_verifier' }], ['SumUp'], [], true)
  assert.equal(m?.sujet, 'Fellowship E-Reporting : 2 choses à regarder')
  assert.match(m?.texte ?? '', /04\/11\/2026 : à vérifier \(à déposer avant le 20\/11\/2026\)/)
})
