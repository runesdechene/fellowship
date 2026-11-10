/**
 * QUOI     — scelle toutes les dates d'une enseigne dont les recettes sont encore en clair.
 * POURQUOI — Uriel, 10/11/2026 : verrouillé, Mes bilans montrait en clair les bénéfices des dates
 *            saisies avant la phrase ; seule la date saisie après était masquée. Une phrase protège
 *            désormais toutes les dates de l'enseigne, pas seulement les nouvelles.
 * ATTENTION — il faut la clé : ça ne peut se faire qu'une fois la phrase tapée (RevenueKeyProvider).
 *            Chaque date passe par seal_revenue, une transaction qui retire ses recettes en clair.
 */
import { keyMatches, sealRevenue } from './cipher'
import { clearDatesToSeal } from './report-writes'
import { must, supabase } from './supabase'

/** Rend le nombre de dates scellées ; aucune si la clé n'ouvre plus la phrase en place. */
export async function sealClearDates(actorId: string, key: CryptoKey): Promise<number> {
  const response = await supabase
    .from('revenue_keys')
    .select('check')
    .eq('actor_id', actorId)
    .maybeSingle()
  const record = must(response)
  // Phrase changée ou réinitialisée ailleurs : sceller ici écrirait des chiffrés que plus personne n'ouvre.
  if (!record || !(await keyMatches(key, record))) return 0
  const [lines, reports, secrets] = await Promise.all([
    supabase
      .from('event_ledger_entries')
      .select('event_id, category, amount, direction, source')
      .eq('actor_id', actorId)
      .eq('direction', 'in')
      .eq('source', 'manual'),
    supabase
      .from('event_reports')
      .select('event_id, potential_orders')
      .eq('actor_id', actorId)
      .gt('potential_orders', 0),
    supabase.from('report_secrets').select('event_id').eq('actor_id', actorId),
  ])
  const toSeal = clearDatesToSeal(
    must(lines),
    must(reports),
    must(secrets).map((row) => row.event_id),
  )
  for (const { eventId, revenue } of toSeal) {
    const { error } = await supabase.rpc('seal_revenue', {
      p_actor: actorId,
      p_event: eventId,
      p_payload: await sealRevenue(key, revenue),
      p_check: record.check,
    })
    if (error) throw new Error(error.message)
  }
  return toSeal.length
}
