import { useCallback, useEffect, useState } from 'react'
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
  /** « payeur » : je paie ma place. « paye » : on me paie pour venir. */
  paymentOrientation: PaymentOrientation
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

/**
 * Les trois états vivants du paiement. « acompte_verse » est un reliquat de la
 * V1 : on l'affiche s'il est en base, on ne le propose plus.
 */
export type PaymentStatus = 'a_payer' | 'acompte_verse' | 'paye'

/**
 * Le sens de l'argent sur cette date. Un exposant paie son emplacement ; un
 * artiste programme est paye pour venir. Les memes crans, lus a l'envers.
 */
export type PaymentOrientation = 'payeur' | 'paye'

/** Ce que la fiche peut CHANGER, par opposition à ce qu'elle lit. */
export interface EventActions {
  /**
   * Poser mon statut sur cette date. `null` me retire complètement : la ligne
   * de participation est supprimée, pas passée à un statut « absent » — la
   * base n'en a pas, et en inventer un fausserait tous les comptages.
   */
  setStatus: (next: ParticipationStatus | null) => Promise<void>
  /** Faire avancer le paiement. Sans participation, il n'y a rien à payer. */
  setPayment: (next: PaymentStatus) => Promise<void>
  /** Basculer entre « je paie ma place » et « on me paie pour venir ». */
  setOrientation: (next: PaymentOrientation) => Promise<void>
  /** Une écriture est en cours : les crans ne doivent pas être re-cliquables. */
  saving: boolean
  /** L'écriture a échoué. L'affichage est déjà revenu en arrière. */
  writeError: string | null
}

const EMPTY: EventData = {
  event: null,
  startDate: null,
  endDate: null,
  daysAway: 0,
  past: false,
  status: null,
  paymentStatus: null,
  paymentOrientation: 'payeur',
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
export function useEvent(
  eventId: string | undefined,
  actorId: string | null | undefined,
  personActorId?: string | null,
): EventData & EventActions {
  const [state, setState] = useState<EventData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [writeError, setWriteError] = useState<string | null>(null)

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
          .select('status, payment_status, payment_orientation')
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
        paymentOrientation: (participation?.payment_orientation as PaymentOrientation) ?? 'payeur',
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

  // L'affichage bouge AVANT la base : cocher un cran doit répondre tout de
  // suite. Si l'écriture échoue, on remet l'état d'avant et on le dit — un
  // cran qui reste coché sur une écriture ratée est un mensonge.
  const currentStatus = state.status
  const currentPayment = state.paymentStatus

  const setStatus = useCallback(
    async (next: ParticipationStatus | null) => {
      if (!eventId || !actorId || saving) return
      setSaving(true)
      setWriteError(null)
      setState((s) => ({
        ...s,
        status: next,
        confirmed: next ? CONFIRMED_STATUSES.includes(next) : false,
        // Me retirer efface aussi le paiement : il n'a plus d'objet.
        paymentStatus: next === null ? null : s.paymentStatus,
      }))

      const { error } =
        next === null
          ? await supabase
              .from('participations')
              .delete()
              .eq('actor_id', actorId)
              .eq('event_id', eventId)
          : await supabase.from('participations').upsert(
              {
                actor_id: actorId,
                event_id: eventId,
                status: next,
                acted_by_user_id: personActorId ?? null,
              },
              { onConflict: 'actor_id,event_id' },
            )

      setSaving(false)
      if (error) {
        setState((s) => ({
          ...s,
          status: currentStatus,
          confirmed: currentStatus ? CONFIRMED_STATUSES.includes(currentStatus) : false,
          paymentStatus: currentPayment,
        }))
        setWriteError("Le changement n'a pas pu être enregistré.")
      }
    },
    [eventId, actorId, personActorId, saving, currentStatus, currentPayment],
  )

  const setPayment = useCallback(
    async (next: PaymentStatus) => {
      // Sans participation il n'y a pas de ligne à mettre à jour : le paiement
      // n'existe que sur une date qu'on fait.
      if (!eventId || !actorId || saving || !currentStatus) return
      setSaving(true)
      setWriteError(null)
      setState((s) => ({ ...s, paymentStatus: next }))

      const { error } = await supabase
        .from('participations')
        .update({ payment_status: next, acted_by_user_id: personActorId ?? null })
        .eq('actor_id', actorId)
        .eq('event_id', eventId)

      setSaving(false)
      if (error) {
        setState((s) => ({ ...s, paymentStatus: currentPayment }))
        setWriteError("Le paiement n'a pas pu être enregistré.")
      }
    },
    [eventId, actorId, personActorId, saving, currentStatus, currentPayment],
  )

  const currentOrientation = state.paymentOrientation

  const setOrientation = useCallback(
    async (next: PaymentOrientation) => {
      if (!eventId || !actorId || saving || !currentStatus) return
      setSaving(true)
      setWriteError(null)
      setState((s) => ({ ...s, paymentOrientation: next }))

      const { error } = await supabase
        .from('participations')
        .update({ payment_orientation: next, acted_by_user_id: personActorId ?? null })
        .eq('actor_id', actorId)
        .eq('event_id', eventId)

      setSaving(false)
      if (error) {
        setState((s) => ({ ...s, paymentOrientation: currentOrientation }))
        setWriteError("Le changement n'a pas pu être enregistré.")
      }
    },
    [eventId, actorId, personActorId, saving, currentStatus, currentOrientation],
  )

  const actions: EventActions = { setStatus, setPayment, setOrientation, saving, writeError }

  if (!eventId) {
    return { ...EMPTY, loading: false, error: 'Cet événement est introuvable.', ...actions }
  }

  return { ...state, ...actions }
}
