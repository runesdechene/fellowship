import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { daysUntil, monthKey, monthsWindow, parseSqlDate, type MonthSlot } from '@/lib/dates'
import { ledgerProfit, ledgerRevenue, type LedgerLine } from '@/lib/money'
import type { EntityRow, EventRow, ParticipationStatus, UserRow } from '@/types/database'

/** Les seules colonnes d'événement dont une carte de bilan a besoin. */
type PastEvent = Pick<EventRow, 'id' | 'name' | 'image_url' | 'start_date' | 'end_date'>

/**
 * Statuts considérés comme « une date programmée » : l'exposant s'est engagé,
 * ou son dossier est en cours. « interesse » et « refuse » n'en font pas partie.
 */
const PROGRAMMED_STATUSES: ParticipationStatus[] = ['inscrit', 'confirme', 'en_cours']

/** Statuts qui valent pastille verte ; le reste passe en pastille terre. */
const CONFIRMED_STATUSES: ParticipationStatus[] = ['inscrit', 'confirme']

export interface Friend {
  id: string
  name: string
  avatarUrl: string | null
}

export interface DashboardDate {
  participationId: string
  status: ParticipationStatus
  confirmed: boolean
  event: EventRow
  startDate: Date
  daysAway: number
  friends: Friend[]
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

export interface DashboardData {
  /** Nombre total de dates programmées à venir. */
  programmedCount: number
  months: MonthBucket[]
  next: DashboardDate | null
  /** Les dates suivantes, après la prochaine. */
  upcoming: DashboardDate[]
  /** Les dernières dates passées, remplies ou non. */
  reports: DashboardReport[]
  /** Net cumulé de toutes les dates passées. null si aucun bilan rempli. */
  seasonNet: number | null
  loading: boolean
  error: string | null
}

const EMPTY: DashboardData = {
  programmedCount: 0,
  months: [],
  next: null,
  upcoming: [],
  reports: [],
  seasonNet: null,
  loading: true,
  error: null,
}

type ParticipationWithEvent = {
  id: string
  status: ParticipationStatus
  event_id: string
  events: EventRow | null
}

/** Les acteurs suivis dans les deux sens : la définition d'un « ami ». */
async function fetchMutualFriendIds(actorId: string): Promise<string[]> {
  const { data } = await supabase
    .from('follows')
    .select('follower_actor, following_actor')
    .or(`follower_actor.eq.${actorId},following_actor.eq.${actorId}`)

  const following = new Set<string>()
  const followers = new Set<string>()
  for (const row of data ?? []) {
    if (row.follower_actor === actorId) following.add(row.following_actor)
    if (row.following_actor === actorId) followers.add(row.follower_actor)
  }
  return [...following].filter((id) => followers.has(id))
}

/** Nom et image des amis, qu'ils soient une personne ou une enseigne. */
async function fetchFriendProfiles(ids: string[]): Promise<Map<string, Friend>> {
  const byId = new Map<string, Friend>()
  if (ids.length === 0) return byId

  const [{ data: entities }, { data: users }] = await Promise.all([
    supabase.from('entities').select('actor_id, brand_name, avatar_url').in('actor_id', ids),
    supabase.from('users').select('actor_id, display_name, avatar_url').in('actor_id', ids),
  ])

  for (const row of (entities ?? []) as Pick<
    EntityRow,
    'actor_id' | 'brand_name' | 'avatar_url'
  >[]) {
    byId.set(row.actor_id, {
      id: row.actor_id,
      name: row.brand_name,
      avatarUrl: row.avatar_url,
    })
  }
  for (const row of (users ?? []) as Pick<
    UserRow,
    'actor_id' | 'display_name' | 'avatar_url'
  >[]) {
    if (byId.has(row.actor_id)) continue
    byId.set(row.actor_id, {
      id: row.actor_id,
      name: row.display_name ?? 'Ami',
      avatarUrl: row.avatar_url,
    })
  }
  return byId
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
): Promise<{ reports: DashboardReport[]; seasonNet: number | null }> {
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

  if (past.length === 0) return { reports: [], seasonNet: null }

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

  return { reports, seasonNet }
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
        .select('id, status, event_id, events!inner(*)')
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

      const friendIds = await fetchMutualFriendIds(currentActorId)
      let friendsByEvent = new Map<string, Friend[]>()

      if (friendIds.length > 0 && rows.length > 0) {
        const [{ data: friendParticipations }, profiles] = await Promise.all([
          supabase
            .from('participations')
            .select('actor_id, event_id')
            .in('actor_id', friendIds)
            .in('status', PROGRAMMED_STATUSES)
            .in(
              'event_id',
              rows.map((row) => row.event_id),
            ),
          fetchFriendProfiles(friendIds),
        ])
        friendsByEvent = (friendParticipations ?? []).reduce((map, row) => {
          const friend = profiles.get(row.actor_id)
          if (!friend) return map
          const list = map.get(row.event_id) ?? []
          list.push(friend)
          map.set(row.event_id, list)
          return map
        }, new Map<string, Friend[]>())
      }

      if (cancelled) return

      const built = rows
        .map<DashboardDate>((row) => {
          const startDate = parseSqlDate(row.events.start_date)
          return {
            participationId: row.id,
            status: row.status,
            confirmed: CONFIRMED_STATUSES.includes(row.status),
            event: row.events,
            startDate,
            daysAway: daysUntil(startDate, today),
            friends: friendsByEvent.get(row.event_id) ?? [],
          }
        })
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

      const { reports, seasonNet } = await fetchReports(currentActorId, todayIso)
      if (cancelled) return

      setDates(built)
      setState({
        programmedCount: built.length,
        next: built[0] ?? null,
        upcoming: built.slice(1, 4),
        reports,
        seasonNet,
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
      reports: [],
      seasonNet: null,
      loading: false,
      error: null,
    }
  }

  return { ...state, months }
}
