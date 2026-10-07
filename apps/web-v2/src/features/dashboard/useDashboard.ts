/**
 * QUOI     — charge et prépare toutes les données du tableau de bord pour l'acteur actif.
 * POURQUOI — un seul hook pour l'écran : participations, amis présents, registre des bilans
 *            (event_ledger_entries), découpés en blocs prêts à afficher (DashboardData).
 * ATTENTION — les montants viennent de event_ledger_entries, jamais des colonnes mortes de
 *            event_reports ; les dates passent par lib/dates.ts, les sommes par lib/money.ts.
 */
import { useEffect, useMemo, useState } from 'react'
import { must, supabase } from '@/lib/supabase'
import {
  daysUntil,
  monthKey,
  monthsWindow,
  parseSqlDate,
  todayIso,
  type MonthSlot,
} from '@/lib/dates'
import {
  CONFIRMED_STATUSES,
  PROGRAMMED_STATUSES,
  fetchFriendsByEvent,
  type Friend,
} from '@/lib/friends'
import { dossierView, type DossierView } from '@/lib/dossiers'
import { ledgerProfit, ledgerRevenue, type LedgerLine } from '@/lib/money'
import type { EventRow, ParticipationStatus } from '@/types/database'

export type { Friend }

export interface DashboardDate {
  participationId: string
  status: ParticipationStatus
  paymentStatus: string | null
  paymentOrientation: string
  confirmed: boolean
  event: EventRow
  startDate: Date
  daysAway: number
  friends: Friend[]
}

/** Une ligne de « Mes dossiers » : une date à venir, son dossier et son paiement. */
export interface Dossier {
  participationId: string
  /** Vers où mène la ligne : la fiche de l'événement. */
  eventId: string
  name: string
  imageUrl: string | null
  startDate: Date
  endDate: Date
  view: DossierView
}

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

interface DashboardData {
  /** Nombre total de dates programmées à venir. */
  programmedCount: number
  months: MonthBucket[]
  next: DashboardDate | null
  /** Les dates suivantes, après la prochaine. */
  upcoming: DashboardDate[]
  /** Toutes les dates à venir, avec leur dossier et leur paiement. */
  dossiers: Dossier[]
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
  dossiers: [],
  reports: [],
  seasonNet: null,
  seasonRevenue: null,
  pendingReport: null,
  loading: true,
  error: null,
}

/**
 * « Mes dossiers » : chaque date à venir avec son dossier et son paiement. Le montant vient de LA
 * ligne d'emplacement (ou de cachet) du registre — jamais d'une somme, qui mélangerait la dette
 * et les frais.
 */
async function fetchDossiers(actorId: string, dates: DashboardDate[]): Promise<Dossier[]> {
  if (dates.length === 0) return []

  const standRows = must(
    await supabase
      .from('event_ledger_entries')
      .select('event_id, amount')
      .eq('actor_id', actorId)
      .eq('source', 'stepper')
      .in(
        'event_id',
        dates.map((date) => date.event.id),
      ),
  )
  const amountByEvent = new Map(standRows.map((row) => [row.event_id, row.amount]))

  return dates.map((date) => {
    const amount = amountByEvent.get(date.event.id)
    return {
      participationId: date.participationId,
      eventId: date.event.id,
      name: date.event.name,
      imageUrl: date.event.image_url,
      startDate: date.startDate,
      endDate: parseSqlDate(date.event.end_date),
      view: dossierView({
        status: date.status,
        paymentStatus: date.paymentStatus,
        orientation: date.paymentOrientation,
        amount: typeof amount === 'number' && amount > 0 ? amount : null,
      }),
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
  todaySql: string,
): Promise<{
  reports: DashboardReport[]
  seasonNet: number | null
  seasonRevenue: number | null
  pendingReport: DashboardReport | null
}> {
  const yearStart = `${todaySql.slice(0, 4)}-01-01`

  const pastRows = must(
    await supabase
      .from('participations')
      .select('event_id, events!inner(id, name, image_url, start_date, end_date)')
      .eq('actor_id', actorId)
      .in('status', CONFIRMED_STATUSES)
      .gte('events.end_date', yearStart)
      .lt('events.end_date', todaySql),
  )

  const past = pastRows
    .map((row) => row.events)
    .sort((a, b) => b.end_date.localeCompare(a.end_date))

  if (past.length === 0)
    return { reports: [], seasonNet: null, seasonRevenue: null, pendingReport: null }

  const ledgerRows = must(
    await supabase
      .from('event_ledger_entries')
      .select('event_id, amount, direction')
      .eq('actor_id', actorId)
      .in(
        'event_id',
        past.map((event) => event.id),
      ),
  )

  const linesByEvent = ledgerRows.reduce((map, line) => {
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

  const allLines = ledgerRows.map((line) => ({
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
 * Charge tout le tableau de bord d'un acteur : une requête principale (participations et
 * événements), puis les amis présents, les bilans et ce qui reste à régler. Lève l'erreur de la
 * première requête qui échoue (must).
 */
async function loadDashboard(
  actorId: string,
  today: Date,
): Promise<{ dates: DashboardDate[]; state: Omit<DashboardData, 'months'> }> {
  const todaySql = todayIso(today)
  const rows = must(
    await supabase
      .from('participations')
      .select('id, status, payment_status, payment_orientation, event_id, events!inner(*)')
      .eq('actor_id', actorId)
      .in('status', PROGRAMMED_STATUSES)
      .gte('events.end_date', todaySql),
  )

  const friendsByEvent = await fetchFriendsByEvent(
    actorId,
    rows.map((row) => row.event_id),
  )

  const dates = rows
    .map<DashboardDate>((row) => {
      const startDate = parseSqlDate(row.events.start_date)
      return {
        participationId: row.id,
        status: row.status,
        paymentStatus: row.payment_status,
        paymentOrientation: row.payment_orientation,
        confirmed: CONFIRMED_STATUSES.includes(row.status),
        event: row.events,
        startDate,
        daysAway: daysUntil(startDate, today),
        friends: friendsByEvent.get(row.event_id) ?? [],
      }
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  const [{ reports, seasonNet, seasonRevenue, pendingReport }, dossiers] = await Promise.all([
    fetchReports(actorId, todaySql),
    fetchDossiers(actorId, dates),
  ])

  return {
    dates,
    state: {
      programmedCount: dates.length,
      next: dates[0] ?? null,
      upcoming: dates.slice(1, 4),
      dossiers,
      reports,
      seasonNet,
      seasonRevenue,
      pendingReport,
      loading: false,
      error: null,
    },
  }
}

/** Toutes les données du tableau de bord, pour l'acteur actif. */
export function useDashboard(actorId: string | null | undefined): DashboardData {
  const [state, setState] = useState<Omit<DashboardData, 'months'>>(EMPTY)
  const [dates, setDates] = useState<DashboardDate[]>([])

  useEffect(() => {
    // Sans acteur, il n'y a rien à charger : l'état vide est dérivé plus bas,
    // pas posé ici — écrire dans le state depuis le corps d'un effet
    // déclencherait un rendu en cascade inutile.
    if (!actorId) return

    let cancelled = false

    // Le résultat s'applique UNE fois, à la fin, si l'acteur n'a pas changé entre-temps. Une
    // seule interception : quelle que soit la requête qui échoue, l'écran dit « erreur » plutôt
    // que d'afficher un tableau de bord vide présenté pour vrai.
    async function run(currentActorId: string) {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const result = await loadDashboard(currentActorId, new Date())
        if (cancelled) return
        setDates(result.dates)
        setState(result.state)
      } catch (reason) {
        if (cancelled) return
        setDates([])
        setState({
          ...EMPTY,
          loading: false,
          error: reason instanceof Error ? reason.message : String(reason),
        })
      }
    }

    void run(actorId)
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
      dossiers: [],
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
