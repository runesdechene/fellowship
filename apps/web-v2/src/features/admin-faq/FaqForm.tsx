/**
 * QUOI     — ajouter ou corriger une question de la FAQ : ordre, question, réponse, affichée ou
 *            masquée sur la landing.
 * POURQUOI — maquette 2552:233 : le formulaire des Mises à jour, ses styles compris
 *            (admin-updates.css). Rien à déployer : la landing relit la table.
 * ATTENTION — le bouton se fige pendant l'envoi : jamais deux questions d'un clic.
 */
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { addQuestion, saveQuestion, type FaqDraft, type FaqQuestion } from './useAdminFaq'

const PLACES: { visible: boolean; title: string; detail: string }[] = [
  {
    visible: false,
    title: 'Masquée',
    detail: 'Elle reste ici, prête, sans paraître sur la landing.',
  },
  { visible: true, title: 'Affichée', detail: 'Elle apparaît dans la FAQ, à sa place.' },
]

interface Props {
  editing: FaqQuestion | null
  /** L'ordre proposé pour une nouvelle question : à la suite des autres. */
  nextPosition: number
  onDone: () => void
}

export function FaqForm({ editing, nextPosition, onDone }: Props) {
  const [draft, setDraft] = useState<FaqDraft>(
    editing ?? { question: '', answer: '', position: nextPosition, visible: true },
  )
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const ready = draft.question.trim() && draft.answer.trim()
  const set = (fields: Partial<FaqDraft>) => setDraft((current) => ({ ...current, ...fields }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setProblem(null)
    try {
      if (editing) await saveQuestion(editing.id, draft)
      else await addQuestion(draft)
      onDone()
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'L’enregistrement n’a pas abouti.')
    }
    setBusy(false)
  }

  return (
    <form className="admin-update-form" onSubmit={(event) => void submit(event)}>
      <h2 className="admin-update-form__title">
        {editing ? 'Corriger la question' : 'Nouvelle question'}
      </h2>
      <div className="admin-update-form__row">
        <Field label="Ordre">
          <Input
            type="number"
            min={0}
            value={draft.position}
            onChange={(e) => set({ position: Number(e.target.value) })}
          />
        </Field>
        <Field label="Question" required>
          <Input
            value={draft.question}
            maxLength={200}
            onChange={(e) => set({ question: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Réponse" required>
        <Textarea
          rows={4}
          value={draft.answer}
          maxLength={2000}
          onChange={(e) => set({ answer: e.target.value })}
        />
      </Field>
      <fieldset className="admin-update-form__weights">
        <legend>Sur la landing</legend>
        {PLACES.map((place) => (
          <label key={place.title} className="admin-update-form__weight">
            <input
              type="radio"
              name="landing"
              checked={draft.visible === place.visible}
              onChange={() => set({ visible: place.visible })}
            />
            <span className="admin-update-form__weight-title">{place.title}</span>
            <span className="admin-update-form__weight-detail">{place.detail}</span>
          </label>
        ))}
      </fieldset>
      {problem && <p className="admin-page__error">{problem}</p>}
      <div className="admin-update-form__foot">
        <p className="admin-update-form__warning">
          Elle paraît sur la landing dès l’enregistrement, sans déploiement.
        </p>
        <Button type="submit" variant="action" disabled={!ready || busy}>
          {busy ? 'Un instant…' : editing ? 'Enregistrer' : 'Ajouter'}
        </Button>
      </div>
    </form>
  )
}
