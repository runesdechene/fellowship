/**
 * QUOI     — l'administration de la FAQ : lit toutes les questions (masquées comprises), ajoute,
 *            corrige, supprime.
 * POURQUOI — table faq_questions (20261025140000) : la landing lit les affichées ; ici, un admin
 *            voit et écrit tout (RLS is_admin()).
 * ATTENTION — une erreur de la base s'affiche telle quelle : jamais une liste vide qui ment.
 */
import { useCallback, useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'

export interface FaqDraft {
  question: string
  answer: string
  position: number
  visible: boolean
}

export interface FaqQuestion extends FaqDraft {
  id: string
}

function clean(draft: FaqDraft): FaqDraft {
  return { ...draft, question: draft.question.trim(), answer: draft.answer.trim() }
}

export async function addQuestion(draft: FaqDraft): Promise<void> {
  const { error } = await supabase.from('faq_questions').insert(clean(draft))
  if (error) throw new Error(error.message)
}

export async function saveQuestion(id: string, draft: FaqDraft): Promise<void> {
  const { error } = await supabase.from('faq_questions').update(clean(draft)).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from('faq_questions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

async function loadQuestions(): Promise<FaqQuestion[]> {
  return must(
    await supabase
      .from('faq_questions')
      .select('id, question, answer, position, visible')
      .order('position')
      .order('created_at'),
  )
}

export function useAdminFaq() {
  const [state, setState] = useState<{ questions: FaqQuestion[] | null; error: string | null }>({
    questions: null,
    error: null,
  })
  const [round, setRound] = useState(0)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const questions = await loadQuestions()
        if (cancelled) return
        setState({ questions, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          questions: null,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [round])
  const reload = useCallback(() => setRound((r) => r + 1), [])
  return { ...state, reload }
}
