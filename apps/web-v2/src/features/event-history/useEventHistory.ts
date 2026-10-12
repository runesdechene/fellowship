/**
 * QUOI     — l'histoire d'une fiche : ses versions, de la plus récente à l'origine, chacune avec son
 *            auteur, sa date, son mot et la phrase de ce qu'elle a changé.
 * POURQUOI — lot 10c : la page « L'histoire de la fiche » et la ligne « Tenu à jour » de la fiche
 *            lisent la même chose.
 * ATTENTION — une fiche jamais modifiée a une seule ligne d'origine, sans id (pas de page de
 *            version). Le type généré de la fonction dit tout « non nul » : il ment pour l'id et
 *            l'auteur, d'où `HistoryRow`.
 */
import { useEffect, useState } from 'react'
import { authorName, versionSentence } from '@/lib/event-history'
import { must, supabase } from '@/lib/supabase'

/** Une ligne telle que la base la rend vraiment. */
interface HistoryRow {
  id: number | null
  created_at: string
  author_name: string | null
  author_brand: string | null
  author_avatar: string | null
  note: string | null
  changed: string[]
  is_origin: boolean
}

export interface HistoryEntry {
  id: number | null
  createdAt: Date
  /** « Lina de L'Atelier Sauvage » */
  author: string
  /** « Lina » — pour la ligne « modifié par Lina ». */
  firstName: string
  avatarUrl: string | null
  note: string | null
  sentence: string
  isOrigin: boolean
}

export function toEntry(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    author: authorName(row.author_name, row.author_brand),
    firstName: row.author_name ?? 'un compte supprimé',
    avatarUrl: row.author_avatar,
    note: row.note,
    sentence: versionSentence(row.changed, row.is_origin),
    isOrigin: row.is_origin,
  }
}

interface History {
  entries: HistoryEntry[]
  eventName: string
}

async function loadHistory(eventId: string): Promise<History> {
  const rows: HistoryRow[] = must(await supabase.rpc('histoire_evenement', { p_event: eventId }))
  const response = await supabase.from('events').select('name').eq('id', eventId).maybeSingle()
  const event = must(response)
  return { entries: rows.map(toEntry), eventName: event?.name ?? '' }
}

export function useEventHistory(eventId: string) {
  const [history, setHistory] = useState<History | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const result = await loadHistory(eventId)
        if (cancelled) return
        setHistory(result)
      } catch (failure) {
        if (cancelled) return
        setError(failure instanceof Error ? failure.message : 'L’histoire n’a pas pu être lue.')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [eventId])

  return {
    entries: history?.entries ?? [],
    eventName: history?.eventName ?? '',
    loading: history === null && error === null,
    error,
  }
}
