/**
 * QUOI     — la ligne « Tenu à jour par les exposants · modifié par Lina, il y a 3 jours », qui
 *            ouvre l'histoire de la fiche ; et la pastille « + Ajouter » d'une info manquante.
 * POURQUOI — maquette 2256:2 (lot 10c) : la fiche est partagée ; on voit qu'elle vit, par qui, et
 *            ce qu'il lui manque.
 */
import { History, Plus } from 'lucide-react'
import { useEventHistory } from '@/features/event-history/useEventHistory'
import { versionWhen } from '@/lib/event-history'
import { useTransitionNavigate } from '@/lib/navigation'
import { eventPath } from '@/lib/event-path'
import { useEventKey } from './useEventKey'

export function KeptUpToDate({ eventId }: { eventId: string }) {
  const go = useTransitionNavigate()
  const { slug } = useEventKey()
  const { entries } = useEventHistory(eventId)
  const latest = entries[0]
  if (!latest) return null
  return (
    <button type="button" className="kept-up" onClick={() => go(eventPath(slug, 'historique'))}>
      <History size={14} strokeWidth={1.8} />
      <span>
        Tenu à jour par les exposants · {latest.isOrigin ? 'ajouté' : 'modifié'} par{' '}
        <b>{latest.firstName}</b>, {versionWhen(latest.createdAt, new Date())}
      </span>
    </button>
  )
}

export function AddMissing({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="add-missing" onClick={onClick}>
      <Plus size={12} strokeWidth={2} />
      Ajouter
    </button>
  )
}
