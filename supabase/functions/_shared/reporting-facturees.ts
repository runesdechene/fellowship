// reporting-facturees : les ventes d'une enseigne facturées à un pro, à retirer de son total B2C.
import { cleVente } from './reporting-ventes.ts'
import { getSupabaseAdmin } from './supabase-admin.ts'

export async function lireFacturees(entite: string): Promise<Set<string>> {
  const { data, error } = await getSupabaseAdmin().from('reporting_ventes_pro')
    .select('source, reference').eq('entity_actor_id', entite)
  if (error) throw error
  return new Set(data.map((v) => cleVente(v.source, v.reference)))
}
