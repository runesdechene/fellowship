/**
 * QUOI     — charge les bilans d'une année pour l'acteur actif : ses dates passées où il était
 *            inscrit, leurs lignes de registre, les années disponibles et le chiffre d'affaires
 *            de l'année précédente.
 * POURQUOI — l'écran Mes bilans lit tout d'un coup, puis lib/reports.ts calcule.
 * ATTENTION — patron de chargement de .claude/rules/v2.md : une fonction async qui rend l'état,
 *            appliqué une fois. Se recharge quand la clé des recettes change. Une date aux recettes
 *            chiffrées est remplie même verrouillée : son chiffre d'affaires est alors incomplet
 *            (ReportDate.secret 'masked').
 *            Rechargée par la clé seule, elle garde ses données à l'écran (pas de retour à « Chargement »).
 *            Une requête qui échoue est une erreur, jamais « aucun bilan ».
 */
import { useEffect, useRef, useState } from 'react'
import { must, supabase } from '@/lib/supabase'
import { parseSqlDate, todayIso } from '@/lib/dates'
import { CONFIRMED_STATUSES } from '@/lib/friends'
import { useRevenueKey } from '@/lib/revenue-key'
import { previousRevenue, type ReportDate, type ReportLine } from '@/lib/reports'
import { loadSecrets, withSecret } from './secretRevenue'

export interface ReportsState {
  status: 'loading' | 'ready' | 'error'
  /** Les années qui ont au moins une date passée inscrite, la plus récente d'abord. */
  years: number[]
  dates: ReportDate[]
  previousYearRevenue: number | null
}

const EMPTY: ReportsState = { status: 'loading', years: [], dates: [], previousYearRevenue: null }

async function loadReports(
  actorId: string,
  year: number,
  key: CryptoKey | null,
): Promise<Omit<ReportsState, 'status'>> {
  const rows = must(
    await supabase
      .from('participations')
      .select(
        'event_id, events!inner(id, name, image_url, tags, city, department, start_date, end_date)',
      )
      .eq('actor_id', actorId)
      .in('status', CONFIRMED_STATUSES)
      .lt('events.end_date', todayIso()),
  )
  const events = rows.map((row) => row.events)
  const yearOf = (event: (typeof events)[number]) => parseSqlDate(event.start_date).getFullYear()
  const years = [...new Set(events.map(yearOf))].sort((a, b) => b - a)
  const wanted = events.filter((event) => yearOf(event) === year || yearOf(event) === year - 1)

  const wantedIds = wanted.map((event) => event.id)
  const secrets = await loadSecrets(actorId, wantedIds, key)
  const ledger =
    wanted.length === 0
      ? []
      : must(
          await supabase
            .from('event_ledger_entries')
            .select('event_id, amount, direction, source')
            .eq('actor_id', actorId)
            .in('event_id', wantedIds),
        )
  const linesByEvent = new Map<string, ReportLine[]>()
  for (const line of ledger) {
    const list = linesByEvent.get(line.event_id) ?? []
    list.push({ amount: line.amount, direction: line.direction, source: line.source })
    linesByEvent.set(line.event_id, list)
  }

  const toDate = (event: (typeof events)[number]): ReportDate => ({
    eventId: event.id,
    name: event.name,
    imageUrl: event.image_url,
    tags: event.tags,
    place: `${event.city} (${event.department})`,
    startDate: parseSqlDate(event.start_date),
    endDate: parseSqlDate(event.end_date),
    ...withSecret(linesByEvent.get(event.id) ?? [], secrets.get(event.id)),
  })

  const dates = wanted
    .filter((event) => yearOf(event) === year)
    .map(toDate)
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  const previousYearRevenue = previousRevenue(
    wanted.filter((event) => yearOf(event) === year - 1).map(toDate),
  )

  return { years, dates, previousYearRevenue }
}

/** Les bilans de l'année choisie, pour l'acteur actif. */
export function useReports(actorId: string | null | undefined, year: number): ReportsState {
  const { key, status } = useRevenueKey()
  const [state, setState] = useState<ReportsState>(EMPTY)
  const scope = useRef('')

  useEffect(() => {
    if (!actorId) return
    let cancelled = false

    // Le résultat s'applique UNE fois, si ni l'acteur ni l'année n'ont changé entre-temps.
    async function run(currentActorId: string) {
      // Même acteur, même année (la clé vient d'être tapée) : les données restent affichées le
      // temps du rechargement, sans repasser par « Chargement… ».
      const current = `${currentActorId}/${year}`
      if (scope.current !== current) setState((s) => ({ ...s, status: 'loading' }))
      scope.current = current
      try {
        const result = await loadReports(currentActorId, year, key)
        if (cancelled) return
        setState({ status: 'ready', ...result })
      } catch {
        if (cancelled) return
        setState({ ...EMPTY, status: 'error' })
      }
    }

    void run(actorId)
    return () => {
      cancelled = true
    }
  }, [actorId, year, key, status])

  return state
}
