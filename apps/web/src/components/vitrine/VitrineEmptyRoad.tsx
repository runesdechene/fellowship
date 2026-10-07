import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

/** État vide du carnet : affiché quand l'entité n'a aucune escale (ni à venir ni passée). */
export function VitrineEmptyRoad({ canEdit }: { canEdit: boolean }) {
  return (
    <section className="v-sec">
      <div className="v-empty">
        <div className="v-empty-ic"><Compass /></div>
        <b className="v-empty-t">La route commence ici</b>
        <p className="v-empty-p">
          {canEdit
            ? "Aucune escale pour l'instant. Trouve ton premier festival et il apparaîtra sur ton carnet de route."
            : "Aucune date publiée pour l'instant."}
        </p>
        {canEdit && (
          <Link to="/explorer" className="v-btn v-btn-p v-empty-cta">Participe à ton premier événement</Link>
        )}
      </div>
    </section>
  )
}
