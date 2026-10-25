/**
 * QUOI     — les questions affichées de la FAQ de la landing, dans l'ordre choisi en admin.
 * POURQUOI — Uriel, 25/10/2026 : la FAQ s'édite depuis /admin/faq (table faq_questions), lue
 *            sans compte (seules les affichées), comme les témoignages.
 * ATTENTION — une lecture ratée rend une liste vide : la FAQ se cache, jamais d'erreur affichée.
 */
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface FaqEntry {
  id: string
  question: string
  answer: string
}

async function loadFaq(): Promise<FaqEntry[]> {
  const rows = await supabase
    .from('faq_questions')
    .select('id, question, answer')
    .eq('visible', true)
    .order('position')
    .order('created_at')
  return rows.error ? [] : rows.data
}

export function useFaq(): FaqEntry[] {
  const [questions, setQuestions] = useState<FaqEntry[]>([])

  useEffect(() => {
    let cancelled = false
    async function run() {
      const next = await loadFaq().catch(() => [])
      if (!cancelled) setQuestions(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return questions
}
