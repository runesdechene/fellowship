// reporting-quotidien : chaque matin, lire les ventes de chaque enseigne activée (Shopify, SumUp),
// écrire ses journées vérifiées, envoyer à SuperPDP celles qui sont prêtes (envoi.ts), puis prévenir
// par un e-mail s'il y a quelque chose à voir (alerte.ts).
// Auth : verify_jwt = false (config.toml) ; l'en-tête X-Reporting-Secret remplace le JWT, il est
// envoyé par le cron. Corps facultatif { du, au } (AAAA-MM-JJ) : relit la période, sans rien envoyer.
// { aujourdhui } (AAAA-MM-JJ) fait comme si l'on était ce jour-là pour le récap du mois (recap.ts) : pour l'essayer.
// Une journée déjà validée, en cours d'envoi ou envoyée ne se réécrit jamais.
// Secrets dans Vault, nommés reporting:<enseigne>:sources:<nom> — ils ne dépendent pas de l'environnement.
// Conception : « E-Repporting Imperial/conception.md ».

import { lireFacturees } from '../_shared/reporting-facturees.ts'
import { journee, REECRIVABLES, type Ventes } from '../_shared/reporting-ventes.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { lireSecret } from '../_shared/reporting-superpdp.ts'
import { alerter } from './alerte.ts'
import { envoyerRecap } from './recap.ts'
import { type Entreprise, envoyerPretes } from './envoi.ts'
import { jourDe } from '../_shared/reporting-shopify.ts'
import { lireShopify, lireSumup, seuilUeDepasse } from './sources.ts'

const SECRET = Deno.env.get('REPORTING_TRIGGER_SECRET') ?? ''
const JOUR = /^\d{4}-\d{2}-\d{2}$/
const UN_JOUR = 86_400_000
// Laisse aux ventes SumUp hors ligne le temps d'arriver. Provisoire : la décade se dépose jusqu'à J+10.
const DELAI_ENVOI = 3
const PREMIERE_LECTURE = 45 // jours relus quand rien n'est encore parti

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!SECRET || req.headers.get('x-reporting-secret') !== SECRET) return json({ error: 'unauthorized' }, 401)

  const corps = (await req.json().catch(() => ({}))) as { du?: string; au?: string; aujourdhui?: string }
  if (corps.aujourdhui !== undefined && !JOUR.test(corps.aujourdhui)) return json({ error: 'invalid_date' }, 400)
  const hier = ilYa(1)
  const au = corps.au ?? hier
  const relecture = corps.du !== undefined
  // Un jour qui n'est pas fini n'a pas toutes ses ventes.
  if (relecture && (!JOUR.test(corps.du!) || !JOUR.test(au) || corps.du! > au || au > hier)) {
    return json({ error: 'invalid_range' }, 400)
  }

  const admin = getSupabaseAdmin()
  const { data: entreprises, error } = await admin.from('reporting_entreprises')
    .select('entity_actor_id, environnement, date_de_vente, regime_tva, envoi_a_partir_du, alerte_email, rappel_echeance, recap_comptable, recap_comptable_email')
    .eq('actif', true)
  if (error) return json({ error: 'failed' }, 500)

  const bilan = []
  for (const e of entreprises) {
    try {
      const du = corps.du ?? await premierJourALire(e)
      const lecture = du <= au ? await lireEntreprise(e, du, au) : null
      const envoi = relecture ? null : await envoyerPretes(e, ilYa(DELAI_ENVOI))
      const alerte = relecture ? false : await alerter(e, lecture?.muettes ?? [])
      const recap = relecture ? false : await envoyerRecap(e, corps.aujourdhui ?? ilYa(0))
      bilan.push({ entreprise: e.entity_actor_id, du, au, lecture, envoi, alerte, recap })
    } catch (err) {
      console.error('[reporting-quotidien]', e.entity_actor_id, err)
      bilan.push({ entreprise: e.entity_actor_id, erreur: String(err) })
    }
  }
  return json({ bilan })
})

function ilYa(jours: number): string {
  return jourDe(new Date(Date.now() - jours * UN_JOUR).toISOString())
}

/** Le lendemain du dernier jour parti : un passage manqué se rattrape seul. */
async function premierJourALire(e: Entreprise): Promise<string> {
  const { data, error } = await getSupabaseAdmin().from('reporting_journees').select('jour')
    .eq('entity_actor_id', e.entity_actor_id).eq('environnement', e.environnement).eq('statut', 'envoyee')
    .order('jour', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  if (!data) return ilYa(PREMIERE_LECTURE)
  return new Date(Date.parse(`${data.jour}T12:00:00Z`) + UN_JOUR).toISOString().slice(0, 10)
}

async function lireEntreprise(e: Entreprise, du: string, au: string) {
  const admin = getSupabaseAdmin()
  const { data: sources, error } = await admin.from('reporting_sources')
    .select('id, type, identifiant').eq('entity_actor_id', e.entity_actor_id).eq('actif', true)
  if (error) throw error
  const secret = (nom: string) => lireSecret(e.entity_actor_id, 'sources', nom)

  // Chaque source lue une fois pour toute la période ; une source en erreur est muette tous les jours.
  const lues: Record<string, Map<string, unknown[]> | null> = {}
  let seuilUe = false
  for (const s of sources) {
    try {
      if (s.type === 'shopify') {
        const [id, cle] = [await secret('shopify_client_id'), await secret('shopify_client_secret')]
        lues[s.type] = await lireShopify(s.identifiant, id, cle, du, au, e.date_de_vente)
        seuilUe = await seuilUeDepasse(s.identifiant, id, cle)
      } else {
        lues[s.type] = await lireSumup(await secret('sumup_api_key'), du, au)
      }
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
      ...journee(jour, ventes as Ventes, facturees, seuilUe),
      updated_at: new Date().toISOString(),
    }
  })
  const { error: ecritureErreur } = await admin.from('reporting_journees')
    .upsert(lignes, { onConflict: 'entity_actor_id,environnement,jour' })
  if (ecritureErreur) throw ecritureErreur
  return { seuilUe, ecrites: lignes.length, figees: figees.size, muettes: Object.keys(lues).filter((t) => !lues[t]) }
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
