// sources : lire, sans rien modifier, les ventes d'une période chez Shopify et SumUp, rangées par
// jour de Paris. Montants en centimes. Une erreur remonte : la source sera notée muette.
import type { Commande, Paiement } from '../_shared/reporting-ventes.ts'

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
  // shortcut : en mode expédition, une commande passée plus de 60 jours avant son envoi est manquée.
  const depuis = new Date(`${du}T00:00:00Z`)
  depuis.setUTCDate(depuis.getUTCDate() - (selon === 'expedition' ? 60 : 1))
  const boutique = domaine.replace('.myshopify.com', '')
  const parJour: ParJour<Commande> = new Map()
  let apres: string | null = null

  do {
    const reponse = await graphql(domaine, jeton, REQUETE, {
      apres, filtre: `created_at:>=${depuis.toISOString().slice(0, 10)}`,
    })
    for (const o of reponse.orders.nodes) {
      if (o.test || o.cancelledAt) continue
      const date = selon === 'expedition' ? o.fulfillments[0]?.createdAt : o.createdAt
      if (!date) continue // pas encore expédiée
      const jour = jourDe(date)
      if (jour < du || jour > au) continue
      ranger(parJour, jour, {
        nom: o.name,
        lien: `https://admin.shopify.com/store/${boutique}/orders/${o.legacyResourceId}`,
        pays: o.shippingAddress?.countryCodeV2 ?? null,
        ttc: centimes(o.currentTotalPriceSet.shopMoney.amount),
        tva: centimes(o.currentTotalTaxSet.shopMoney.amount),
        articles: o.lineItems.nodes.length + 1, // + la livraison
        rembourse: centimes(o.totalRefundedSet.shopMoney.amount),
        payee: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(o.displayFinancialStatus),
      })
    }
    apres = reponse.orders.pageInfo.hasNextPage ? reponse.orders.pageInfo.endCursor : null
  } while (apres)
  return parJour
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
      if (t.status !== 'SUCCESSFUL' || t.type !== 'PAYMENT') continue
      const jour = jourDe(t.timestamp)
      if (jour < du || jour > au) continue
      ranger(parJour, jour, { code: t.transaction_code, ttc: centimes(t.amount), rembourse: centimes(t.refunded_amount ?? 0) })
    }
    const suite = page.links?.find((l) => l.rel === 'next')
    url = suite ? `https://api.sumup.com/v0.1/me/transactions/history?${suite.href}` : null
  }
  return parJour
}

const REQUETE = `query ($apres: String, $filtre: String) {
  orders(first: 100, after: $apres, query: $filtre, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      name legacyResourceId createdAt test cancelledAt displayFinancialStatus
      currentTotalPriceSet { shopMoney { amount } }
      currentTotalTaxSet { shopMoney { amount } }
      totalRefundedSet { shopMoney { amount } }
      shippingAddress { countryCodeV2 }
      fulfillments(first: 1) { createdAt }
      lineItems(first: 100) { nodes { id } }
    }
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

interface PageSumup {
  items: { status: string; type: string; timestamp: string; transaction_code: string; amount: number; refunded_amount?: number }[]
  links?: { rel: string; href: string }[]
}
