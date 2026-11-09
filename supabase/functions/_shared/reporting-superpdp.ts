// reporting-superpdp : les identifiants d'une enseigne, le jeton, et ses déclarations chez SuperPDP.
import { type Declaration, statutDeclaration } from './reporting-ventes.ts'
import { getSupabaseAdmin } from './supabase-admin.ts'

export const SUPERPDP = 'https://api.superpdp.tech'

export async function lireSecret(entite: string, espace: string, nom: string): Promise<string> {
  const { data } = await getSupabaseAdmin().rpc('reporting_secret', { p_entity: entite, p_environnement: espace, p_nom: nom })
  if (!data) throw new Error(`secret ${nom} absent de Vault`)
  return data as string
}

export async function obtenirJeton(entite: string, environnement: string): Promise<string> {
  const reponse = await fetch(`${SUPERPDP}/oauth2/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: await lireSecret(entite, environnement, 'superpdp_client_id'),
      client_secret: await lireSecret(entite, environnement, 'superpdp_client_secret'),
    }),
  })
  if (!reponse.ok) throw new Error(`SuperPDP jeton ${reponse.status}`)
  return (await reponse.json()).access_token
}

/** Les déclarations parties à l'administration, et le dernier état de chacune. */
// shortcut : la première page de la liste seulement ; à paginer quand has_more arrivera (format inconnu).
export async function lireDeclarations(jeton: string): Promise<Declaration[]> {
  const reponse = await fetch(`${SUPERPDP}/v1.beta/ereportings`, { headers: { Authorization: `Bearer ${jeton}` } })
  if (!reponse.ok) throw new Error(`SuperPDP déclarations ${reponse.status}`)
  const { data } = await reponse.json()
  return data.map(statutDeclaration)
}
