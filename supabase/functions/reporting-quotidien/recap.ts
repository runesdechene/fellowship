// recap : le 11 de chaque mois, le récap du mois précédent pour l'expert-comptable. La dernière décade
// se dépose au plus tard le 10 : le mois est alors parti. Une panne d'e-mail n'arrête rien.
// Dans le bac à sable, le récap part à l'adresse d'alerte (ou du compte), jamais à l'expert-comptable.
import { messageRecap } from '../_shared/reporting-ventes.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { adresseAlerte } from './alerte.ts'
import type { Entreprise } from './envoi.ts'

const JOUR_DU_RECAP = '11'

// shortcut : un passage manqué le 11 saute le récap du mois ; à suivre en base si ça arrive.
export async function envoyerRecap(e: Entreprise, aujourdhui: string) {
  if (!e.recap_comptable || aujourdhui.slice(8) !== JOUR_DU_RECAP) return false
  try {
    const destinataire = e.environnement === 'production' ? e.recap_comptable_email : await adresseAlerte(e)
    if (!destinataire) return false
    const debut = new Date(`${aujourdhui.slice(0, 7)}-01T12:00:00Z`)
    debut.setUTCMonth(debut.getUTCMonth() - 1)
    const mois = debut.toISOString().slice(0, 7)
    const { data: jours, error } = await getSupabaseAdmin().from('reporting_journees').select('jour, statut, lignes, detail')
      .eq('entity_actor_id', e.entity_actor_id).eq('environnement', e.environnement)
      .gte('jour', `${mois}-01`).lt('jour', `${aujourdhui.slice(0, 7)}-01`).order('jour')
    if (error) throw error

    const message = messageRecap(mois, jours)
    const sujet = e.environnement === 'production' ? message.sujet : `[bac à sable] ${message.sujet}`
    const reponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: '"Fellowship" <notifications@equipe.flw.sh>', to: [destinataire], subject: sujet, text: message.texte }),
    })
    if (!reponse.ok) throw new Error(`Resend ${reponse.status}`)
    return true
  } catch (err) {
    console.error('[reporting-quotidien] récap', e.entity_actor_id, err)
    return false
  }
}
