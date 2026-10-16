/**
 * QUOI     — le bloc « Prospect d'origine » de la fiche d'une personne : comment et quand elle a été
 *            rapprochée de son prospect, sa source, son dernier contact (maquette 2344:2).
 * POURQUOI — on voit d'où vient un compte démarché (lot 3, les Prospects).
 * ATTENTION — rien ne s'affiche sans prospect relié ; jamais de genre déduit (« Rapprochement »,
 *            « contact le »), là où la maquette écrit « Rapprochée », « contactée ».
 */
import { Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AdminCard } from '@/components/ui/AdminCard'
import { formatDayMonthShort, formatFullDate, parseSqlDate } from '@/lib/dates'
import { must, supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Origin = Database['public']['Functions']['admin_prospect_de']['Returns'][number]

async function loadOrigin(userId: string): Promise<Origin | null> {
  const response = await supabase.rpc('admin_prospect_de', { p_user: userId })
  return must(response)[0] ?? null
}

export function ProspectOriginCard({ userId }: { userId: string }) {
  const [state, setState] = useState<{ origin: Origin | null; error: string | null }>({
    origin: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const origin = await loadOrigin(userId)
        if (cancelled) return
        setState({ origin, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          origin: null,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [userId])

  const { origin, error } = state
  if (!origin && !error) return null
  const meta = [
    origin?.source ? `Source : ${origin.source}` : null,
    origin?.contacted_on
      ? `contact le ${formatDayMonthShort(parseSqlDate(origin.contacted_on))}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <AdminCard title="Prospect d’origine" Icon={Link2} tone="bleu">
      {error && <p className="admin-page__error">{error}</p>}
      {origin && (
        <div className="prospect-origin">
          <p className="prospect-origin__line">
            Rapprochement {origin.linked_by === 'telephone' ? 'par téléphone' : 'par e-mail'}
            {origin.linked_at ? ` le ${formatFullDate(new Date(origin.linked_at))}` : ''}
          </p>
          {meta && <p className="prospect-origin__meta">{meta}</p>}
        </div>
      )}
    </AdminCard>
  )
}
