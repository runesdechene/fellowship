import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { daysUntil, monthKey, monthsWindow, parseSqlDate, type MonthSlot } from '@/lib/dates'
import {
  CONFIRMED_STATUSES,
  PROGRAMMED_STATUSES,
  fetchFriendsByEvent,
  type Friend,
} from '@/lib/friends'
import { ledgerProfit, ledgerRevenue, type LedgerLine } from '@/lib/money'
import type { EventRow, ParticipationStatus } from '@/types/database'

/** Les seules colonnes d'événement dont une carte de bilan a besoin. */
type PastEvent = Pick<EventRow, 'id' | 'name' | 'image_url' | 'start_date' | 'end_date'>

export type { Friend }

export interface DashboardDate {
  participationId: string
  status: ParticipationStatus
  paymentStatus: string | null
  confirmed: boolean
  event: EventRow
  startDate: Date
  daysAway: number
  friends: Friend[]
}

/**
 * Où en est une date qui n'est pas encore réglée.
 * `dossier`  le dossier est parti, le festival n'a pas répondu
 * `acompte`  inscrit, un acompte a été versé, il reste le solde
 * `a-payer`  inscrit, rien n'a encore été versé
 */
export type SettlementState = 'dossier' | 'acompte' | 'a-payer'

/** Une date à venir dont le dossier ou le paiement n'est pas clos. */
export interface Settlement {
  participationId: string
  /** Vers où mène la ligne : la fiche de l'événement. */
  eventId: string
  name: string
  city: string
  startDate: Date
  state: SettlementState
  /** Le prix de l'emplacement, s'il est renseigné. Jamais une somme de frais. */
  due: number | null
}

/** Paiements qui laissent quelque chose à régler. */
const DUE_PAYMENTS = ['a_payer', 'acompte_verse']

export interface MonthBucket extends MonthSlot {
  count: number
}

/** Une date passée, avec son bilan s'il a été rempli. */
export interface DashboardReport {
  eventId: string
  name: string
  imageUrl: string | null
  date: Date
  /** Somme des entrants. null tant qu'aucune ligne de registre n'existe. */
  revenue: number | null
  /** Entrants − sortants. null tant qu'aucune ligne de registre n'existe. */
  net: number | null
}

/* Il n'existe pas d'écran d'historique : TOUS les bilans vivent sur le
   tableau de bord. La rangée passe à la ligne, elle ne tronque jamais. */

export interface DashboardData {
  /** Nombre total de dates programmées à venir. */
  programmedCount: number
  months: MonthBucket[]
  next: DashboardDate | null
  /** Les dates suivantes, après la prochaine. */
  upcoming: DashboardDate[]
  /** Les dates à venir dont le dossier ou le paiement n'est pas clos. */
  settlements: Settlement[]
  /** Les dernières dates passées, remplies ou non. */
  reports: DashboardReport[]
  /** Net cumulé de toutes les dates passées. null si aucun bilan rempli. */
  seasonNet: number | null
  /** Recette cumulée des mêmes dates — le CA, pour situer le bénéfice. */
  seasonRevenue: number | null
  /**
   * La date passée la plus récente dont le bilan n'a pas été rempli — celle
   * que la bande d'action met en avant. null s'il n'y en a aucune.
   */
  pendingReport: DashboardReport | null
  loading: boolean
  error: string | null
}

const EMPTY: DashboardData = {
  programmedCount: 0,
  months: [],
  next: null,
  upcoming: [],
  settlements: [],
  reports: [],
  seasonNet: null,
  seasonRevenue: null,
  pendingReport: null,
  loading: true,
  error: null,
}

type ParticipationWithEvent = {
  id: string
  status: ParticipationStatus
  payment_status: string | null
  event_id: string
  events: EventRow | null
}

/**
 * « À régler » : une date à venir dont le dossier est parti sans réponse, ou
 * dont le paiement n'est pas soldé. Le montant vient de LA ligne d'emplacement
 * du registre — jamais d'une somme, qui mélangerait la dette et les frais.
 */
async function fetchSettlements(
  actorId: string,
  dates: DashboardDate[],
): Promise<Settlement[]> {
  const pending = dates.filter(
    (date) =>
      date.status === 'en_cours' ||
      (date.confirmed && DUE_PAYMENTS.includes(date.paymentStatus ?? '')),
  )
  if (pending.length === 0) return []

  const { data } = await supabase
    .from('event_ledger_entries')
    .select('event_id, amount')
    .eq('actor_id', actorId)
    .eq('source', 'stepper')
    .eq('direction', 'out')
    .in(
      'event_id',
      pending.map((date) => date.event.id),
    )

  const dueByEvent = new Map((data ?? []).map((row) => [row.event_id, row.amount]))

  return pending.map((date) => {
    const due = dueByEvent.get(date.event.id)
    return {
      participationId: date.participationId,
      eventId: date.event.id,
      name: date.event.name,
      city: date.event.city,
      startDate: date.startDate,
      state:
        date.status === 'en_cours'
          ? 'dossier'
          : date.paymentStatus === 'acompte_verse'
            ? 'acompte'
            : 'a-payer',
      due: typeof due === 'number' && due > 0 ? due : null,
    }
  })
}

/**
 * Les dates passées de l'ANNÉE EN COURS, chacune accompagnée de son bilan
 * s'il existe. Une date sans bilan reste dans la liste : c'est justement
 * celle qu'il faut remplir, et elle a sa propre carte.
 *
 * Les années précédentes ne sont pas affichées pour l'instant — il n'y a pas
 * encore d'écran d'historique où les envoyer.
 */
async function fetchReports(
  actorId: string,
  todayIso: string,
): Promise<{
  reports: DashboardReport[]
  seasonNet: number | null
  seasonRevenue: number | null
  pendingReport: DashboardReport | null
}> {
  const yearStart = `${todayIso.slice(0, 4)}-01-01`

  const { data } = await supabase
    .from('participations')
    .select('event_id, events!inner(id, name, image_url, start_date, end_date)')
    .eq('actor_id', actorId)
    .in('status', CONFIRMED_STATUSES)
    .gte('events.end_date', yearStart)
    .lt('events.end_date', todayIso)

  const past = ((data ?? []) as unknown as Array<{ events: PastEvent | null }>)
    .map((row) => row.events)
    .filter((event): event is PastEvent => Boolean(event))
    .sort((a, b) => b.end_date.localeCompare(a.end_date))

  if (past.length === 0)
    return { reports: [], seasonNet: null, seasonRevenue: null, pendingReport: null }

  const { data: ledgerRows } = await supabase
    .from('event_ledger_entries')
    .select('event_id, amount, direction')
    .eq('actor_id', actorId)
    .in(
      'event_id',
      past.map((event) => event.id),
    )

  const linesByEvent = (ledgerRows ?? []).reduce((map, line) => {
    const list = map.get(line.event_id) ?? []
    list.push({ amount: line.amount, direction: line.direction })
    map.set(line.event_id, list)
    return map
  }, new Map<string, LedgerLine[]>())

  const reports = past.map((event) => {
    const lines = linesByEvent.get(event.id) ?? []
    // Aucune ligne de registre = bilan pas encore rempli.
    const filled = lines.length > 0
    return {
      eventId: event.id,
      name: event.name,
      imageUrl: event.image_url,
      date: parseSqlDate(event.start_date),
      revenue: filled ? ledgerRevenue(lines) : null,
      net: filled ? ledgerProfit(lines) : null,
    }
  })

  const allLines = (ledgerRows ?? []).map((line) => ({
    amount: line.amount,
    direction: line.direction,
  }))
  const seasonNet = allLines.length > 0 ? ledgerProfit(allLines) : null
  const seasonRevenue = allLines.length > 0 ? ledgerRevenue(allLines) : null

  // `past` est trié du plus récent au plus ancien : le premier bilan vide
  // trouvé est donc bien le plus récent.
  const pendingReport = reports.find((report) => report.net === null) ?? null

  return { reports, seasonNet, seasonRevenue, pendingReport }
}

/**
 * Toutes les données du tableau de bord, pour l'acteur actif.
 * Une seule requête principale (participations + événements), puis deux
 * requêtes d'appoint pour les amis présents sur les mêmes dates.
 */
export function useDashboard(actorId: string | null | undefined): DashboardData {
  const [state, setState] = useState<Omit<DashboardData, 'months'>>(EMPTY)
  const [dates, setDates] = useState<DashboardDate[]>([])

  useEffect(() => {
    // Sans acteur, il n'y a rien à charger : l'état vide est dérivé plus bas,
    // pas posé ici — écrire dans le state depuis le corps d'un effet
    // déclencherait un rendu en cascade inutile.
    if (!actorId) return

    let cancelled = false
    const today = new Date()
    const todayIso = today.toISOString().slice(0, 10)

    async function load(currentActorId: string) {
      setState((s) => ({ ...s, loading: true, error: null }))

      const { data, error } = await supabase
        .from('participations')
        .select('id, status, payment_status, event_id, events!inner(*)')
        .eq('actor_id', currentActorId)
        .in('status', PROGRAMMED_STATUSES)
        .gte('events.end_date', todayIso)

      if (cancelled) return
      if (error) {
        setDates([])
        setState({ ...EMPTY, loading: false, error: error.message })
        return
      }

      const rows = ((data ?? []) as unknown as ParticipationWithEvent[]).filter(
        (row): row is ParticipationWithEvent & { events: EventRow } => Boolean(row.events),
      )

      const friendsByEvent = await fetchFriendsByEvent(
        currentActorId,
        rows.map((row) => row.event_id),
      )

      if (cancelled) return

      const built = rows
        .map<DashboardDate>((row) => {
          const startDate = parseSqlDate(row.events.start_date)
          return {
            participationId: row.id,
            status: row.status,
            paymentStatus: row.payment_status,
            confirmed: CONFIRMED_STATUSES.includes(row.status),
            event: row.events,
            startDate,
            daysAway: daysUntil(startDate, today),
            friends: friendsByEvent.get(row.event_id) ?? [],
          }
        })
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

      const [{ reports, seasonNet, seasonRevenue, pendingReport }, settlements] = await Promise.all(
        [fetchReports(currentActorId, todayIso), fetchSettlements(currentActorId, built)],
      )
      if (cancelled) return

      setDates(built)
      setState({
        programmedCount: built.length,
        next: built[0] ?? null,
        upcoming: built.slice(1, 4),
        settlements,
        reports,
        seasonNet,
        seasonRevenue,
        pendingReport,
        loading: false,
        error: null,
      })
    }

    void load(actorId)
    return () => {
      cancelled = true
    }
  }, [actorId])

  const months = useMemo<MonthBucket[]>(() => {
    const counts = actorId
      ? dates.reduce((map, date) => {
          const key = monthKey(date.startDate)
          map.set(key, (map.get(key) ?? 0) + 1)
          return map
        }, new Map<string, number>())
      : new Map<string, number>()

    return monthsWindow(12).map((slot) => ({ ...slot, count: counts.get(slot.key) ?? 0 }))
  }, [dates, actorId])

  if (!actorId) {
    return {
      programmedCount: 0,
      months,
      next: null,
      upcoming: [],
      settlements: [],
      reports: [],
      seasonNet: null,
      seasonRevenue: null,
      pendingReport: null,
      loading: false,
      error: null,
    }
  }

  return { ...state, months }
}
