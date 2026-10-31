/**
 * QUOI     — lit les recettes chiffrées (report_secrets) d'une enseigne pour des dates, et les
 *            pose sur les lignes d'un bilan : `withSecret` rend les lignes complétées et l'état
 *            `secret` de la date ('none', 'masked', 'open').
 * POURQUOI — les quatre chargeurs (bilan, Mes bilans, tableau de bord, fiche) lisent la même
 *            règle : une seule requête, un seul endroit où l'on déchiffre.
 * ATTENTION — sans clé en mémoire, une date chiffrée est 'masked' (jamais « vide »). Une ligne
 *            qui ne s'ouvre pas avec la clé LÈVE : un message corrompu ou d'une autre clé ne se
 *            fait pas passer pour des recettes masquées.
 */
import { openRevenue, type SecretRevenue } from '@/lib/cipher'
import { secretLines, type ReportDate, type ReportLine } from '@/lib/reports'
import { must, supabase } from '@/lib/supabase'

export type SecretMap = Map<string, SecretRevenue | 'masked'>

export async function loadSecrets(
  actorId: string,
  eventIds: string[],
  key: CryptoKey | null,
): Promise<SecretMap> {
  const secrets: SecretMap = new Map()
  if (eventIds.length === 0) return secrets
  const rows = must(
    await supabase
      .from('report_secrets')
      .select('event_id, payload')
      .eq('actor_id', actorId)
      .in('event_id', eventIds),
  )
  await Promise.all(
    rows.map(async (row) => {
      secrets.set(row.event_id, key ? await openRevenue(key, row.payload) : 'masked')
    }),
  )
  return secrets
}

/** Les lignes saisies, complétées par Carte et Espèces quand la date est déchiffrée. */
export function withSecret(
  lines: ReportLine[],
  secret: SecretRevenue | 'masked' | undefined,
): { lines: ReportLine[]; secret: ReportDate['secret'] } {
  if (!secret) return { lines, secret: 'none' }
  if (secret === 'masked') return { lines, secret }
  return { lines: [...lines, ...secretLines(secret)], secret: 'open' }
}
