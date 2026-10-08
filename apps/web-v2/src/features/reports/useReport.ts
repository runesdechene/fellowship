/**
 * QUOI     — le bilan d'une date pour l'acteur actif : son chargement et ses écritures.
 * POURQUOI — chaque changement s'enregistre aussitôt ; après chaque écriture, le bilan est relu
 *            en entier, pour que l'écran montre toujours ce que la base contient.
 * ATTENTION — patron de chargement de .claude/rules/v2.md. Une écriture qui échoue laisse le
 *            bilan tel que la base le garde, et le dit (writeError).
 */
import { useEffect, useState } from 'react'
import type { LedgerCategory } from '@/types/database'
import { loadReport, type ReportDetail, type ReportEntry } from './loadReport'
import * as write from './reportActions'

export type { ReportDetail, ReportEntry }

export interface ReportActions {
  addLine: (category: LedgerCategory, amount: number) => void
  setAmount: (entry: ReportEntry, amount: number) => void
  removeLine: (entry: ReportEntry) => void
  setTags: (field: 'wins' | 'improvements', tags: string[]) => void
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
  const [state, setState] = useState<ReportState>(LOADING)
  const [version, setVersion] = useState(0)
  const [saving, setSaving] = useState(false)
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
        const detail = await loadReport(currentEvent, currentActor)
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
  }, [eventId, actorId, version])

  /** Lance une écriture, puis relit le bilan, qu'elle ait réussi ou non. */
  function perform(
    failure: string,
    action: (target: Parameters<typeof write.addLine>[0]) => Promise<void>,
  ) {
    const detail = state.detail
    if (!eventId || !actorId || !detail || saving) return
    if (state.owner !== `${actorId}/${eventId}`) return
    setSaving(true)
    setWriteError(null)
    action({ actorId, eventId, detail })
      .catch(() => {
        setWriteError(failure)
      })
      .finally(() => {
        setSaving(false)
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
    setTags: (field, tags) => {
      perform('Ce changement n’a pas pu être enregistré.', (t) =>
        write.updateReport(t, field === 'wins' ? { wins: tags } : { improvements: tags }),
      )
    },
    setNote: (note) => {
      perform('La note n’a pas pu être enregistrée.', (t) =>
        write.updateReport(t, { note: note.trim() === '' ? null : note }),
      )
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

  return { ...state, saving, writeError, actions }
}
