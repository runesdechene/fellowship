/**
 * QUOI     — le dossier privé de l'acteur actif sur une date : objectif de chiffre d'affaires,
 *            acompte versé, échéance du solde, date d'envoi et contenu du dossier.
 * POURQUOI — « Mon dossier — visible par toi seul » sur la fiche. Il vit dans sa propre table
 *            (participation_dossiers), lisible par son seul propriétaire.
 * ATTENTION — l'affichage bouge avant la base ; une écriture refusée remet l'état d'avant et le
 *            dit. Les dates restent au format SQL (« 2026-10-15 ») : lib/dates.ts les lit.
 */
import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'
import type { TablesInsert } from '@/types/supabase'

export interface DossierFields {
  revenueGoal: number | null
  depositAmount: number | null
  balanceDueOn: string | null
  applicationSentOn: string | null
  applicationNote: string | null
}

const EMPTY_FIELDS: DossierFields = {
  revenueGoal: null,
  depositAmount: null,
  balanceDueOn: null,
  applicationSentOn: null,
  applicationNote: null,
}

/** Les champs touchés, sous leurs noms de colonnes ; un champ absent du patch n'est pas écrit. */
function toColumns(patch: Partial<DossierFields>): Partial<TablesInsert<'participation_dossiers'>> {
  const row: Partial<TablesInsert<'participation_dossiers'>> = {}
  if ('revenueGoal' in patch) row.revenue_goal = patch.revenueGoal ?? null
  if ('depositAmount' in patch) row.deposit_amount = patch.depositAmount ?? null
  if ('balanceDueOn' in patch) row.balance_due_on = patch.balanceDueOn ?? null
  if ('applicationSentOn' in patch) row.application_sent_on = patch.applicationSentOn ?? null
  if ('applicationNote' in patch) row.application_note = patch.applicationNote ?? null
  return row
}

async function loadDossier(eventId: string, actorId: string): Promise<DossierFields> {
  const response = await supabase
    .from('participation_dossiers')
    .select('revenue_goal, deposit_amount, balance_due_on, application_sent_on, application_note')
    .eq('actor_id', actorId)
    .eq('event_id', eventId)
    .maybeSingle()
  const row = must(response)
  if (!row) return EMPTY_FIELDS
  return {
    revenueGoal: row.revenue_goal,
    depositAmount: row.deposit_amount,
    balanceDueOn: row.balance_due_on,
    applicationSentOn: row.application_sent_on,
    applicationNote: row.application_note,
  }
}

export interface Dossier {
  fields: DossierFields
  error: string | null
  /** Écrit un ou plusieurs champs ; les autres ne bougent pas. */
  save: (patch: Partial<DossierFields>) => Promise<void>
}

export function useDossier(
  eventId: string | undefined,
  actorId: string | null | undefined,
): Dossier {
  const [fields, setFields] = useState<DossierFields>(EMPTY_FIELDS)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId || !actorId) return
    let cancelled = false

    async function run(currentEvent: string, currentActor: string) {
      let next: DossierFields = EMPTY_FIELDS
      let failure: string | null = null
      try {
        next = await loadDossier(currentEvent, currentActor)
      } catch {
        failure = 'Ton dossier n’a pas pu être chargé.'
      }
      if (cancelled) return
      setFields(next)
      setError(failure)
    }

    void run(eventId, actorId)
    return () => {
      cancelled = true
    }
  }, [eventId, actorId])

  const save = useCallback(
    async (patch: Partial<DossierFields>) => {
      if (!eventId || !actorId) return
      const before = fields
      setFields({ ...fields, ...patch })
      setError(null)

      const response = await supabase.from('participation_dossiers').upsert(
        {
          actor_id: actorId,
          event_id: eventId,
          updated_at: new Date().toISOString(),
          ...toColumns(patch),
        },
        { onConflict: 'actor_id,event_id' },
      )
      if (response.error) {
        setFields(before)
        setError('Ton dossier n’a pas pu être enregistré.')
      }
    },
    [eventId, actorId, fields],
  )

  return { fields, error, save }
}
