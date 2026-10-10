/**
 * QUOI     — l'objectif de chiffre d'affaires d'un bilan : le fixer, le modifier, et le comparer
 *            au réalisé (jauge, « 83 % », « objectif dépassé »).
 * POURQUOI — Uriel, 11/10/2026 : l'objectif se fixe APRÈS le festival, dans son bilan —
 *            contre-intuitif, mais c'est ainsi que travaillent les artisans. Il a quitté la fiche.
 * ATTENTION — il vit dans le dossier de la date (participation_dossiers.revenue_goal), lu et écrit
 *            par useDossier : la fiche et le bilan parlent du même chiffre.
 */
import { ArrowRight, Target } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { DraftInput } from '@/components/ui/DraftInput'
import { formatEuros, goalShare, parseAmount } from '@/lib/money'

interface ReportGoalProps {
  goal: number | null
  revenue: number
  onSave: (goal: number | null) => void
}

export function ReportGoal({ goal, revenue, onSave }: ReportGoalProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <label className="report-summary__goal report-summary__goal--editing">
        <span className="report-summary__goal-title">
          <Target size={13} strokeWidth={2} />
          Objectif
        </span>
        <DraftInput
          className="report-summary__goal-input"
          label="Objectif de chiffre d’affaires en euros"
          inputMode="decimal"
          placeholder="0 €"
          autoFocus
          value={goal === null ? '' : formatEuros(goal)}
          onSave={(draft) => {
            const amount = parseAmount(draft)
            if (amount !== 'invalide') onSave(amount)
            setEditing(false)
          }}
        />
      </label>
    )
  }

  const share = goal ? goalShare(revenue, goal) : null
  if (goal === null || !share) {
    return (
      <button
        type="button"
        className="report-summary__goal-set"
        onClick={() => {
          setEditing(true)
        }}
      >
        <Target size={13} strokeWidth={2} />
        Fixer un objectif de chiffre d’affaires
        <ArrowRight size={13} strokeWidth={2} />
      </button>
    )
  }

  return (
    <div className="report-summary__goal">
      <span className="report-summary__goal-head">
        <button
          type="button"
          className="report-summary__goal-title report-summary__goal-edit"
          onClick={() => {
            setEditing(true)
          }}
          aria-label={`Modifier l’objectif de ${formatEuros(goal)}`}
        >
          <Target size={13} strokeWidth={2} />
          Objectif {formatEuros(goal)}
        </button>
        <span>{share.percent >= 100 ? `+${share.percent - 100} %` : `${share.percent} %`}</span>
      </span>
      <span
        className="report-summary__gauge"
        style={{ '--gauge': String(share.ratio) } as CSSProperties}
      />
      <span className="report-summary__goal-note">
        Réalisé {formatEuros(revenue)}
        {share.percent >= 100 ? ' — objectif dépassé' : ` sur ${formatEuros(goal)}`}
      </span>
    </div>
  )
}
