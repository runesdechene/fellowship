// Lancer : node --test supabase/functions/_shared/reporting-versements.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { csvVersementsShopify, csvVersementsSumup } from './reporting-versements.ts'

const versement = { statut: 'PAID', devise: 'EUR', rembourse: 0, ajustements: 0, avances: 0, reserve: 0, relance: 0 }

test('les versements Shopify reprennent l’export de l’admin, ligne pour ligne (octobre 2026)', () => {
  const csv = csvVersementsShopify([
    { ...versement, date: '2026-10-01', reference: 'SHOPIFY-MGIIFKZWFQFPIC6BEEA3ALN8YE7', encaisse: 18340, frais: 351, net: 17989 },
    { ...versement, date: '2026-10-08', reference: 'SHOPIFY-VE5BRG66CJWL3LU6VVJMEUT3YKK', encaisse: 29429, rembourse: -352, frais: 542, net: 28535 },
  ])
  assert.equal(csv, [
    'Payout Date,Status,Charges,Refunds,Adjustments,Marketplace Sales Tax,Advances,Reserved Funds,Fees,Retried Amount,Total,Currency,Bank Reference',
    '2026-10-08,paid,294.29,-3.52,0.00,0.00,0.00,0.00,5.42,0.00,285.35,EUR,SHOPIFY-VE5BRG66CJWL3LU6VVJMEUT3YKK',
    '2026-10-01,paid,183.40,0.00,0.00,0.00,0.00,0.00,3.51,0.00,179.89,EUR,SHOPIFY-MGIIFKZWFQFPIC6BEEA3ALN8YE7',
    '',
  ].join('\n'))
})

test('les paiements SumUp se regroupent par versement, comme le relevé PDF (octobre 2026)', () => {
  const ref = 'SUMUP PID1384699 PAYOUT 051026'
  const csv = csvVersementsSumup([
    { date: '2026-10-05', reference: ref, amount: 39.64, fee: 0.36 },
    { date: '2026-10-05', reference: ref, amount: 99.1, fee: 0.9 },
  ])
  assert.equal(csv, [
    'Date,Nombre de paiements,Référence,Montant total,Frais,Versement',
    `2026-10-05,2,${ref},140.00,1.26,138.74`,
    'Total,,,140.00,1.26,138.74',
    '',
  ].join('\n'))
})
