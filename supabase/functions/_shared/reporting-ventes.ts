// reporting-ventes : de la liste des ventes d'un jour à la journée de reporting (lignes SuperPDP,
// détail par source, anomalies, statut). Fonctions pures, sans réseau : reporting-ventes.test.ts.
// Un remboursement est une vente négative, le jour où il a lieu : un jour envoyé ne bouge plus.
// Règle : tout se vend à 20 %, prix TTC. La France et l'UE sous le seuil se déclarent à 20 % (TLB1), les exports
// à 0 % (TNT1). Au-delà du seuil UE, la journée se bloque : le régime change (OSS). Montants en centimes.

import { NOM_PAYS_STAND, TAUX_STAND } from './reporting-stands.ts'

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
  pays?: string // un stand à l'étranger ; absent : en France
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

export interface Declaration {
  debut: string // AAAAMMJJ
  fin: string
  statut: string | null // le dernier événement : ppf:ereporting-ack, ppf:ereporting-rejected…
}

/** Une déclaration SuperPDP réduite à sa période et à son dernier événement. */
export function statutDeclaration(d: { start_period: string; end_period: string; events?: { status_code: string }[] }): Declaration {
  const chiffres = (date: string) => String(date).replace(/\D/g, '').slice(0, 8)
  return { debut: chiffres(d.start_period), fin: chiffres(d.end_period), statut: d.events?.at(-1)?.status_code ?? null }
}

/** Le dernier jour pour déposer la décade d'un jour, en réel normal mensuel (DGFiP, tableau 13). */
export function echeanceDe(jour: string): string {
  const [annee, mois, quantieme] = jour.split('-').map(Number)
  const date = quantieme <= 10
    ? new Date(Date.UTC(annee, mois - 1, 20))
    : quantieme <= 20 ? new Date(Date.UTC(annee, mois, 0)) : new Date(Date.UTC(annee, mois, 10))
  return date.toISOString().slice(0, 10)
}

const A_TRAITER: Record<string, string> = {
  a_verifier: 'à vérifier',
  refusee: 'refusée par SuperPDP',
  inconnue: 'réponse de SuperPDP perdue',
  en_attente: 'une source n’a pas répondu',
}

/** L'e-mail du matin, ou null s'il n'y a rien à voir. */
export function messageAlerte(
  jours: { jour: string; statut: string }[],
  muettes: string[],
  rejetees: Declaration[],
  rappelEcheance: boolean,
) {
  if (jours.length === 0 && muettes.length === 0 && rejetees.length === 0) return null
  const lignes = [
    ...rejetees.map((d) => `- Déclaration du ${dateFr(d.debut)} au ${dateFr(d.fin)} : rejetée par l'administration.`),
    ...muettes.map((source) => `- ${source} n'a pas répondu ce matin.`),
    ...jours.map(({ jour, statut }) =>
      `- ${dateFr(jour)} : ${A_TRAITER[statut] ?? statut}${rappelEcheance ? ` (à déposer avant le ${dateFr(echeanceDe(jour))})` : ''}.`),
  ]
  const sujet = lignes.length === 1 ? 'Une chose à regarder' : `${lignes.length} choses à regarder`
  return { sujet: `Fellowship E-Reporting : ${sujet}`, texte: `${lignes.join('\n')}\n\nhttps://flw.sh/reporting` }
}

interface JourRecap {
  jour: string
  statut: string
  lignes: { category_code: string; tax_exclusive_amount: string; tax_total: string }[]
  detail: Record<string, { liste: { nom?: string; code?: string; facturee?: boolean }[] } | null>
}

const MOIS = 'janvier février mars avril mai juin juillet août septembre octobre novembre décembre'.split(' ')

/** Le récap du mois pour l'expert-comptable : ce qui est parti à l'administration, décade par décade. */
export function messageRecap(mois: string, jours: JourRecap[]) {
  const [annee, m] = mois.split('-').map(Number)
  const nomMois = `${MOIS[m - 1]} ${annee}`
  const centimes = (montant: string) => Math.round(Number(montant) * 100)
  const somme = (liste: JourRecap[], categorie: string, champ: 'tax_exclusive_amount' | 'tax_total') =>
    liste.filter((j) => j.statut === 'envoyee').flatMap((j) => j.lignes).filter((l) => l.category_code === categorie).reduce((a, l) => a + centimes(l[champ]), 0)
  const bilan = (liste: JourRecap[]) =>
    `${euros(somme(liste, 'TLB1', 'tax_exclusive_amount'))} HT à 20 % (TVA ${euros(somme(liste, 'TLB1', 'tax_total'))}), ` +
    `${euros(somme(liste, 'TNT1', 'tax_exclusive_amount'))} hors TVA française`

  const fin = new Date(Date.UTC(annee, m, 0)).getUTCDate()
  const decades = [[1, 10], [11, 20], [21, fin]].map(([du, au]) => {
    const liste = jours.filter((j) => Number(j.jour.slice(8)) >= du && Number(j.jour.slice(8)) <= au)
    return `- Du ${du === 1 ? '1er' : du} au ${au} : ${bilan(liste)}.`
  })
  const nonParties = jours.filter((j) => !['envoyee', 'vide'].includes(j.statut)).map((j) => dateFr(j.jour))
  const facturees = jours.flatMap((j) => Object.values(j.detail).flatMap((lue) => lue?.liste ?? []))
    .filter((v) => v.facturee).map((v) => v.nom ?? v.code)

  const texte = [
    `Ventes aux particuliers de ${nomMois}, telles que déclarées à l'administration (e-reporting), remboursements déduits.`,
    // shortcut : la phrase de Runes de Chêne, à passer en réglage à la deuxième enseigne.
    'Cet e-mail ne concerne que les ventes aux particuliers, sur Shopify et SumUp. Les factures aux professionnels passent par Pennylane.',
    '', ...decades, '', `Mois : ${bilan(jours)}.`, '',
    'Hors TVA française : exports (Suisse, outre-mer…) et stands à l’étranger.',
    ...(facturees.length ? [`Facturées à un pro, donc absentes de ce récap : ${facturees.join(', ')}.`] : []),
    ...(nonParties.length ? [`Pas encore déclarés : ${nonParties.join(', ')}.`] : []),
  ]
  return { sujet: `Runes de Chêne : ventes aux particuliers de ${nomMois}`, texte: texte.join('\n') }
}

function dateFr(date: string): string {
  const c = date.replace(/\D/g, '')
  return `${c.slice(6, 8)}/${c.slice(4, 6)}/${c.slice(0, 4)}`
}

/** Identifie une vente facturée à un pro : commande Shopify ou paiement SumUp. */
export function cleVente(source: string, reference: string): string {
  return `${source}:${reference}`
}

/** Le pays fiscal d'une adresse : un code postal d'outre-mer saisi avec « France » n'est pas la France. */
export function paysEffectif(pays: string | null, codePostal: string | null | undefined): string | null {
  // 980 : Monaco, fiscalement en France.
  return pays === 'FR' && /^(97|98[4-9])/.test(codePostal ?? '') ? 'FR-OUTRE-MER' : pays
}

/** Le seuil des ventes à distance dans l'UE, en centimes HT, sur l'année ou la précédente (art. 258 A du CGI). */
export const SEUIL_UE = 1_000_000

export function zoneDe(pays: string): 'france' | 'ue' | 'hors_ue' {
  if (FRANCE.has(pays)) return 'france'
  return UE.has(pays) ? 'ue' : 'hors_ue'
}

/** Le montant d'une commande sans ses cartes cadeaux : un bon à usage multiple se déclare quand il sert,
 *  pas quand il se vend (art. 256 ter du CGI). La commande payée avec la carte garde, elle, son plein total. */
export function horsCartesCadeaux(ttc: number, lignes: { carteCadeau: boolean; ttc: number }[]): number {
  return ttc - lignes.filter((l) => l.carteCadeau).reduce((somme, l) => somme + l.ttc, 0)
}

/** La TVA contenue dans un prix TTC à 20 %. */
export function tvaDe(ttc: number): number {
  return Math.round(ttc / 6)
}

/** Ce qui empêche de déclarer une commande les yeux fermés. */
export function verifierCommande(c: Commande, controlerTva = true, seuilUeDepasse = false): Anomalie[] {
  const anomalie = (message: string, detail: string | null = null) => ({ message, detail, lien: c.lien })
  const anomalies: Anomalie[] = []
  if (!c.payee) anomalies.push(anomalie(`${c.nom} n'est pas payée`))
  if (!c.pays) return c.ttc === 0 ? anomalies : [...anomalies, anomalie(`${c.nom} n'a ni adresse de livraison ni de facturation`)]

  const zone = zoneDe(c.pays)
  if (zone === 'ue') {
    if (seuilUeDepasse) anomalies.push(anomalie(`${c.nom} part en ${c.pays}`, 'Seuil de 10 000 € dépassé : la TVA du pays du client s’applique (OSS).'))
  } else if (zone === 'hors_ue') {
    if (c.tva > 0) anomalies.push(anomalie(`${c.nom} part en ${c.pays}`, `Shopify a compté ${euros(c.tva)} de TVA sur un export.`))
  } else if (controlerTva && Math.abs(c.tva - tvaDe(c.ttc)) > c.articles) {
    anomalies.push(anomalie(`${c.nom} : TVA de ${euros(c.tva)} au lieu de ${euros(tvaDe(c.ttc))}`,
      'Un produit a sans doute « Facturer la taxe » décoché dans Shopify.'))
  }
  return anomalies
}

/** La journée telle qu'elle s'écrit en base. */
export function journee(jour: string, ventes: Ventes, facturees: ReadonlySet<string> = new Set(), seuilUeDepasse = false) {
  // Une vente facturée à un pro relève de la facture électronique : ni total B2C, ni anomalie.
  const commandes = (ventes.shopify ?? []).filter((c) => !facturees.has(cleVente('shopify', c.nom)))
  const paiements = (ventes.sumup ?? []).filter((p) => !facturees.has(cleVente('sumup', p.code)))
  const anomalies = commandes.flatMap((c) => verifierCommande(c, jour >= TVA_SHOPIFY_FIABLE_DEPUIS, seuilUeDepasse))

  // TVA calculée sur le total du jour (conception) : c'est ce qui part à SuperPDP.
  const enFrance = [
    ...commandes.filter((c) => c.pays && zoneDe(c.pays) !== 'hors_ue').map((c) => c.ttc),
    ...paiements.filter((p) => !p.pays).map((p) => p.ttc),
  ]
  const ttc = enFrance.reduce((a, b) => a + b, 0)
  const tva = tvaDe(ttc)
  const exports = commandes.filter((c) => c.pays && zoneDe(c.pays) === 'hors_ue').reduce((a, c) => a + c.ttc, 0)
  // Un stand à l'étranger relève de la TVA du pays : on n'en déclare que le HT, à 0 % (DGFiP 3.2).
  const stands = paiements.filter((p) => p.pays).reduce((a, p) => a + Math.round(p.ttc / (1 + TAUX_STAND[p.pays!] / 100)), 0)
  for (const pays of new Set(paiements.flatMap((p) => p.pays ?? []))) {
    anomalies.push({ message: `Stand en ${NOM_PAYS_STAND[pays]}`, detail: 'Ces ventes SumUp sortent de la TVA française : confirme le lieu.', lien: null })
  }
  const lignes = [
    ...(ttc === 0 ? [] : [ligneSuperPdp(jour, 'TLB1', '20.00', ttc - tva, tva)]),
    ...(exports + stands === 0 ? [] : [ligneSuperPdp(jour, 'TNT1', '0.00', exports + stands, 0)]),
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
