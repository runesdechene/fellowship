/**
 * QUOI     — charge la page Décades d'une enseigne : ses réglages, ses sources, les journées du mois
 *            affiché, ce qui reste à traiter (tous mois confondus) et le dernier jour envoyé ; et
 *            valide une journée à vérifier, marque une vente facturée à un pro.
 * POURQUOI — la page lit tout d'un coup ; une journée bloquée d'octobre doit rester visible quand on
 *            regarde novembre.
 */
import { useCallback, useEffect, useState } from 'react'
import { todayIso } from '@/lib/dates'
import type { Declaration, Sale } from '@/lib/reporting'
import { must, supabase } from '@/lib/supabase'

const DAY_COLUMNS = 'id, jour, statut, lignes, detail, anomalies'
const TODO_STATUSES = ['a_verifier', 'refusee', 'inconnue', 'en_attente']

async function loadReporting(entityId: string, month: Date) {
  const response = await supabase
    .from('reporting_entreprises')
    .select('*')
    .eq('entity_actor_id', entityId)
    .maybeSingle()
  const company = must(response)
  if (!company) throw new Error('Le reporting n’est pas activé pour cette enseigne.')

  const from = todayIso(new Date(month.getFullYear(), month.getMonth(), 1))
  const to = todayIso(new Date(month.getFullYear(), month.getMonth() + 1, 0))
  const days = () =>
    supabase
      .from('reporting_journees')
      .select(DAY_COLUMNS)
      .eq('entity_actor_id', entityId)
      .eq('environnement', company.environnement)
  const [sources, monthDays, todo, lastSent] = await Promise.all([
    supabase.from('reporting_sources').select('*').eq('entity_actor_id', entityId).order('type'),
    days().gte('jour', from).lte('jour', to).order('jour'),
    days().in('statut', TODO_STATUSES).order('jour'),
    days().eq('statut', 'envoyee').order('jour', { ascending: false }).limit(1),
  ])
  // Le suivi vient de SuperPDP : sa panne ne doit pas priver la page du reste.
  const suivi = await supabase.functions.invoke<{ declarations?: Declaration[] }>(
    'reporting-suivi',
    { body: { entite: entityId } },
  )
  return {
    company,
    declarations: suivi.error ? null : (suivi.data?.declarations ?? null),
    sources: must(sources),
    days: must(monthDays),
    todo: must(todo),
    lastSent: must(lastSent)[0]?.jour ?? null,
  }
}

export type ReportingData = Awaited<ReturnType<typeof loadReporting>>
export type ReportingDay = ReportingData['days'][number]

export function useReporting(entityId: string, month: Date) {
  const monthKey = todayIso(month)
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<{ data: ReportingData | null; error: string | null }>({
    data: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const data = await loadReporting(entityId, new Date(`${monthKey}T00:00:00`))
        if (cancelled) return
        setState({ data, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          data: null,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [entityId, monthKey, version])

  /** Débloque une journée : elle partira au prochain passage. Rend le message d'échec, ou null. */
  const validate = useCallback(async (dayId: string) => {
    const { error } = await supabase.rpc('reporting_valider_journee', { p_journee: dayId })
    if (error) return error.message
    setVersion((previous) => previous + 1)
    return null
  }, [])

  /** Sort une vente du total B2C, ou l'y remet. Rend le message d'échec, ou null. */
  const markSale = useCallback(async (dayId: string, sale: Sale, invoiced: boolean) => {
    const response = await supabase.functions.invoke<{ ok?: boolean }>('reporting-vente-pro', {
      body: { journee: dayId, source: sale.source, reference: sale.reference, facturee: invoiced },
    })
    if (response.error || !response.data?.ok) return 'Le changement n’a pas abouti. Réessaie.'
    setVersion((previous) => previous + 1)
    return null
  }, [])

  return { ...state, validate, markSale }
}
