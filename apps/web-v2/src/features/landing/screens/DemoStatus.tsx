/**
 * QUOI     — le statut d'une date dans les écrans de la landing : inscrit, dossier envoyé ou
 *            intéressé, dit par la forme comme dans l'app.
 * POURQUOI — décision du 07/10/2026 : les statuts se lisent par la forme (coche, cercle à moitié
 *            plein, cercle en pointillés).
 * ATTENTION — ce statut est celui de l'exposant de démonstration (lib/landing-demo.ts).
 */
import { Check, CircleDashed, CircleDot } from 'lucide-react'
import type { DemoStatus as Status } from '@/lib/landing-demo'

const LABEL: Record<Status, string> = {
  inscrit: 'Inscrit',
  envoye: 'Dossier envoyé',
  interesse: 'Intéressé',
}

export function DemoStatus({ status }: { status: Status }) {
  const Icon = status === 'inscrit' ? Check : status === 'envoye' ? CircleDot : CircleDashed
  return (
    <span className={`landing-status landing-status--${status}`}>
      <Icon size={13} strokeWidth={2.2} aria-hidden />
      {LABEL[status]}
    </span>
  )
}
