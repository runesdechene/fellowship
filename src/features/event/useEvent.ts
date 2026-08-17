import { useEffect, useState } from 'react'
import { daysUntil, parseSqlDate } from '@/lib/dates'
import { CONFIRMED_STATUSES, fetchFriendsByEvent, type Friend } from '@/lib/friends'
import { ledgerProfit, ledgerRevenue, type LedgerLine } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import type { EventRow, ParticipationStatus } from '@/types/database'

/** Une ligne du registre, telle qu'elle s'affiche dans le bilan de la fiche. */
export interface EventLedgerLine extends LedgerLine {
  id: string
  category: string
  label: string | null
}

export interface EventData {
  event: EventRow | null
  startDate: Date | null
  endDate: Date | null
  /** Jours avant l'ouverture. Négatif une fois la date passée. */
  daysAway: number
  /** La date est derrière nous : la fiche montre le bilan, pas le compte à rebours. */
  past: boolean

  /** Ma participation, si j'en ai une. null = je ne suis pas sur cette date. */
  status: ParticipationStatus | null
  paymentStatus: string | null
  confirmed: boolean

  friends: Friend[]

  /** Mon registre sur cette date. Vide tant qu'aucun bilan n'a été rempli. */
  ledger: EventLedgerLine[]
  revenue: number | null
  net: number | null

  loading: boolean
  /** Message d'erreur, ou « introuvable » si l'événement n'existe pas. */
  error: string | null
}

const EMPTY: EventData = {
  event: null,
  startDate: null,
  endDate: null,
  daysAway: 0,
  past: false,
  status: null,
  paymentStatus: null,
  confirmed: false,
  friends: [],
  ledger: [],
  revenue: null,
  net: null,
  loading: true,
  error: null,
}

/**
 * Tout ce qu'une fiche d'événement affiche, pour l'acteur actif : l'événement
 * lui-même, ma position dessus, les amis qui y seront, et mon registre.
 *
 * L'événement est public : il se charge même sans participation. C'est ce qui
 * permettra plus tard d'ouvrir une fiche depuis une recherche, et pas
 * seulement depuis ses propres dates.
 */
export function useEvent(eventId: string | undefined, actorId: string | null | undefined): EventData {
  const [state, setState] = useState<EventData>(EMPTY)

  useEffect(() => {
    // Sans identifiant il n'y a rien à charger : l'état est dérivé plus bas,
    // pas posé ici — écrire dans le state depuis le corps d'un effet
    // déclencherait un rendu en cascade inutile.
    if (!eventId) return

    let cancelled = false

    async function load(currentEventId: string) {
      setState((s) => ({ ...s, loading: true, error: null }))

      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', currentEventId)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        setState({ ...EMPTY, loading: false, error: error.message })
        return
      }
      if (!event) {
        setState({ ...EMPTY, loading: false, error: 'Cet événement est introuvable.' })
        return
      }

      const startDate = parseSqlDate(event.start_date)
      const endDate = parseSqlDate(event.end_date)
      const today = new Date()

      // Sans acteur actif, la fiche se réduit à l'événement : pas de
      // participation à chercher, pas d'amis à compter, pas de registre.
      if (!actorId) {
        setState({
          ...EMPTY,
          event,
          startDate,
          endDate,
          daysAway: daysUntil(startDate, today),
          past: daysUntil(endDate, today) < 0,
          loading: false,
        })
        return
      }

      const [{ data: participation }, { data: ledgerRows }, friendsByEvent] = await Promise.all([
        supabase
          .from('participations')
          .select('status, payment_status')
          .eq('actor_id', actorId)
          .eq('event_id', currentEventId)
          .maybeSingle(),
        supabase
          .from('event_ledger_entries')
          .select('id, amount, direction, category, label')
          .eq('actor_id', actorId)
          .eq('event_id', currentEventId),
        fetchFriendsByEvent(actorId, [currentEventId]),
      ])

      if (cancelled) return

      const ledger = (ledgerRows ?? []) as EventLedgerLine[]
      const filled = ledger.length > 0

      setState({
        event,
        startDate,
        endDate,
        daysAway: daysUntil(startDate, today),
        past: daysUntil(endDate, today) < 0,
        status: participation?.status ?? null,
        paymentStatus: participation?.payment_status ?? null,
        confirmed: participation ? CONFIRMED_STATUSES.includes(participation.status) : false,
        friends: friendsByEvent.get(currentEventId) ?? [],
        ledger,
        revenue: filled ? ledgerRevenue(ledger) : null,
        net: filled ? ledgerProfit(ledger) : null,
        loading: false,
        error: null,
      })
    }

    void load(eventId)
    return () => {
      cancelled = true
    }
  }, [eventId, actorId])

  if (!eventId) return { ...EMPTY, loading: false, error: 'Cet événement est introuvable.' }

  return state
}
