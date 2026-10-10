/**
 * QUOI     — le statut d'une date sur sa fiche, en contrôle segmenté (Intéressé · Dossier envoyé ·
 *            Inscrit). L'objectif de chiffre d'affaires a quitté la fiche : il se fixe dans le
 *            bilan, après le festival (Uriel, 11/10/2026).
 * POURQUOI — toutes les étapes visibles d'un coup, celle qui vaut en relief ; « Inscrit » porte le
 *            vert de validation (Uriel, 11/10/2026).
 * ATTENTION — recliquer l'étape choisie retire la date : la ligne de participation est supprimée.
 *            « Refusé » ne se choisit pas mais s'affiche s'il est en base. Rien ne se verrouille
 *            après la date (piège du 19/08/2026). En gratuit, une date au-delà des 6 mois ne se
 *            pose pas (`locked`) : le choix ouvre l'invitation Pro ; une date déjà posée, elle,
 *            reste toujours modifiable (lib/plan.ts).
 */
import { Check, Clock, Star } from 'lucide-react'
import { useState } from 'react'
import { ProBubble } from '@/components/ui/ProBubble'
import { Segmented, type SegmentedOption } from '@/components/ui/Segmented'
import type { ParticipationStatus } from '@/types/database'

type ChosenStatus = 'interesse' | 'en_cours' | 'inscrit'

const STEPS: SegmentedOption<ChosenStatus>[] = [
  { value: 'interesse', label: 'Intéressé', Icon: Star },
  { value: 'en_cours', label: 'Dossier envoyé', Icon: Clock },
  { value: 'inscrit', label: 'Inscrit', Icon: Check, validated: true },
]

function chosen(status: ParticipationStatus | null): ChosenStatus | null {
  if (status === 'confirme') return 'inscrit'
  if (status === 'refuse') return null
  return status
}

interface EventStatusProps {
  status: ParticipationStatus | null
  setStatus: (next: ParticipationStatus | null) => Promise<void>
  saving: boolean
  writeError: string | null
  /** En gratuit, au-delà des 6 mois : on ne pose pas la date, on invite au Pro. */
  locked: boolean
  monthsAway: number
}

export function EventStatus({
  status,
  setStatus,
  saving,
  writeError,
  locked,
  monthsAway,
}: EventStatusProps) {
  const [inviting, setInviting] = useState(false)

  return (
    <section className="event-page__block">
      <h2 className="event-page__block-title">Statut</h2>
      <Segmented
        label="Ma participation à cette date"
        options={STEPS}
        value={chosen(status)}
        disabled={saving}
        onChange={(next) => {
          if (locked) setInviting(true)
          else void setStatus(next)
        }}
        onClear={() => void setStatus(null)}
      />
      {inviting && (
        <ProBubble
          className="event-status__bubble"
          title={`Ce festival est dans ${monthsAway} mois`}
          text="En gratuit, tu planifies tes 6 prochains mois. Le Pro t’ouvre toute ton année."
          onClose={() => {
            setInviting(false)
          }}
        />
      )}

      {status === 'refuse' && (
        <p className="event-status__note">Ton dossier a été refusé pour cette date.</p>
      )}

      {/* L'écriture a échoué et l'affichage est déjà revenu en arrière : sans
          ce mot, la valeur qui saute passerait pour un bug. */}
      {writeError && <p className="event-status__error">{writeError}</p>}
    </section>
  )
}
