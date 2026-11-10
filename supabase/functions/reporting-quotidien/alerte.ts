// alerte : l'unique e-mail du matin, s'il y a quelque chose de neuf à voir (ou une échéance proche).
// Le texte parti est gardé (derniere_alerte) pour ne pas le redire. Une panne d'e-mail n'arrête rien.
import { adresseAlerte } from '../_shared/reporting-recap.ts'
import { jourDe } from '../_shared/reporting-shopify.ts'
import { lireDeclarations, obtenirJeton } from '../_shared/reporting-superpdp.ts'
import { alerteARedire, messageAlerte } from '../_shared/reporting-ventes.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import type { Entreprise } from './envoi.ts'

const REJETS = ['ppf:ereporting-rejected', 'ppf:ereporting-ack-error']

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
    // Plus rien à dire : on oublie le dernier e-mail, pour qu'un nouveau souci reparte aussitôt.
    if (!message) {
      await retenir(e, null)
      return false
    }
    if (!alerteARedire(message.texte, e.derniere_alerte, jours, jourDe(new Date().toISOString()))) return false

    const reponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '"Fellowship" <notifications@equipe.flw.sh>', to: [destinataire], subject: message.sujet, text: message.texte,
      }),
    })
    if (!reponse.ok) throw new Error(`Resend ${reponse.status}`)
    await retenir(e, message.texte)
    return true
  } catch (err) {
    console.error('[reporting-quotidien] alerte', e.entity_actor_id, err)
    return false
  }
}

/** Garde le texte du dernier e-mail parti (null : rien en cours). */
async function retenir(e: Entreprise, texte: string | null) {
  if (e.derniere_alerte === texte) return
  const { error } = await getSupabaseAdmin().from('reporting_entreprises').update({ derniere_alerte: texte })
    .eq('entity_actor_id', e.entity_actor_id)
  if (error) throw error
}
