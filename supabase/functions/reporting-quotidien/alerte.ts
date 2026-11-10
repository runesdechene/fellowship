// alerte : l'unique e-mail du matin, s'il y a quelque chose à voir. Une panne d'e-mail n'arrête rien.
import { lireDeclarations, obtenirJeton } from '../_shared/reporting-superpdp.ts'
import { messageAlerte } from '../_shared/reporting-ventes.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import type { Entreprise } from './envoi.ts'

const REJETS = ['ppf:ereporting-rejected', 'ppf:ereporting-ack-error']

/** L'adresse d'alerte, ou à défaut celle du propriétaire de l'enseigne (le plus ancien s'ils sont plusieurs). */
export async function adresseAlerte(e: Entreprise): Promise<string | null> {
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

export async function alerter(e: Entreprise, muettes: string[]) {
  try {
    const destinataire = await adresseAlerte(e)
    if (!destinataire) return false
    const { data: jours, error } = await getSupabaseAdmin().from('reporting_journees').select('jour, statut')
      .eq('entity_actor_id', e.entity_actor_id).eq('environnement', e.environnement)
      .in('statut', ['a_verifier', 'refusee', 'inconnue', 'en_attente']).order('jour')
    if (error) throw error
    const declarations = await lireDeclarations(await obtenirJeton(e.entity_actor_id, e.environnement))
    const message = messageAlerte(jours, muettes, declarations.filter((d) => REJETS.includes(d.statut ?? '')), e.rappel_echeance)
    if (!message) return false

    const reponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '"Fellowship" <notifications@equipe.flw.sh>', to: [destinataire], subject: message.sujet, text: message.texte,
      }),
    })
    if (!reponse.ok) throw new Error(`Resend ${reponse.status}`)
    return true
  } catch (err) {
    console.error('[reporting-quotidien] alerte', e.entity_actor_id, err)
    return false
  }
}
