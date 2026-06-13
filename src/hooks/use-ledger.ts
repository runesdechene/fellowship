import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { LedgerEntry, LedgerCategory, LedgerDirection } from '@/types/database'

const TABLE = 'event_ledger_entries'

/** Lignes du registre d'un event pour l'acteur actif. `refetch` après mutation. */
export function useEventLedger(eventId: string | undefined) {
  const { currentActor } = useAuth()
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!eventId || !currentActor) { setLoading(false); return }
    const { data } = await (supabase as any).from(TABLE).select('*')
      .eq('event_id', eventId).eq('actor_id', currentActor.id)
      .order('created_at', { ascending: true })
    setEntries((data ?? []) as LedgerEntry[])
    setLoading(false)
  }, [eventId, currentActor])

  useEffect(() => { refetch() }, [refetch]) // eslint-disable-line react-hooks/set-state-in-effect

  return { entries, loading, refetch }
}

/** Toutes les lignes de l'acteur actif, indexées par event_id (pour le cockpit). */
export function useMyLedger(): { entriesByEvent: Map<string, LedgerEntry[]>; loading: boolean; refetch: () => Promise<void> } {
  const { currentActor } = useAuth()
  const [entriesByEvent, setEntriesByEvent] = useState<Map<string, LedgerEntry[]>>(new Map())
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!currentActor) { setLoading(false); return }
    const { data } = await (supabase as any).from(TABLE).select('*').eq('actor_id', currentActor.id)
    const map = new Map<string, LedgerEntry[]>()
    for (const e of (data ?? []) as LedgerEntry[]) {
      const arr = map.get(e.event_id) ?? []
      arr.push(e); map.set(e.event_id, arr)
    }
    setEntriesByEvent(map)
    setLoading(false)
  }, [currentActor])

  useEffect(() => { refetch() }, [refetch]) // eslint-disable-line react-hooks/set-state-in-effect

  return { entriesByEvent, loading, refetch }
}

export async function insertLedgerEntry(row: {
  report_id: string; actor_id: string; event_id: string
  label: string | null; amount: number; direction: LedgerDirection
  category: LedgerCategory; source: 'stepper' | 'manual'
}) {
  return await (supabase as any).from(TABLE).insert(row).select().single()
}

export async function updateLedgerEntry(id: string, patch: Partial<Pick<LedgerEntry, 'label' | 'amount' | 'direction' | 'category'>>) {
  return await (supabase as any).from(TABLE).update(patch).eq('id', id).select().single()
}

export async function deleteLedgerEntry(id: string) {
  return await (supabase as any).from(TABLE).delete().eq('id', id)
}

/**
 * Upsert idempotent de la ligne « stepper » (prix total de la place/cachet) d'un bilan.
 * direction/category dérivés de l'orientation. Si amount <= 0 → supprime la ligne (pas de ligne à 0).
 */
export async function upsertStepperLedgerLine(args: {
  reportId: string; actorId: string; eventId: string
  amount: number; orientation: 'payeur' | 'paye'
}) {
  const { reportId, actorId, eventId, amount, orientation } = args
  const category: LedgerCategory = orientation === 'paye' ? 'cachet' : 'emplacement'
  const direction: LedgerDirection = orientation === 'paye' ? 'in' : 'out'

  const { data: existing } = await (supabase as any).from(TABLE).select('id')
    .eq('report_id', reportId).eq('source', 'stepper').maybeSingle()

  if (!amount || amount <= 0) {
    if (existing) await (supabase as any).from(TABLE).delete().eq('id', existing.id)
    return
  }
  if (existing) {
    await (supabase as any).from(TABLE).update({ amount, category, direction }).eq('id', existing.id)
  } else {
    await (supabase as any).from(TABLE).insert({
      report_id: reportId, actor_id: actorId, event_id: eventId,
      label: null, amount, direction, category, source: 'stepper',
    })
  }
}

/**
 * Garantit qu'un event_reports existe pour (actor, event) et renvoie son id.
 * Nécessaire car la ligne stepper référence report_id, même si l'exposant n'a pas
 * encore ouvert le formulaire de bilan.
 */
export async function ensureReportId(actorId: string, eventId: string): Promise<string | null> {
  const { data: existing } = await supabase.from('event_reports').select('id')
    .eq('actor_id', actorId).eq('event_id', eventId).maybeSingle()
  if (existing) return (existing as { id: string }).id
  const { data: created } = await supabase.from('event_reports')
    .upsert({ actor_id: actorId, event_id: eventId } as any, { onConflict: 'actor_id,event_id' })
    .select('id').single()
  return created ? (created as { id: string }).id : null
}
