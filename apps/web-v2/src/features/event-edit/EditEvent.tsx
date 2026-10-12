/**
 * QUOI     — la page « Modifier l'événement » (`/evenement/:id/modifier`) : « Annuler » et
 *            « Enregistrer les modifications » en haut, les sections du formulaire, l'aperçu à droite.
 * POURQUOI — maquette 2117:2 (lot 10c) : une fiche publique se modifie par tout compte connecté, une
 *            privée par son créateur ; chaque enregistrement entre dans l'histoire de la fiche.
 * ATTENTION — `?champ=<champ>` (depuis « + Ajouter » sur la fiche) encadre le champ qui manquait.
 */
import { ChevronLeft } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useTags } from '@/features/event-create/useTags'
import { MISSING_LABELS, type MissingField } from '@/lib/event-edit'
import { useTransitionNavigate } from '@/lib/navigation'
import { EditPreview } from './EditPreview'
import { EditSections } from './EditSections'
import { useEditEvent } from './useEditEvent'

const isMissingField = (value: string | null): value is MissingField =>
  value !== null && value in MISSING_LABELS

export function EditEvent() {
  const { id = '' } = useParams<{ id: string }>()
  const [search] = useSearchParams()
  const champ = search.get('champ')
  const highlight = isMissingField(champ) ? champ : null
  const navigate = useNavigate()
  const go = useTransitionNavigate()
  const edit = useEditEvent(id)
  const tags = useTags()
  const { event, draft, poster } = edit

  // Une nouvelle affiche se montre depuis le navigateur, avant d'être envoyée.
  const newPosterUrl = useMemo(
    () => (poster instanceof File ? URL.createObjectURL(poster) : null),
    [poster],
  )
  useEffect(() => {
    return () => {
      if (newPosterUrl) URL.revokeObjectURL(newPosterUrl)
    }
  }, [newPosterUrl])
  const posterUrl = poster === 'removed' ? null : (newPosterUrl ?? event?.image_url ?? null)
  const posterName =
    poster instanceof File ? poster.name : posterUrl ? (posterUrl.split('/').pop() ?? null) : null

  const back = () => {
    const fromApp = (window.history.state as { idx?: number } | null)?.idx
    if (fromApp && fromApp > 0) void navigate(-1)
    else go(`/evenement/${id}`)
  }

  if (edit.loading) return <div className="edit-event" />
  if (!event || !draft) {
    return (
      <div className="edit-event">
        <p className="edit-event__state">{edit.error ?? 'Cette fiche n’existe plus.'}</p>
      </div>
    )
  }
  if (!edit.canEdit) {
    return (
      <div className="edit-event">
        <p className="edit-event__state">Seul son créateur modifie une fiche privée.</p>
        <button type="button" className="edit-event__back" onClick={() => go(`/evenement/${id}`)}>
          <ChevronLeft size={14} strokeWidth={2} />
          {event.name}
        </button>
      </div>
    )
  }

  return (
    <div className="edit-event">
      <div className="edit-event__bar">
        {edit.error && <p className="edit-event__error">{edit.error}</p>}
        <Button onClick={back}>Annuler</Button>
        <Button
          variant="action"
          disabled={edit.saving}
          onClick={() => {
            void edit.save().then((saved) => {
              if (saved) go(`/evenement/${id}`)
            })
          }}
        >
          {edit.saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </Button>
      </div>

      <div className="edit-event__body">
        <div className="edit-event__form">
          <header className="edit-event__head">
            <button
              type="button"
              className="edit-event__back"
              onClick={() => go(`/evenement/${id}`)}
            >
              <ChevronLeft size={14} strokeWidth={2} />
              {event.name}
            </button>
            <h1 className="edit-event__title">Modifier l’événement</h1>
            <p className="edit-event__kept">Tenu à jour par les exposants</p>
          </header>
          <EditSections
            draft={draft}
            update={edit.update}
            patch={edit.patch}
            toggleTag={edit.toggleTag}
            tags={tags}
            posterUrl={posterUrl}
            posterName={posterName}
            setPoster={edit.setPoster}
            note={edit.note}
            setNote={edit.setNote}
            highlight={highlight}
          />
        </div>
        <EditPreview draft={draft} posterUrl={posterUrl} highlight={highlight} />
      </div>
    </div>
  )
}
