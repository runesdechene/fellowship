// reporting-recap : le récap d'un mois pour l'expert-comptable, tel qu'il part — l'objet, le texte et
// les deux pièces jointes (versements Shopify et SumUp). Une seule fabrique pour l'envoi du 11
// (reporting-quotidien/recap.ts) et pour l'aperçu de la page Récap (reporting-recap) : ce qu'on voit
// est ce qui part.
import { lireSecret } from './reporting-superpdp.ts'
import { graphql, jetonShopify, jourDe } from './reporting-shopify.ts'
import { csvVersementsShopify, csvVersementsSumup, type LigneSumup, type VersementShopify } from './reporting-versements.ts'
import { messageRecap, nomDuMois } from './reporting-ventes.ts'
import { getSupabaseAdmin } from './supabase-admin.ts'

export interface PieceJointe { nom: string; csv: string }

interface Destinataires { entity_actor_id: string; environnement: string; alerte_email: string | null; recap_comptable_email: string | null }

/** L'adresse d'alerte, ou à défaut celle du propriétaire de l'enseigne (le plus ancien s'ils sont plusieurs). */
export async function adresseAlerte(e: Omit<Destinataires, 'environnement' | 'recap_comptable_email'>): Promise<string | null> {
  if (e.alerte_email) return e.alerte_email
  const admin = getSupabaseAdmin()
  const { data: proprietaire, error } = await admin.from('memberships').select('user_actor_id')
    .eq('entity_actor_id', e.entity_actor_id).eq('role', 'owner').order('created_at').limit(1).maybeSingle()
  if (error) throw error
  if (!proprietaire) return null
  const { data: compte, error: compteErreur } = await admin.from('users').select('email')
    .eq('actor_id', proprietaire.user_actor_id).maybeSingle()
  if (compteErreur) throw compteErreur
  return compte?.email ?? null
}

/** À qui part le récap : l'expert-comptable en production, l'adresse d'alerte au bac à sable. */
export function destinataireRecap(e: Destinataires): Promise<string | null> {
  return e.environnement === 'production' ? Promise.resolve(e.recap_comptable_email) : adresseAlerte(e)
}

/** Le jour où part le récap d'un mois : le 11 du mois suivant. */
export function envoiDuRecap(mois: string): string {
  return `${moisSuivant(mois)}-11`
}

export async function preparerRecap(entite: string, environnement: string, mois: string) {
  const admin = getSupabaseAdmin()
  const suivant = moisSuivant(mois)
  const { data: jours, error } = await admin.from('reporting_journees').select('jour, statut, lignes, detail')
    .eq('entity_actor_id', entite).eq('environnement', environnement)
    .gte('jour', `${mois}-01`).lt('jour', `${suivant}-01`).order('jour')
  if (error) throw error
  const { data: sources, error: sourcesErreur } = await admin.from('reporting_sources')
    .select('type, identifiant').eq('entity_actor_id', entite).eq('actif', true).order('type')
  if (sourcesErreur) throw sourcesErreur
  const { data: note, error: noteErreur } = await admin.from('reporting_recap_notes').select('note')
    .eq('entity_actor_id', entite).eq('mois', `${mois}-01`).maybeSingle()
  if (noteErreur) throw noteErreur

  const secret = (nom: string) => lireSecret(entite, 'sources', nom)
  const fichier = nomDuMois(mois).replace(' ', '-')
  const pieces: PieceJointe[] = []
  for (const s of sources) {
    if (s.type === 'shopify') {
      const versements = await versementsShopify(s.identifiant, await secret('shopify_client_id'), await secret('shopify_client_secret'), mois)
      pieces.push({ nom: `shopify-versements-${fichier}.csv`, csv: csvVersementsShopify(versements) })
    } else {
      pieces.push({ nom: `sumup-versements-${fichier}.csv`, csv: csvVersementsSumup(await versementsSumup(await secret('sumup_api_key'), mois)) })
    }
  }
  return { ...messageRecap(mois, jours, note?.note ?? null), note: note?.note ?? null, pieces }
}

/** « 2026-11 » → « 2026-12 ». */
export function moisSuivant(mois: string): string {
  const d = new Date(`${mois}-01T12:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().slice(0, 7)
}

const REQUETE_VERSEMENTS = `query ($apres: String, $filtre: String) {
  shopifyPaymentsAccount {
    payouts(first: 100, after: $apres, query: $filtre) {
      pageInfo { hasNextPage endCursor }
      nodes {
        issuedAt status externalTraceId net { amount currencyCode }
        summary {
          chargesGross { amount } chargesFee { amount } refundsFeeGross { amount } refundsFee { amount }
          adjustmentsGross { amount } adjustmentsFee { amount } advanceGross { amount } advanceFees { amount }
          reservedFundsGross { amount } reservedFundsFee { amount } retriedPayoutsGross { amount } retriedPayoutsFee { amount }
        }
      }
    }
  }
}`

async function versementsShopify(domaine: string, clientId: string, secret: string, mois: string): Promise<VersementShopify[]> {
  const jeton = await jetonShopify(domaine, clientId, secret)
  const cents = (m: { amount: string }) => Math.round(Number(m.amount) * 100)
  const versements: VersementShopify[] = []
  let apres: string | null = null
  do {
    // Un jour de marge de chaque côté : le tri au jour de Paris se fait ici.
    const reponse = await graphql(domaine, jeton, REQUETE_VERSEMENTS, {
      apres, filtre: `issued_at:>=${veille(`${mois}-01`)} issued_at:<=${moisSuivant(mois)}-01`,
    })
    const page = reponse.shopifyPaymentsAccount?.payouts
    if (!page) break // pas de Shopify Payments : pas de versement
    // Deux versements le même jour : l'heure les ordonne, comme dans l'export (le tri par jour, ensuite, est stable).
    const parHeure = (page.nodes as PayoutShopify[]).toSorted((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    for (const p of parHeure) {
      const date = jourDe(p.issuedAt)
      if (date.slice(0, 7) !== mois) continue
      const s = p.summary
      versements.push({
        date, statut: p.status, devise: p.net.currencyCode, reference: p.externalTraceId,
        encaisse: cents(s.chargesGross), rembourse: cents(s.refundsFeeGross), ajustements: cents(s.adjustmentsGross),
        avances: cents(s.advanceGross), reserve: cents(s.reservedFundsGross), relance: cents(s.retriedPayoutsGross),
        frais: [s.chargesFee, s.refundsFee, s.adjustmentsFee, s.advanceFees, s.reservedFundsFee, s.retriedPayoutsFee].reduce((a, m) => a + cents(m), 0),
        net: cents(p.net),
      })
    }
    apres = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
  } while (apres)
  return versements
}

async function versementsSumup(cle: string, mois: string): Promise<LigneSumup[]> {
  const headers = { Authorization: `Bearer ${cle}` }
  const moi = await fetch('https://api.sumup.com/v0.1/me', { headers })
  if (!moi.ok) throw new Error(`SumUp compte ${moi.status}`)
  const code = (await moi.json()).merchant_profile.merchant_code
  const fin = veille(`${moisSuivant(mois)}-01`)
  const reponse = await fetch(`https://api.sumup.com/v1.0/merchants/${code}/payouts?start_date=${mois}-01&end_date=${fin}&format=json`, { headers })
  if (!reponse.ok) throw new Error(`SumUp versements ${reponse.status}`)
  return (await reponse.json() as LigneSumup[]).map(({ date, reference, amount, fee }) => ({ date, reference: reference ?? '', amount, fee }))
}

function veille(jour: string): string {
  const d = new Date(`${jour}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

type Argent = { amount: string }
interface PayoutShopify {
  issuedAt: string
  status: string
  externalTraceId: string | null
  net: { amount: string; currencyCode: string }
  summary: Record<'chargesGross' | 'chargesFee' | 'refundsFeeGross' | 'refundsFee' | 'adjustmentsGross' | 'adjustmentsFee'
    | 'advanceGross' | 'advanceFees' | 'reservedFundsGross' | 'reservedFundsFee' | 'retriedPayoutsGross' | 'retriedPayoutsFee', Argent>
}
