/**
 * QUOI     — charge l'aperçu du récap d'un mois : destinataire, date d'envoi, objet, texte et pièces
 *            jointes, par la fonction `reporting-recap`.
 * POURQUOI — l'aperçu est fabriqué par le même code que l'e-mail du 11 : ce qu'on lit ici est ce qui
 *            part. Rien n'est recalculé dans l'écran.
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface Recap {
  destinataire: string | null
  envoiLe: string // AAAA-MM-JJ
  sujet: string
  texte: string
  pieces: { nom: string; csv: string }[]
  note: string | null
  actif: boolean
  environnement: 'sandbox' | 'production'
}

/** Prépare le récap ; avec une note, l'enregistre d'abord (vide : l'efface). */
async function loadRecap(entityId: string, month: string, note?: string): Promise<Recap> {
  const response = await supabase.functions.invoke<Recap>('reporting-recap', {
    body: { entite: entityId, mois: month, note },
  })
  if (response.error || !response.data) throw new Error('Le récap n’a pas pu être préparé.')
  return response.data
}

export function useRecap(entityId: string, month: string) {
  const [state, setState] = useState<{ recap: Recap | null; error: string | null }>({
    recap: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const recap = await loadRecap(entityId, month)
        if (cancelled) return
        setState({ recap, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          recap: null,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [entityId, month])

  /** Enregistre la précision du mois et rend le récap qui en tient compte. Rend le message d'échec, ou null. */
  const saveNote = useCallback(
    async (note: string) => {
      try {
        setState({ recap: await loadRecap(entityId, month, note), error: null })
        return null
      } catch {
        return 'La précision n’a pas été enregistrée. Réessaie.'
      }
    },
    [entityId, month],
  )

  return { ...state, saveNote }
}
