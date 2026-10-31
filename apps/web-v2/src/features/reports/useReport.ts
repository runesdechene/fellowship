/**
 * QUOI     — le bilan d'une date pour l'acteur actif : son chargement et ses écritures.
 * POURQUOI — chaque changement s'enregistre aussitôt ; après chaque écriture, le bilan est relu
 *            en entier, pour que l'écran montre toujours ce que la base contient.
 * ATTENTION — se recharge quand la clé des recettes change (déverrouillage, réinitialisation).
 *            Patron de chargement de .claude/rules/v2.md. Les écritures passent une par une
 *            (lib/write-queue.ts) : un clic pendant un enregistrement attend son tour au lieu de se
 *            perdre. Une écriture qui échoue laisse le bilan tel que la base le garde, le dit
 *            (writeError), et `failures` change pour que les champs reprennent la valeur gardée.
 */
import { useEffect, useState } from 'react'
import { RevenueKeyError, useRevenueKey } from '@/lib/revenue-key'
import { createWriteQueue } from '@/lib/write-queue'
import { addTag, removeTag } from '@/lib/report-writes'
import type { SecretRevenue } from '@/lib/cipher'
import type { LedgerCategory } from '@/types/database'
import { loadReport, type ReportDetail, type ReportEntry } from './loadReport'
import * as write from './reportActions'

export type { ReportDetail, ReportEntry }

export interface ReportActions {
  addLine: (category: LedgerCategory, amount: number) => void
  setAmount: (entry: ReportEntry, amount: number) => void
  removeLine: (entry: ReportEntry) => void
  /** Chiffre Carte et Espèces à la place des recettes saisies ; `key` vient de useRevenueKey. */
  sealRevenue: (key: CryptoKey, revenue: SecretRevenue) => void
  /** Change Carte ou Espèces d'une date déjà chiffrée, l'autre restant tel que la base le garde. */
  resealPart: (key: CryptoKey, part: keyof SecretRevenue, amount: number) => void
  addTag: (field: 'wins' | 'improvements', raw: string) => void
  removeTag: (field: 'wins' | 'improvements', tag: string) => void
  setNote: (note: string) => void
  addPhoto: (file: File) => void
  removePhoto: (path: string) => void
  clear: () => void
}

interface ReportState {
  status: 'loading' | 'ready' | 'error' | 'missing'
  detail: ReportDetail | null
  /** Pour qui ce bilan a été chargé : une écriture ne part jamais vers une autre enseigne. */
  owner: string | null
}

const LOADING: ReportState = { status: 'loading', detail: null, owner: null }

export function useReport(eventId: string | undefined, actorId: string | null | undefined) {
  const { key, status, verify } = useRevenueKey()
  const [state, setState] = useState<ReportState>(LOADING)
  const [version, setVersion] = useState(0)
  const [enqueue] = useState(createWriteQueue)
  const [pending, setPending] = useState(0)
  const [failures, setFailures] = useState(0)
  const [writeError, setWriteError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId || !actorId) return
    let cancelled = false

    async function run(currentEvent: string, currentActor: string) {
      const owner = `${currentActor}/${currentEvent}`
      // Une autre date ou une autre enseigne : on n'affiche plus l'ancien bilan pendant la lecture.
      // Après une écriture, en revanche, le bilan reste affiché le temps d'être relu.
      setState((s) => (s.owner === owner ? s : LOADING))
      try {
        const detail = await loadReport(currentEvent, currentActor, key)
        if (cancelled) return
        setState(
          detail ? { status: 'ready', detail, owner } : { status: 'missing', detail: null, owner },
        )
      } catch {
        if (cancelled) return
        setState({ status: 'error', detail: null, owner })
      }
    }

    void run(eventId, actorId)
    return () => {
      cancelled = true
    }
  }, [eventId, actorId, version, key, status])

  /** Met une écriture dans la file, puis relit le bilan, qu'elle ait réussi ou non. */
  function perform(failure: string, action: (target: write.Target) => Promise<void>) {
    const detail = state.detail
    if (!eventId || !actorId || !detail) return
    if (state.owner !== `${actorId}/${eventId}`) return
    const target = { actorId, eventId, detail }
    setPending((n) => n + 1)
    setWriteError(null)
    enqueue(() => action(target))
      .catch((reason: unknown) => {
        setWriteError(reason instanceof RevenueKeyError ? reason.message : failure)
        setFailures((n) => n + 1)
      })
      .finally(() => {
        setPending((n) => n - 1)
        setVersion((v) => v + 1)
      })
  }

  const actions: ReportActions = {
    addLine: (category, amount) => {
      perform('La ligne n’a pas pu être ajoutée.', (t) => write.addLine(t, category, amount))
    },
    setAmount: (entry, amount) => {
      perform('Le montant n’a pas pu être enregistré.', (t) => write.setAmount(t, entry, amount))
    },
    removeLine: (entry) => {
      perform('La ligne n’a pas pu être retirée.', (t) => write.removeLine(t, entry))
    },
    sealRevenue: (key, revenue) => {
      perform('Les recettes n’ont pas pu être chiffrées.', (t) =>
        verify(key).then(() => write.sealRevenueLines(t, key, revenue)),
      )
    },
    resealPart: (key, part, amount) => {
      perform('Les recettes n’ont pas pu être chiffrées.', (t) =>
        verify(key).then(() => write.resealPart(t, key, part, amount)),
      )
    },
    addTag: (field, raw) => {
      perform('L’étiquette n’a pas pu être ajoutée.', (t) =>
        write.changeTags(t, field, (tags) => addTag(tags, raw)),
      )
    },
    removeTag: (field, tag) => {
      perform('L’étiquette n’a pas pu être retirée.', (t) =>
        write.changeTags(t, field, (tags) => removeTag(tags, tag)),
      )
    },
    setNote: (note) => {
      perform('La note n’a pas pu être enregistrée.', (t) => write.setNote(t, note))
    },
    addPhoto: (file) => {
      perform('La photo n’a pas pu être ajoutée.', (t) => write.addPhoto(t, file))
    },
    removePhoto: (path) => {
      perform('La photo n’a pas pu être retirée.', (t) => write.removePhoto(t, path))
    },
    clear: () => {
      perform('Le bilan n’a pas pu être effacé.', (t) => write.clearReport(t))
    },
  }

  return { ...state, saving: pending > 0, failures, writeError, actions }
}
