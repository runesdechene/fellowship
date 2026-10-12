/**
 * QUOI     — les sections du formulaire de modification : L'événement, Où et quand, Catégories,
 *            Affiche, Pour candidater, À propos, et le mot sur la modification.
 * POURQUOI — maquette 2117:2 (lot 10c) : les champs de la création, rangés en sections ; les champs
 *            du lieu et de la candidature sont ceux de la création (un seul composant).
 */
import { Field, Input, Textarea } from '@/components/ui/Field'
import { ApplyFields } from '@/features/event-create/ApplyFields'
import { MissingHighlight } from '@/features/event-create/MissingHighlight'
import { PlaceFields } from '@/features/event-create/PlaceFields'
import type { EventDraft, UpdateFn } from '@/features/event-create/useEventDraft'
import type { MissingField } from '@/lib/event-edit'
import { TagPicker } from './TagPicker'
import type { PosterChoice } from './useEditEvent'

interface EditSectionsProps {
  draft: EventDraft
  update: UpdateFn
  patch: (fields: Partial<EventDraft>) => void
  toggleTag: (tag: string) => void
  tags: string[]
  posterUrl: string | null
  posterName: string | null
  setPoster: (poster: PosterChoice) => void
  note: string
  setNote: (note: string) => void
  highlight: MissingField | null
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="edit-section">
      <h2 className="edit-section__title">{title}</h2>
      <div className="fields">{children}</div>
    </section>
  )
}

export function EditSections(props: EditSectionsProps) {
  const { draft, update, patch, toggleTag, tags, posterUrl, posterName, setPoster } = props
  const { note, setNote, highlight } = props

  return (
    <>
      <Section title="L’événement">
        <Field label="Nom" required>
          <Input value={draft.name} onChange={(event) => update('name', event.target.value)} />
        </Field>
      </Section>

      <Section title="Où et quand">
        <PlaceFields draft={draft} update={update} patch={patch} />
      </Section>

      <Section title="Catégories">
        <TagPicker chosen={draft.tags} all={tags} onToggle={toggleTag} />
      </Section>

      <Section title="Affiche">
        <div className="edit-poster">
          {posterUrl && <img className="edit-poster__thumb" src={posterUrl} alt="" />}
          <div className="edit-poster__side">
            {posterName && <p className="edit-poster__name">{posterName}</p>}
            <div className="edit-poster__actions">
              <label className="edit-poster__button">
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) setPoster(file)
                    event.target.value = ''
                  }}
                />
                {posterUrl ? 'Remplacer' : 'Choisir une image'}
              </label>
              {posterUrl && (
                <button
                  type="button"
                  className="edit-poster__button"
                  onClick={() => setPoster('removed')}
                >
                  Retirer
                </button>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Pour candidater">
        <ApplyFields draft={draft} update={update} highlight={highlight} />
      </Section>

      <Section title="À propos">
        <MissingHighlight on={highlight === 'description'}>
          <Field label="Description">
            <Textarea
              value={draft.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Ce qu'un exposant a besoin de savoir avant de candidater…"
            />
          </Field>
        </MissingHighlight>
      </Section>

      <div className="edit-note">
        <Field label="Un mot sur ta modification">
          <Input
            value={note}
            maxLength={140}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ex : « Trouvé sur leur site, section exposants »"
          />
        </Field>
        <p className="edit-note__hint">
          Facultatif. Il s’affiche dans l’histoire de la fiche, à côté de ton nom.
        </p>
      </div>
    </>
  )
}
