import { useState } from 'react'
import { Flag } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { canReport, type ReportTargetType } from '@/lib/content-reports'
import { ReportContentModal } from './ReportContentModal'

interface Props {
  targetType: ReportTargetType
  targetId: string
  targetLabel: string
  /** ID de l'acteur propriétaire (event.created_by_actor ou profile.id) — masque le bouton si match. */
  targetOwnerId: string | null
  className?: string
  title?: string
}

/**
 * Bouton icône « Signaler ». Caché si :
 *   - user pas connecté (RLS bloquerait l'insert anyway)
 *   - user est lui-même propriétaire du target (auto-signalement = no sense)
 */
export function ReportButton({ targetType, targetId, targetLabel, targetOwnerId, className, title }: Props) {
  const { currentActor } = useAuth()
  const [open, setOpen] = useState(false)

  if (!canReport(currentActor ? { id: currentActor.id } : null, { type: targetType, ownerId: targetOwnerId })) {
    return null
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        title={title ?? 'Signaler'}
        aria-label={title ?? 'Signaler'}
      >
        <Flag strokeWidth={1.8} />
      </button>
      {open && (
        <ReportContentModal
          targetType={targetType}
          targetId={targetId}
          targetLabel={targetLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
