// reporting-shopify : parler à Shopify (jeton, GraphQL) et ranger une date au jour de Paris.
// Partagé par la lecture quotidienne des ventes et par le récap du mois (les versements).

const JOUR_PARIS = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' })
export const jourDe = (iso: string) => JOUR_PARIS.format(new Date(iso))

// L'appli Shopify n'a pas de jeton fixe : on en demande un avec son identifiant et son secret.
export async function jetonShopify(domaine: string, clientId: string, secret: string): Promise<string> {
  const reponse = await fetch(`https://${domaine}/admin/oauth/access_token`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: secret }),
  })
  if (!reponse.ok) throw new Error(`Shopify jeton ${reponse.status}`)
  return (await reponse.json()).access_token
}

export async function graphql(domaine: string, jeton: string, query: string, variables: Record<string, unknown>) {
  const reponse = await fetch(`https://${domaine}/admin/api/2026-10/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': jeton, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const corps = await reponse.json()
  if (!reponse.ok || corps.errors) throw new Error(`Shopify ${reponse.status} ${JSON.stringify(corps.errors ?? '')}`)
  return corps.data
}
