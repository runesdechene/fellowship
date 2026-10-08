/**
 * QUOI     — les photos souvenir d'un bilan : la grille, un bouton pour retirer chacune, une case
 *            pour en ajouter.
 * POURQUOI — revoir son stand d'une année sur l'autre. Les photos sont privées : bucket fermé,
 *            adresses signées (lib/report-media.ts).
 */
import { Plus, X } from 'lucide-react'
import { useId } from 'react'

interface ReportPhotosProps {
  photos: { path: string; url: string }[]
  onAdd: (file: File) => void
  onRemove: (path: string) => void
}

export function ReportPhotos({ photos, onAdd, onRemove }: ReportPhotosProps) {
  const inputId = useId()

  return (
    <section className="report-block">
      <h2 className="report-block__title">
        Photos souvenir <span className="report-block__hint">privées</span>
      </h2>
      <div className="report-photos">
        {photos.map((photo) => (
          <div key={photo.path} className="report-photos__item">
            <img className="report-photos__image" src={photo.url} alt="" />
            <button
              type="button"
              className="report-photos__remove"
              aria-label="Retirer la photo"
              onClick={() => {
                onRemove(photo.path)
              }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
        <label className="report-photos__add" htmlFor={inputId}>
          <Plus size={18} strokeWidth={1.5} />
          Ajouter
          <input
            id={inputId}
            className="report-photos__input"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onAdd(file)
              event.target.value = ''
            }}
          />
        </label>
      </div>
    </section>
  )
}
