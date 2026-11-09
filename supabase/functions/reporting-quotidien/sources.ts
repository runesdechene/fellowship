// sources : lire, sans rien modifier, les ventes d'une période chez Shopify et SumUp, rangées par
// jour de Paris. Montants en centimes. Une erreur remonte : la source sera notée muette.
import { type Commande, type Paiement, paysEffectif, SEUIL_UE, tvaDe, zoneDe } from '../_shared/reporting-ventes.ts'

const JOUR_PARIS = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' })
export const jourDe = (iso: string) => JOUR_PARIS.format(new Date(iso))
const centimes = (montant: string | number) => Math.round(Number(montant) * 100)

type ParJour<T> = Map<string, T[]>

function ranger<T>(parJour: ParJour<T>, jour: string, vente: T) {
  parJour.set(jour, [...(parJour.get(jour) ?? []), vente])
}

/** Les commandes Shopify, au jour de la commande ou de la première expédition. */
export async function lireShopify(
  domaine: string, clientId: string, secret: string, du: string, au: string, selon: 'commande' | 'expedition',
): Promise<ParJour<Commande>> {
  const jeton = await jetonShopify(domaine, clientId, secret)
  // Filtre sur la mise à jour : une vieille commande remboursée ou expédiée sur la période y entre.
  const depuis = new Date(`${du}T00:00:00Z`)
  depuis.setUTCDate(depuis.getUTCDate() - 1)
  const boutique = domaine.replace('.myshopify.com', '')
  const parJour: ParJour<Commande> = new Map()
  let apres: string | null = null

  do {
    const reponse = await graphql(domaine, jeton, REQUETE, {
      apres, filtre: `updated_at:>=${depuis.toISOString().slice(0, 10)}`,
    })
    for (const o of reponse.orders.nodes) {
      if (o.test || (o.cancelledAt && o.refunds.length === 0)) continue
      const commune = {
        lien: `https://admin.shopify.com/store/${boutique}/orders/${o.legacyResourceId}`,
        // Rien à expédier (une prise en charge de retour) : le pays de facturation.
        pays: paysEffectif(o.shippingAddress?.countryCodeV2 ?? o.billingAddress?.countryCodeV2 ?? null, (o.shippingAddress ?? o.billingAddress)?.zip),
        articles: o.lineItems.nodes.length + 1, // + la livraison
      }
      const date = selon === 'expedition' ? o.fulfillments[0]?.createdAt : o.createdAt
      if (date && jourDe(date) >= du && jourDe(date) <= au) { // pas de date : pas encore expédiée
        ranger(parJour, jourDe(date), {
          ...commune,
          nom: o.name,
          ttc: centimes(o.totalPriceSet.shopMoney.amount),
          tva: centimes(o.totalTaxSet.shopMoney.amount),
          payee: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(o.displayFinancialStatus),
        })
      }
      o.refunds.forEach((r: RemboursementShopify, i: number) => {
        const ttc = -centimes(r.totalRefundedSet.shopMoney.amount)
        const jour = jourDe(r.createdAt)
        if (ttc === 0 || jour < du || jour > au) return // 0 € : une remise en stock
        ranger(parJour, jour, { ...commune, nom: `${o.name} remboursement ${i + 1}`, ttc, tva: tvaDe(ttc), payee: true })
      })
    }
    apres = reponse.orders.pageInfo.hasNextPage ? reponse.orders.pageInfo.endCursor : null
  } while (apres)
  return parJour
}

/** Le seuil UE est-il franchi ? Ventes Shopify livrées dans l'UE, en HT, cette année ou la précédente. */
export async function seuilUeDepasse(domaine: string, clientId: string, secret: string): Promise<boolean> {
  const jeton = await jetonShopify(domaine, clientId, secret)
  const annee = new Date().getUTCFullYear()
  const parAnnee: Record<string, number> = {}
  let apres: string | null = null
  do {
    const reponse = await graphql(domaine, jeton, REQUETE_SEUIL, { apres, filtre: `created_at:>=${annee - 1}-01-01` })
    for (const o of reponse.orders.nodes) {
      const pays = o.shippingAddress?.countryCodeV2
      if (o.test || o.cancelledAt || !pays || zoneDe(pays) !== 'ue') continue
      const an = o.createdAt.slice(0, 4)
      parAnnee[an] = (parAnnee[an] ?? 0) + Math.round(centimes(o.currentTotalPriceSet.shopMoney.amount) / 1.2)
    }
    apres = reponse.orders.pageInfo.hasNextPage ? reponse.orders.pageInfo.endCursor : null
  } while (apres)
  return Object.values(parAnnee).some((total) => total > SEUIL_UE)
}

/** Les paiements SumUp réussis : des ventes au comptoir, donc en France. */
export async function lireSumup(cle: string, du: string, au: string): Promise<ParJour<Paiement>> {
  const parJour: ParJour<Paiement> = new Map()
  // Un jour de marge de chaque côté : le tri par jour de Paris se fait ici.
  const avant = new Date(`${du}T00:00:00Z`)
  avant.setUTCDate(avant.getUTCDate() - 1)
  const fin = new Date(`${au}T00:00:00Z`)
  fin.setUTCDate(fin.getUTCDate() + 2)
  let url: string | null = `https://api.sumup.com/v0.1/me/transactions/history?limit=100&order=ascending` +
    `&oldest_time=${avant.toISOString()}&newest_time=${fin.toISOString()}`

  while (url) {
    const reponse: Response = await fetch(url, { headers: { Authorization: `Bearer ${cle}` } })
    if (!reponse.ok) throw new Error(`SumUp ${reponse.status}`)
    const page: PageSumup = await reponse.json()
    for (const t of page.items) {
      const paye = t.type === 'PAYMENT' && t.status === 'SUCCESSFUL'
      if (!paye && !(t.type === 'REFUND' && t.status === 'REFUNDED')) continue
      const jour = jourDe(t.timestamp)
      if (jour < du || jour > au) continue
      // shortcut : deux remboursements partiels d'un même paiement portent le même nom ; à distinguer s'ils arrivent.
      ranger(parJour, jour, paye
        ? { code: t.transaction_code, ttc: centimes(t.amount) }
        : { code: `${t.transaction_code} remboursement`, ttc: -centimes(t.amount) })
    }
    const suite = page.links?.find((l) => l.rel === 'next')
    url = suite ? `https://api.sumup.com/v0.1/me/transactions/history?${suite.href}` : null
  }
  return parJour
}

const REQUETE = `query ($apres: String, $filtre: String) {
  orders(first: 100, after: $apres, query: $filtre, sortKey: UPDATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      name legacyResourceId createdAt test cancelledAt displayFinancialStatus
      totalPriceSet { shopMoney { amount } }
      totalTaxSet { shopMoney { amount } }
      refunds(first: 20) { createdAt totalRefundedSet { shopMoney { amount } } }
      shippingAddress { countryCodeV2 zip }
      billingAddress { countryCodeV2 zip }
      fulfillments(first: 1) { createdAt }
      lineItems(first: 100) { nodes { id } }
    }
  }
}`

const REQUETE_SEUIL = `query ($apres: String, $filtre: String) {
  orders(first: 250, after: $apres, query: $filtre, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes { createdAt test cancelledAt currentTotalPriceSet { shopMoney { amount } } shippingAddress { countryCodeV2 } }
  }
}`

// L'appli Shopify n'a pas de jeton fixe : on en demande un avec son identifiant et son secret.
async function jetonShopify(domaine: string, clientId: string, secret: string): Promise<string> {
  const reponse = await fetch(`https://${domaine}/admin/oauth/access_token`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: secret }),
  })
  if (!reponse.ok) throw new Error(`Shopify jeton ${reponse.status}`)
  return (await reponse.json()).access_token
}

async function graphql(domaine: string, jeton: string, query: string, variables: Record<string, unknown>) {
  const reponse = await fetch(`https://${domaine}/admin/api/2026-10/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': jeton, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const corps = await reponse.json()
  if (!reponse.ok || corps.errors) throw new Error(`Shopify ${reponse.status} ${JSON.stringify(corps.errors ?? '')}`)
  return corps.data
}

interface RemboursementShopify { createdAt: string; totalRefundedSet: { shopMoney: { amount: string } } }

interface PageSumup {
  items: { status: string; type: string; timestamp: string; transaction_code: string; amount: number }[]
  links?: { rel: string; href: string }[]
}
