// reporting-ventes : de la liste des ventes d'un jour à la journée de reporting (lignes SuperPDP,
// détail par source, anomalies, statut). Fonctions pures, sans réseau : reporting-ventes.test.ts.
// Un remboursement est une vente négative, le jour où il a lieu : un jour envoyé ne bouge plus.
// Règle : tout se vend à 20 %, prix TTC. La France se déclare à 20 %, les exports à 0 % (TNT1) ; une vente
// dans l'UE bloque la journée, qu'une personne vérifie avant tout envoi. Montants en centimes.

export interface Commande {
  nom: string // « #1997 »
  lien: string // la commande dans l'admin Shopify
  pays: string | null // pays de livraison
  ttc: number
  tva: number // la TVA que Shopify a calculée : vérifiée, jamais déclarée telle quelle
  articles: number // un centime d'arrondi possible par article
  payee: boolean
}

export interface Paiement {
  code: string
  ttc: number
}

export interface Anomalie {
  message: string
  detail: string | null
  lien: string | null
}

export type Statut = 'en_attente' | 'a_verifier' | 'vide' | 'prete'

/** Les statuts qu'on peut recalculer : au-delà, la journée part ou est partie. */
export const REECRIVABLES: string[] = ['en_attente', 'a_verifier', 'vide', 'prete']

/** Ce qu'une source a donné ce jour-là ; null si elle n'a pas répondu. */
export interface Ventes {
  shopify?: Commande[] | null
  sumup?: Paiement[] | null
}

// Monaco est dans le territoire fiscal français ; les DOM ont leur propre code pays chez Shopify.
// Avant cette date, Shopify ne calculait pas la TVA : la sienne valait 0, celle déclarée est juste.
// shortcut : la date de Runes de Chêne, à passer en colonne à la deuxième enseigne.
const TVA_SHOPIFY_FIABLE_DEPUIS = '2026-11-10'
const FRANCE = new Set(['FR', 'MC'])
const UE = new Set(
  'AT BE BG HR CY CZ DK EE FI DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' '),
)

/** Ce que devient une journée selon la réponse de SuperPDP : une réponse perdue la bloque (renvoyer doublerait). */
export function statutApresEnvoi(http: number | null): 'envoyee' | 'refusee' | 'inconnue' {
  if (http !== null && http >= 200 && http < 300) return 'envoyee'
  return http !== null && http >= 400 && http < 500 ? 'refusee' : 'inconnue'
}

/** Identifie une vente facturée à un pro : commande Shopify ou paiement SumUp. */
export function cleVente(source: string, reference: string): string {
  return `${source}:${reference}`
}

export function zoneDe(pays: string): 'france' | 'ue' | 'hors_ue' {
  if (FRANCE.has(pays)) return 'france'
  return UE.has(pays) ? 'ue' : 'hors_ue'
}

/** La TVA contenue dans un prix TTC à 20 %. */
export function tvaDe(ttc: number): number {
  return Math.round(ttc / 6)
}

/** Ce qui empêche de déclarer une commande les yeux fermés. */
export function verifierCommande(c: Commande, controlerTva = true): Anomalie[] {
  const anomalie = (message: string, detail: string | null = null) => ({ message, detail, lien: c.lien })
  const anomalies: Anomalie[] = []
  if (!c.payee) anomalies.push(anomalie(`${c.nom} n'est pas payée`))
  if (!c.pays) return c.ttc === 0 ? anomalies : [...anomalies, anomalie(`${c.nom} n'a ni adresse de livraison ni de facturation`)]

  const zone = zoneDe(c.pays)
  if (zone === 'ue') {
    anomalies.push(anomalie(`${c.nom} part en ${c.pays}`, 'Vente dans l’UE : à traiter à part, hors de ce reporting.'))
  } else if (zone === 'hors_ue') {
    if (c.tva > 0) anomalies.push(anomalie(`${c.nom} part en ${c.pays}`, `Shopify a compté ${euros(c.tva)} de TVA sur un export.`))
  } else if (controlerTva && Math.abs(c.tva - tvaDe(c.ttc)) > c.articles) {
    anomalies.push(anomalie(`${c.nom} : TVA de ${euros(c.tva)} au lieu de ${euros(tvaDe(c.ttc))}`,
      'Un produit a sans doute « Facturer la taxe » décoché dans Shopify.'))
  }
  return anomalies
}

/** La journée telle qu'elle s'écrit en base. */
export function journee(jour: string, ventes: Ventes, facturees: ReadonlySet<string> = new Set()) {
  // Une vente facturée à un pro relève de la facture électronique : ni total B2C, ni anomalie.
  const commandes = (ventes.shopify ?? []).filter((c) => !facturees.has(cleVente('shopify', c.nom)))
  const paiements = (ventes.sumup ?? []).filter((p) => !facturees.has(cleVente('sumup', p.code)))
  const anomalies = commandes.flatMap((c) => verifierCommande(c, jour >= TVA_SHOPIFY_FIABLE_DEPUIS))

  // TVA calculée sur le total du jour (conception) : c'est ce qui part à SuperPDP.
  const enFrance = [
    ...commandes.filter((c) => c.pays && zoneDe(c.pays) === 'france').map((c) => c.ttc),
    ...paiements.map((p) => p.ttc),
  ]
  const ttc = enFrance.reduce((a, b) => a + b, 0)
  const tva = tvaDe(ttc)
  const exports = commandes.filter((c) => c.pays && zoneDe(c.pays) === 'hors_ue').reduce((a, c) => a + c.ttc, 0)
  const lignes = [
    ...(ttc === 0 ? [] : [ligneSuperPdp(jour, 'TLB1', '20.00', ttc - tva, tva)]),
    ...(exports === 0 ? [] : [ligneSuperPdp(jour, 'TNT1', '0.00', exports, 0)]),
  ]

  // Les ventes sont gardées : l'écran les liste, et un marquage recalcule sans relire les sources.
  const detail = Object.fromEntries(
    Object.entries(ventes).map(([source, liste]) => [source, liste
      ? {
        ttc: total(liste),
        ventes: liste.length,
        liste: (liste as (Commande | Paiement)[]).map((v) => ({ ...v, facturee: facturees.has(cleVente(source, referenceDe(v))) })),
      }
      : null]),
  )
  const muette = Object.values(ventes).some((liste) => liste === null)
  const statut: Statut = muette ? 'en_attente' : anomalies.length ? 'a_verifier' : lignes.length === 0 ? 'vide' : 'prete'
  return { jour, statut, lignes, detail, anomalies }
}

/** Les ventes d'une journée déjà écrite, telles que `journee` les a gardées. */
export function ventesDuDetail(detail: Record<string, { liste: (Commande & Paiement)[] } | null>): Ventes {
  return Object.fromEntries(Object.entries(detail).map(([source, lue]) => [source, lue ? lue.liste : null]))
}

function referenceDe(vente: Commande | Paiement): string {
  return 'nom' in vente ? vente.nom : vente.code
}

function ligneSuperPdp(jour: string, categorie: 'TLB1' | 'TNT1', taux: string, ht: number, tva: number) {
  return {
    date: jour,
    currency: 'EUR',
    category_code: categorie, // TLB1 : biens soumis à la TVA ; TNT1 : non soumis en France
    role_code: 'SE', // on est le vendeur
    tax_exclusive_amount: decimal(ht),
    tax_total: decimal(tva),
    tax_subtotals: [{ tax_percent: taux, taxable_amount: decimal(ht), tax_total: decimal(tva) }],
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
