// reporting-ventes : de la liste des ventes d'un jour à la journée de reporting (lignes SuperPDP,
// détail par source, anomalies, statut). Fonctions pures, sans réseau : reporting-ventes.test.ts.
// Règle : tout se vend à 20 %, prix TTC. On ne déclare que la France ; le reste bloque la journée,
// qu'une personne vérifie avant tout envoi. Montants en centimes.

export interface Commande {
  nom: string // « #1997 »
  lien: string // la commande dans l'admin Shopify
  pays: string | null // pays de livraison
  ttc: number
  tva: number // la TVA que Shopify a calculée : vérifiée, jamais déclarée telle quelle
  articles: number // un centime d'arrondi possible par article
  rembourse: number
  payee: boolean
}

export interface Paiement {
  code: string
  ttc: number
  rembourse: number
}

export interface Anomalie {
  message: string
  detail: string | null
  lien: string | null
}

export type Statut = 'en_attente' | 'a_verifier' | 'vide' | 'prete'

/** Ce qu'une source a donné ce jour-là ; null si elle n'a pas répondu. */
export interface Ventes {
  shopify?: Commande[] | null
  sumup?: Paiement[] | null
}

// Monaco est dans le territoire fiscal français ; les DOM ont leur propre code pays chez Shopify.
const FRANCE = new Set(['FR', 'MC'])
const UE = new Set(
  'AT BE BG HR CY CZ DK EE FI DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' '),
)

export function zoneDe(pays: string): 'france' | 'ue' | 'hors_ue' {
  if (FRANCE.has(pays)) return 'france'
  return UE.has(pays) ? 'ue' : 'hors_ue'
}

/** La TVA contenue dans un prix TTC à 20 %. */
export function tvaDe(ttc: number): number {
  return Math.round(ttc / 6)
}

/** Ce qui empêche de déclarer une commande les yeux fermés. */
export function verifierCommande(c: Commande): Anomalie[] {
  const anomalie = (message: string, detail: string | null = null) => ({ message, detail, lien: c.lien })
  const anomalies: Anomalie[] = []
  if (!c.payee) anomalies.push(anomalie(`${c.nom} n'est pas payée`))
  if (c.rembourse > 0) anomalies.push(anomalie(`${c.nom} est remboursée de ${euros(c.rembourse)}`))
  if (!c.pays) return [...anomalies, anomalie(`${c.nom} n'a pas d'adresse de livraison`)]

  const zone = zoneDe(c.pays)
  if (zone === 'ue') {
    anomalies.push(anomalie(`${c.nom} part en ${c.pays}`, 'Vente dans l’UE : à traiter à part, hors de ce reporting.'))
  } else if (zone === 'hors_ue') {
    const detail = c.tva > 0 ? `Shopify a compté ${euros(c.tva)} de TVA sur un export.` : 'Export exonéré, hors de ce reporting.'
    anomalies.push(anomalie(`${c.nom} part en ${c.pays}`, detail))
  } else if (Math.abs(c.tva - tvaDe(c.ttc)) > c.articles) {
    anomalies.push(anomalie(`${c.nom} : TVA de ${euros(c.tva)} au lieu de ${euros(tvaDe(c.ttc))}`,
      'Un produit a sans doute « Facturer la taxe » décoché dans Shopify.'))
  }
  return anomalies
}

export function verifierPaiement(p: Paiement): Anomalie[] {
  if (p.rembourse === 0) return []
  return [{ message: `Paiement SumUp ${p.code} remboursé de ${euros(p.rembourse)}`, detail: null, lien: null }]
}

/** La journée telle qu'elle s'écrit en base. */
export function journee(jour: string, ventes: Ventes) {
  const commandes = ventes.shopify ?? []
  const paiements = ventes.sumup ?? []
  const anomalies = [...commandes.flatMap(verifierCommande), ...paiements.flatMap(verifierPaiement)]

  // La France seulement, TVA recalculée vente par vente : c'est ce qui part à SuperPDP.
  const enFrance = [
    ...commandes.filter((c) => c.pays && zoneDe(c.pays) === 'france').map((c) => c.ttc),
    ...paiements.map((p) => p.ttc),
  ]
  const ttc = enFrance.reduce((a, b) => a + b, 0)
  const tva = enFrance.reduce((a, b) => a + tvaDe(b), 0)
  const lignes = ttc === 0 ? [] : [ligneSuperPdp(jour, ttc - tva, tva)]

  const detail = Object.fromEntries(
    Object.entries(ventes).map(([source, liste]) => [source, liste ? { ttc: total(liste), ventes: liste.length } : null]),
  )
  const muette = Object.values(ventes).some((liste) => liste === null)
  const statut: Statut = muette ? 'en_attente' : anomalies.length ? 'a_verifier' : ttc === 0 ? 'vide' : 'prete'
  return { jour, statut, lignes, detail, anomalies }
}

function ligneSuperPdp(jour: string, ht: number, tva: number) {
  return {
    date: jour,
    currency: 'EUR',
    category_code: 'TLB1', // livraisons de biens
    role_code: 'SE', // on est le vendeur
    tax_exclusive_amount: decimal(ht),
    tax_total: decimal(tva),
    tax_subtotals: [{ tax_percent: '20.00', taxable_amount: decimal(ht), tax_total: decimal(tva) }],
  }
}

function total(liste: { ttc: number }[]): number {
  return liste.reduce((a, v) => a + v.ttc, 0)
}

function decimal(centimes: number): string {
  return (centimes / 100).toFixed(2)
}

function euros(centimes: number): string {
  return `${decimal(centimes).replace('.', ',')} €`
}
