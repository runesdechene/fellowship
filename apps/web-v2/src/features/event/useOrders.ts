/**
 * QUOI     — les commandes d'une date sur sa fiche (sûres, potentielles) : leur lecture et leur
 *            écriture, avant comme après le festival.
 * POURQUOI — le bilan ne s'ouvre qu'une fois la date passée, or les commandes servent à voir venir.
 * ATTENTION — même règle que le bilan (revenueRegime) : date chiffrée, tout passe par le message
 *            scellé, verrouillée, rien ne s'affiche ni ne s'écrit. Les écritures passent une par une
 *            (lib/write-queue.ts) : deux montants enchaînés ne s'écrasent pas au rescellement.
 *            Patron de chargement de .claude/rules/v2.md.
 */
import { useEffect, useState } from 'react'
import { resealPart, setClearOrder } from '@/features/reports/reportActions'
import { loadSecrets, withSecret } from '@/features/reports/secretRevenue'
import { ordersOf, revenueRegime, type OrderKind, type Orders } from '@/lib/report-writes'
import type { ReportDate } from '@/lib/reports'
import { PhraseChangedError, RevenueKeyError, useRevenueKey } from '@/lib/revenue-key'
import { must, supabase } from '@/lib/supabase'
import { createWriteQueue } from '@/lib/write-queue'

interface Loaded {
  orders: Orders
  secret: ReportDate['secret']
  lines: { direction: 'in' | 'out'; source: string }[]
  /** Pour qui ces commandes ont été lues : jamais celles d'une autre date à l'écran. */
  owner: string
}

async function loadOrders(
  eventId: string,
  actorId: string,
  key: CryptoKey | null,
): Promise<Loaded> {
  const [reportResponse, linesResponse, secrets] = await Promise.all([
    supabase
      .from('event_reports')
      .select('potential_orders')
      .eq('actor_id', actorId)
      .eq('event_id', eventId)
      .maybeSingle(),
    supabase
      .from('event_ledger_entries')
      .select('amount, direction, category, source')
      .eq('actor_id', actorId)
      .eq('event_id', eventId),
    loadSecrets(actorId, [eventId], key),
  ])
  const report = must(reportResponse)
  const rows = must(linesResponse)
  const lines = rows.map((row) => ({
    ...row,
    direction: row.direction === 'in' ? ('in' as const) : ('out' as const),
  }))
  const sealed = secrets.get(eventId)
  return {
    orders: ordersOf(sealed, lines, report?.potential_orders),
    secret: withSecret(lines, sealed).secret,
    lines,
    owner: `${actorId}/${eventId}`,
  }
}

export interface OrdersView {
  /** null tant que les commandes de cette date ne sont pas lues. */
  orders: Orders | null
  masked: boolean
  save: (kind: OrderKind, amount: number) => void
  /** Change à chaque échec : les champs reprennent la valeur gardée. */
  failures: number
  error: string | null
}

export function useOrders(
  eventId: string | undefined,
  actorId: string | null | undefined,
  onChange: () => Promise<void>,
): OrdersView {
  const { key, status, verify, lock } = useRevenueKey()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [version, setVersion] = useState(0)
  const [enqueue] = useState(createWriteQueue)
  const [failures, setFailures] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId || !actorId) return
    let cancelled = false

    async function run(currentEvent: string, currentActor: string) {
      let next: Loaded | null = null
      let failure: string | null = null
      try {
        next = await loadOrders(currentEvent, currentActor, key)
      } catch {
        failure = 'Tes commandes n’ont pas pu être lues.'
      }
      if (cancelled) return
      setLoaded(next)
      setError(failure)
    }

    void run(eventId, actorId)
    return () => {
      cancelled = true
    }
  }, [eventId, actorId, version, key, status])

  const current = loaded?.owner === `${actorId}/${eventId}` ? loaded : null
  const regime = revenueRegime(
    current?.secret ?? 'none',
    current?.lines ?? [],
    status,
    current?.orders.potentielles ?? 0,
  )

  function save(kind: OrderKind, amount: number) {
    if (!eventId || !actorId || !current) return
    const target = { actorId, eventId }
    const { encrypted, byDefault } = regime
    // Rien à sceller pour un zéro : la date resterait « remplie » sans que rien n'y soit saisi.
    if (encrypted && (!key || (byDefault && amount === 0))) return
    setError(null)
    enqueue(async () => {
      if (encrypted && key) await resealPart(target, key, kind, amount, await verify(key))
      else await setClearOrder(target, kind, amount)
    })
      .catch((reason: unknown) => {
        if (reason instanceof PhraseChangedError) lock()
        setError(
          reason instanceof RevenueKeyError
            ? reason.message
            : 'Ce montant n’a pas pu être enregistré.',
        )
        setFailures((n) => n + 1)
      })
      .finally(() => {
        setVersion((v) => v + 1)
        void onChange()
      })
  }

  return { orders: current?.orders ?? null, masked: regime.masked, save, failures, error }
}
