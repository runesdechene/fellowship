// reporting-lecture : lire les ventes de chaque enseigne activée (Shopify, SumUp) et écrire ses
// journées de reporting, vérifiées. N'envoie rien à SuperPDP : l'envoi viendra à part.
// Auth : verify_jwt = false (config.toml) ; l'en-tête X-Reporting-Secret remplace le JWT, il sera
// envoyé par le cron. Corps facultatif { du, au } (AAAA-MM-JJ) ; sinon les sept derniers jours.
// Une journée déjà validée, en cours d'envoi ou envoyée ne se réécrit jamais.
// Secrets dans Vault, nommés reporting:<enseigne>:sources:<nom> — ils ne dépendent pas de l'environnement.
// Conception : « E-Repporting Imperial/conception.md ».

import { lireFacturees } from '../_shared/reporting-facturees.ts'
import { journee, REECRIVABLES, type Ventes } from '../_shared/reporting-ventes.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { jourDe, lireShopify, lireSumup } from './sources.ts'

const SECRET = Deno.env.get('REPORTING_TRIGGER_SECRET') ?? ''
const JOUR = /^\d{4}-\d{2}-\d{2}$/

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!SECRET || req.headers.get('x-reporting-secret') !== SECRET) return json({ error: 'unauthorized' }, 401)

  const corps = (await req.json().catch(() => ({}))) as { du?: string; au?: string }
  const hier = jourDe(new Date(Date.now() - 86_400_000).toISOString())
  const au = corps.au ?? hier
  const du = corps.du ?? jourDe(new Date(Date.now() - 7 * 86_400_000).toISOString())
  // Un jour qui n'est pas fini n'a pas toutes ses ventes.
  if (!JOUR.test(du) || !JOUR.test(au) || du > au || au > hier) return json({ error: 'invalid_range' }, 400)

  const admin = getSupabaseAdmin()
  const { data: entreprises, error } = await admin.from('reporting_entreprises')
    .select('entity_actor_id, environnement, date_de_vente').eq('actif', true)
  if (error) return json({ error: 'failed' }, 500)

  const bilan = []
  for (const e of entreprises) {
    try {
      bilan.push({ entreprise: e.entity_actor_id, ...(await lireEntreprise(e, du, au)) })
    } catch (err) {
      console.error('[reporting-lecture]', e.entity_actor_id, err)
      bilan.push({ entreprise: e.entity_actor_id, erreur: String(err) })
    }
  }
  return json({ du, au, bilan })
})

interface Entreprise { entity_actor_id: string; environnement: string; date_de_vente: 'commande' | 'expedition' }

async function lireEntreprise(e: Entreprise, du: string, au: string) {
  const admin = getSupabaseAdmin()
  const { data: sources, error } = await admin.from('reporting_sources')
    .select('id, type, identifiant').eq('entity_actor_id', e.entity_actor_id).eq('actif', true)
  if (error) throw error
  const secret = async (nom: string) => {
    const { data } = await admin.rpc('reporting_secret', { p_entity: e.entity_actor_id, p_environnement: 'sources', p_nom: nom })
    if (!data) throw new Error(`secret ${nom} absent de Vault`)
    return data as string
  }

  // Chaque source lue une fois pour toute la période ; une source en erreur est muette tous les jours.
  const lues: Record<string, Map<string, unknown[]> | null> = {}
  for (const s of sources) {
    try {
      lues[s.type] = s.type === 'shopify'
        ? await lireShopify(s.identifiant, await secret('shopify_client_id'), await secret('shopify_client_secret'), du, au, e.date_de_vente)
        : await lireSumup(await secret('sumup_api_key'), du, au)
      await admin.from('reporting_sources').update({ derniere_lecture: new Date().toISOString(), derniere_erreur: null }).eq('id', s.id)
    } catch (err) {
      lues[s.type] = null
      await admin.from('reporting_sources').update({ derniere_erreur: String(err) }).eq('id', s.id)
    }
  }

  const { data: existantes, error: lectureErreur } = await admin.from('reporting_journees')
    .select('jour, statut, validee_le').eq('entity_actor_id', e.entity_actor_id)
    .eq('environnement', e.environnement).gte('jour', du).lte('jour', au)
  if (lectureErreur) throw lectureErreur
  const figees = new Set(existantes
    .filter((j) => !REECRIVABLES.includes(j.statut) || j.validee_le)
    .map((j) => j.jour))

  const facturees = await lireFacturees(e.entity_actor_id)
  const lignes = joursEntre(du, au).filter((jour) => !figees.has(jour)).map((jour) => {
    const ventes = Object.fromEntries(Object.entries(lues).map(([type, parJour]) => [type, parJour ? parJour.get(jour) ?? [] : null]))
    return {
      entity_actor_id: e.entity_actor_id,
      environnement: e.environnement,
      ...journee(jour, ventes as Ventes, facturees),
      updated_at: new Date().toISOString(),
    }
  })
  const { error: ecritureErreur } = await admin.from('reporting_journees')
    .upsert(lignes, { onConflict: 'entity_actor_id,environnement,jour' })
  if (ecritureErreur) throw ecritureErreur
  return { ecrites: lignes.length, figees: figees.size, muettes: Object.keys(lues).filter((t) => !lues[t]) }
}

function joursEntre(du: string, au: string): string[] {
  const jours = []
  for (const d = new Date(`${du}T12:00:00Z`); d.toISOString().slice(0, 10) <= au; d.setUTCDate(d.getUTCDate() + 1)) {
    jours.push(d.toISOString().slice(0, 10))
  }
  return jours
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
