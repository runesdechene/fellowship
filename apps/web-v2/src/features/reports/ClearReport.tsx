/**
 * QUOI     — « Supprimer ce bilan », en deux temps sur place : le lien, puis « Confirmer la
 *            suppression » et « Annuler ».
 * POURQUOI — jamais de boîte de dialogue du navigateur ; la confirmation reste là où l'on clique.
 * ATTENTION — efface ce que le bilan a ajouté, pas le prix de la place de Mon dossier
 *            (lib/report-writes.ts, clearReportPlan).
 */
import { useState } from 'react'

export function ClearReport({ onClear }: { onClear: () => void }) {
  const [asking, setAsking] = useState(false)

  if (!asking) {
    return (
      <button
        type="button"
        className="clear-report"
        onClick={() => {
          setAsking(true)
        }}
      >
        Supprimer ce bilan
      </button>
    )
  }

  return (
    <div className="clear-report clear-report--asking">
      <span>Effacer les lignes, les étiquettes, la note et les photos ?</span>
      <span className="clear-report__choices">
        <button
          type="button"
          className="clear-report__confirm"
          onClick={() => {
            setAsking(false)
            onClear()
          }}
        >
          Confirmer la suppression
        </button>
        <button
          type="button"
          className="clear-report__cancel"
          onClick={() => {
            setAsking(false)
          }}
        >
          Annuler
        </button>
      </span>
    </div>
  )
}
