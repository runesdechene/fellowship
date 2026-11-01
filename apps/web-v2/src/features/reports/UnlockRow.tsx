/**
 * QUOI     — sous des recettes chiffrées et verrouillées, le bouton « Afficher mes recettes » qui
 *            ouvre la fenêtre du code ou de la phrase (UnlockDialog).
 * POURQUOI — maquette 2566:524 / 2574:518 pour la place ; les champs eux-mêmes sont passés dans une
 *            fenêtre (Uriel, 01/11/2026 : posés dans le registre, ils faisaient amateur).
 */
import { Eye } from 'lucide-react'

export function UnlockRow({ onAsk }: { onAsk: () => void }) {
  return (
    <div className="report-secret__unlock">
      <button type="button" className="ledger__submit" onClick={onAsk}>
        <Eye size={14} strokeWidth={2} />
        Afficher mes recettes
      </button>
    </div>
  )
}
