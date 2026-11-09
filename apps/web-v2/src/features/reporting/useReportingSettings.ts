/**
 * QUOI     — lit et écrit les réglages du reporting d'une enseigne et l'interrupteur de ses sources.
 * POURQUOI — chaque changement s'enregistre aussitôt (maquette 2803:233). La base n'ouvre au
 *            propriétaire que les colonnes de l'écran : l'environnement et la date du premier envoi
 *            réel restent au SQL.
 * ATTENTION — l'écran change d'abord, la base suit ; un refus remet l'ancienne valeur et le dit.
 */
import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Company = Database['public']['Tables']['reporting_entreprises']['Row']
type Source = Database['public']['Tables']['reporting_sources']['Row']
/** Les seules colonnes que l'écran écrit (et que la base lui ouvre). */
export type CompanyPatch = Partial<
  Pick<
    Company,
    | 'regime_tva'
    | 'date_de_vente'
    | 'alerte_email'
    | 'rappel_echeance'
    | 'recap_comptable'
    | 'recap_comptable_email'
    | 'actif'
  >
>

const REFUSED =
  'Ce réglage n’a pas pu être enregistré. Seul le propriétaire de l’enseigne peut le changer.'

async function loadSettings(entityId: string) {
  const response = await supabase
    .from('reporting_entreprises')
    .select('*')
    .eq('entity_actor_id', entityId)
    .maybeSingle()
  const company = must(response)
  if (!company) throw new Error('Le reporting n’est pas activé pour cette enseigne.')
  const sources = must(
    await supabase
      .from('reporting_sources')
      .select('*')
      .eq('entity_actor_id', entityId)
      .order('type'),
  )
  return { company, sources }
}

export function useReportingSettings(entityId: string) {
  const [company, setCompany] = useState<Company | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [error, setError] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadSettings(entityId)
        if (cancelled) return
        setCompany(data.company)
        setSources(data.sources)
      } catch (failure) {
        if (!cancelled)
          setError(failure instanceof Error ? failure.message : 'Chargement impossible')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [entityId])

  const save = useCallback(
    async (patch: CompanyPatch) => {
      if (!company) return
      const before = company
      setCompany({ ...company, ...patch })
      setProblem(null)
      // `select` : une mise à jour que la politique écarte ne lève rien, elle ne touche aucune ligne.
      const { data, error: failure } = await supabase
        .from('reporting_entreprises')
        .update(patch)
        .eq('entity_actor_id', entityId)
        .select('entity_actor_id')
      if (failure || data.length === 0) {
        setCompany(before)
        setProblem(REFUSED)
      }
    },
    [company, entityId],
  )

  const toggleSource = useCallback(async (source: Source) => {
    const flip = (actif: boolean) =>
      setSources((list) => list.map((item) => (item.id === source.id ? { ...item, actif } : item)))
    flip(!source.actif)
    setProblem(null)
    const { data, error: failure } = await supabase
      .from('reporting_sources')
      .update({ actif: !source.actif })
      .eq('id', source.id)
      .select('id')
    if (failure || data.length === 0) {
      flip(source.actif)
      setProblem(REFUSED)
    }
  }, [])

  return { company, sources, error, problem, save, toggleSource }
}
