// reporting-versements : les deux pièces jointes du récap, en CSV, à partir des versements du mois.
// Shopify : les mêmes colonnes que l'export manuel « Versements » de l'admin, pour que l'expert-comptable
// s'y retrouve. SumUp : le tableau du « Relevé de versements » PDF (aucune API ne fournit le PDF).
// Fonctions pures, sans réseau : reporting-versements.test.ts.

export interface VersementShopify {
  date: string // AAAA-MM-JJ, jour de Paris
  statut: string // PAID, IN_TRANSIT…
  devise: string
  reference: string | null
  // Montants en centimes, signés comme dans l'export (un remboursement est négatif).
  encaisse: number
  rembourse: number
  ajustements: number
  avances: number
  reserve: number
  frais: number
  relance: number
  net: number
}

export interface LigneSumup {
  date: string // AAAA-MM-JJ
  reference: string // vide : une déduction (remboursement, rétrofacturation)
  amount: number // net, en euros (champ de l'API)
  fee: number
}

const MONTANTS = ['encaisse', 'rembourse', 'ajustements', 'avances', 'reserve', 'frais', 'relance', 'net'] as const
type Montants = Pick<VersementShopify, (typeof MONTANTS)[number]>

const ENTETE_SHOPIFY = 'Payout Date,Status,Charges,Refunds,Adjustments,Marketplace Sales Tax,Advances,Reserved Funds,Fees,Retried Amount,Total,Currency,Bank Reference'

/** L'export « Versements » de Shopify, du plus récent au plus ancien comme dans l'admin, puis le total. */
export function csvVersementsShopify(versements: VersementShopify[]): string {
  const montants = (v: Montants) => [
    montant(v.encaisse), montant(v.rembourse), montant(v.ajustements), '0.00',
    montant(v.avances), montant(v.reserve), montant(v.frais), montant(v.relance), montant(v.net),
  ]
  const total = Object.fromEntries(MONTANTS.map((m) => [m, versements.reduce((a, v) => a + v[m], 0)])) as Montants
  const lignes = [...versements].sort((a, b) => b.date.localeCompare(a.date)).map((v) =>
    [v.date, v.statut.toLowerCase(), ...montants(v), v.devise, v.reference ?? ''].map(champ).join(','))
  // L'export de l'admin n'a pas de total : il est ajouté pour l'expert-comptable (Uriel, 10/11/2026).
  const ligneTotal = ['Total', '', ...montants(total), versements[0]?.devise ?? '', ''].join(',')
  return [ENTETE_SHOPIFY, ...lignes, ligneTotal].join('\n') + '\n'
}

/** Le tableau du relevé SumUp : un versement par ligne (les paiements regroupés), puis le total. */
export function csvVersementsSumup(lignes: LigneSumup[]): string {
  const parVersement = new Map<string, { date: string; reference: string; paiements: number; net: number; frais: number }>()
  for (const l of lignes) {
    const cle = `${l.date}|${l.reference}`
    const v = parVersement.get(cle) ?? { date: l.date, reference: l.reference, paiements: 0, net: 0, frais: 0 }
    v.paiements += 1
    v.net += Math.round(l.amount * 100)
    v.frais += Math.round(l.fee * 100)
    parVersement.set(cle, v)
  }
  const versements = [...parVersement.values()].sort((a, b) => a.date.localeCompare(b.date))
  const somme = (champ: 'net' | 'frais') => versements.reduce((a, v) => a + v[champ], 0)
  const ligne = (cellules: string[]) => cellules.map(champ).join(',')
  return [
    'Date,Nombre de paiements,Référence,Montant total,Frais,Versement',
    ...versements.map((v) => ligne([v.date, String(v.paiements), v.reference, montant(v.net + v.frais), montant(v.frais), montant(v.net)])),
    ligne(['Total', '', '', montant(somme('net') + somme('frais')), montant(somme('frais')), montant(somme('net'))]),
  ].join('\n') + '\n'
}

function montant(centimes: number): string {
  return (centimes / 100).toFixed(2)
}

function champ(valeur: string): string {
  return /[",\n]/.test(valeur) ? `"${valeur.replaceAll('"', '""')}"` : valeur
}
