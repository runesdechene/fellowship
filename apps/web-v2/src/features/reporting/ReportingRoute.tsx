/**
 * QUOI     — la garde de la zone Reporting : l'enseigne active doit avoir le reporting ; la page
 *            reçoit son identifiant, dans le cadre de l'administration.
 * POURQUOI — elle ne protège que l'affichage ; la base ne rend rien à qui n'est pas membre.
 */
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useReportingAccess } from './useReportingAccess'

export function ReportingRoute({ page }: { page: (entityId: string) => ReactNode }) {
  const { actor } = useAuth()
  const access = useReportingAccess()
  if (!actor || !access) return null
  if (!access.has(actor.id)) return <Navigate to="/" replace />
  return <div className="admin-content">{page(actor.id)}</div>
}
