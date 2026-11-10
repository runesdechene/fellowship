// recap : le 11 de chaque mois, le récap du mois précédent pour l'expert-comptable. La dernière décade
// se dépose au plus tard le 10 : le mois est alors parti. Une panne d'e-mail n'arrête rien.
// Dans le bac à sable, le récap part à l'adresse d'alerte (ou du compte), jamais à l'expert-comptable.
// Le contenu vient de _shared/reporting-recap.ts, comme l'aperçu de la page Récap.
import { encodeBase64 } from 'jsr:@std/encoding@1/base64'
import { destinataireRecap, envoiDuRecap, preparerRecap } from '../_shared/reporting-recap.ts'
import type { Entreprise } from './envoi.ts'

// shortcut : un passage manqué le 11 saute le récap du mois ; à suivre en base si ça arrive.
export async function envoyerRecap(e: Entreprise, aujourdhui: string) {
  const debut = new Date(`${aujourdhui.slice(0, 7)}-01T12:00:00Z`)
  debut.setUTCMonth(debut.getUTCMonth() - 1)
  const mois = debut.toISOString().slice(0, 7)
  if (!e.recap_comptable || envoiDuRecap(mois) !== aujourdhui) return false
  try {
    const destinataire = await destinataireRecap(e)
    if (!destinataire) return false
    const recap = await preparerRecap(e.entity_actor_id, e.environnement, mois)

    const reponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '"Fellowship" <notifications@equipe.flw.sh>',
        to: [destinataire],
        subject: e.environnement === 'production' ? recap.sujet : `[bac à sable] ${recap.sujet}`,
        text: recap.texte,
        attachments: recap.pieces.map((p) => ({ filename: p.nom, content: encodeBase64(new TextEncoder().encode(p.csv)) })),
      }),
    })
    if (!reponse.ok) throw new Error(`Resend ${reponse.status}`)
    return true
  } catch (err) {
    console.error('[reporting-quotidien] récap', e.entity_actor_id, err)
    return false
  }
}
