// envoi : pousser à SuperPDP les journées prêtes d'une enseigne. Un envoi ne se rejoue jamais : la
// journée passe en_cours avant l'appel, et n'en sort que par la réponse de SuperPDP.
// ATTENTION — bac à sable seulement jusqu'à la finalisation (Uriel, 09/11/2026). Pour la production :
// retirer la garde, et vérifier que companies/me.number est le SIREN de l'enseigne.

import { statutApresEnvoi } from '../_shared/reporting-ventes.ts'
import { obtenirJeton, SUPERPDP } from '../_shared/reporting-superpdp.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

export interface Entreprise {
  entity_actor_id: string
  environnement: string
  date_de_vente: 'commande' | 'expedition'
  regime_tva: string
  alerte_email: string | null
  rappel_echeance: boolean
  envoi_a_partir_du: string | null
  recap_comptable: boolean
  recap_comptable_email: string | null
  derniere_alerte: string | null
}

/** Envoie les journées prêtes jusqu'à `limite`, par date croissante. */
export async function envoyerPretes(e: Entreprise, limite: string) {
  if (e.environnement !== 'sandbox') throw new Error('envoi réservé au bac à sable')
  const bilan = { envoyees: 0, refusees: 0, inconnues: 0 }
  if (!e.envoi_a_partir_du) return bilan // sans date de départ, rien ne part

  const admin = getSupabaseAdmin()
  // Une journée restée en_cours vient d'un passage interrompu : personne ne sait si elle est partie.
  await admin.from('reporting_journees').update({ statut: 'inconnue', updated_at: new Date().toISOString() })
    .eq('entity_actor_id', e.entity_actor_id).eq('statut', 'en_cours')

  const { data: pretes, error } = await admin.from('reporting_journees').select('id, lignes')
    .eq('entity_actor_id', e.entity_actor_id).eq('environnement', e.environnement).eq('statut', 'prete')
    .gte('jour', e.envoi_a_partir_du).lte('jour', limite).order('jour')
  if (error) throw error
  if (pretes.length === 0) return bilan

  const jeton = await obtenirJeton(e.entity_actor_id, e.environnement)
  await verifierCompte(jeton, e)

  for (const journee of pretes) {
    // En une seule requête : deux passages simultanés ne peuvent pas envoyer le même jour.
    const { data: prise, error: priseErreur } = await admin.from('reporting_journees')
      .update({ statut: 'en_cours', updated_at: new Date().toISOString() })
      .eq('id', journee.id).eq('statut', 'prete').select('id')
    if (priseErreur) throw priseErreur
    if (prise.length === 0) continue

    const requete = { data: journee.lignes }
    const { http, reponse } = await poster(jeton, requete)
    const statut = statutApresEnvoi(http)
    const { error: journalErreur } = await admin.from('reporting_envois').insert({
      journee_id: journee.id,
      http_status: http,
      superpdp_ids: Array.isArray(reponse?.data) ? reponse.data.map((l: { id: number }) => l.id) : null,
      requete,
      reponse,
    })
    if (journalErreur) throw journalErreur // la journée reste en_cours : elle ne repartira pas
    await admin.from('reporting_journees').update({ statut, updated_at: new Date().toISOString() }).eq('id', journee.id)

    if (statut === 'envoyee') bilan.envoyees++
    if (statut === 'refusee') bilan.refusees++
    if (statut === 'inconnue') {
      bilan.inconnues++
      break // SuperPDP ne répond plus : inutile de bloquer les jours suivants
    }
  }
  return bilan
}

async function poster(jeton: string, requete: unknown) {
  try {
    const reponse = await fetch(`${SUPERPDP}/v1.beta/b2c_transactions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requete),
    })
    const texte = await reponse.text()
    let corps
    try {
      corps = JSON.parse(texte)
    } catch {
      corps = { texte }
    }
    return { http: reponse.status, reponse: corps }
  } catch (err) {
    return { http: null, reponse: { erreur: String(err) } }
  }
}

// Bac à sable et production partagent la même adresse : seul ce champ les distingue.
async function verifierCompte(jeton: string, e: Entreprise) {
  const headers = { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' }
  const reponse = await fetch(`${SUPERPDP}/v1.beta/companies/me`, { headers })
  if (!reponse.ok) throw new Error(`SuperPDP compte ${reponse.status}`)
  const societe = await reponse.json()
  if (societe.env !== e.environnement) throw new Error(`compte SuperPDP en ${societe.env}, attendu ${e.environnement}`)
  if (societe.vat_regime === e.regime_tva) return
  const alignement = await fetch(`${SUPERPDP}/v1.beta/companies`, {
    method: 'PATCH', headers, body: JSON.stringify({ vat_regime: e.regime_tva }),
  })
  if (!alignement.ok) throw new Error(`SuperPDP régime ${alignement.status}`)
}
