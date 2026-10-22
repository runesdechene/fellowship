/**
 * QUOI     — écrire ou corriger une mise à jour : version (préremplie avec la version servie),
 *            titre, texte, image, poids ; Aperçu et Publier.
 * POURQUOI — maquette 2373:65. Le poids décide de ce qui part : petite = notification et pastille ;
 *            grosse = en plus un e-mail à tous les exposants, annoncé avec leur nombre réel.
 * ATTENTION — en correction, le poids est figé et rien ne repart. Une grosse se confirme avant de
 *            partir, et le bouton se fige pendant l'envoi : jamais deux publications d'un clic.
 */
import { Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input, Textarea } from '@/components/ui/Field'
import type { UpdateWeight } from '@/lib/app-updates'
import { UpdateCard } from '@/features/updates/UpdateCard'
import {
  publishUpdate,
  saveUpdate,
  uploadUpdateImage,
  type PublishedUpdate,
  type UpdateDraft,
} from './useAdminUpdates'

const EMPTY: UpdateDraft = {
  version: __APP_VERSION__,
  title: '',
  body: '',
  imageUrl: null,
  weight: 'small',
}

const WEIGHTS: { key: UpdateWeight; title: string; detail: string }[] = [
  {
    key: 'small',
    title: 'Petite',
    detail: 'Notification sur les appareils et pastille sur la ligne de version.',
  },
  { key: 'big', title: 'Grosse', detail: 'La même chose, plus un e-mail à tous les exposants.' },
]

interface Props {
  editing: PublishedUpdate | null
  audience: number | null
  /** `notice` : ce qu'il faut savoir une fois la note publiée (un e-mail raté). */
  onDone: (notice?: string) => void
}

export function UpdateForm({ editing, audience, onDone }: Props) {
  const [draft, setDraft] = useState<UpdateDraft>(editing ?? EMPTY)
  const [preview, setPreview] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const ready = draft.version.trim() && draft.title.trim() && draft.body.trim()
  const set = (fields: Partial<UpdateDraft>) => setDraft((current) => ({ ...current, ...fields }))

  /** `action` rend ce qu'il faudra savoir une fois la note partie (ou null). */
  async function run(action: () => Promise<string | null>) {
    setBusy(true)
    setProblem(null)
    try {
      const result = await action()
      setConfirming(false)
      onDone(result ?? undefined)
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'L’enregistrement n’a pas abouti.')
    }
    setBusy(false)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!ready || busy) return
    if (editing)
      void run(async () => {
        await saveUpdate(editing.id, draft)
        return null
      })
    else if (draft.weight === 'big') setConfirming(true)
    else void run(async () => (await publishUpdate(draft)).mailProblem)
  }

  async function addImage(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setProblem(null)
    try {
      set({ imageUrl: await uploadUpdateImage(file) })
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'L’image n’est pas partie.')
    }
    setBusy(false)
  }

  const mailLine =
    audience === null
      ? 'Un e-mail partira à tous les exposants.'
      : `Un e-mail partira à ${String(audience)} exposants.`

  return (
    <form className="admin-update-form" onSubmit={submit}>
      <h2 className="admin-update-form__title">
        {editing ? 'Corriger la mise à jour' : 'Nouvelle mise à jour'}
      </h2>
      <div className="admin-update-form__row">
        <Field label="Version" required>
          <Input value={draft.version} onChange={(e) => set({ version: e.target.value })} />
        </Field>
        <Field label="Titre" required>
          <Input
            value={draft.title}
            maxLength={200}
            onChange={(e) => set({ title: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Texte" required>
        <Textarea
          rows={8}
          value={draft.body}
          maxLength={10000}
          onChange={(e) => set({ body: e.target.value })}
        />
      </Field>
      <Field label="Image (facultative)">
        {draft.imageUrl ? (
          <span className="admin-update-form__image">
            <img src={draft.imageUrl} alt="" />
            <Button type="button" onClick={() => set({ imageUrl: null })}>
              Retirer l’image
            </Button>
          </span>
        ) : (
          <input
            className="admin-update-form__drop"
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => void addImage(e.target.files?.[0])}
          />
        )}
      </Field>
      <fieldset className="admin-update-form__weights" disabled={Boolean(editing)}>
        <legend>Poids de la mise à jour</legend>
        {WEIGHTS.map((weight) => (
          <label key={weight.key} className="admin-update-form__weight">
            <input
              type="radio"
              name="poids"
              checked={draft.weight === weight.key}
              onChange={() => set({ weight: weight.key })}
            />
            <span className="admin-update-form__weight-title">{weight.title}</span>
            <span className="admin-update-form__weight-detail">{weight.detail}</span>
          </label>
        ))}
      </fieldset>
      {problem && <p className="admin-page__error">{problem}</p>}
      <div className="admin-update-form__foot">
        <p className="admin-update-form__warning">
          {editing ? (
            'Corriger la note ne renvoie ni notification ni e-mail.'
          ) : draft.weight === 'big' ? (
            <>
              <Mail size={15} strokeWidth={1.8} />
              {mailLine} Corriger la note ensuite ne le renvoie pas.
            </>
          ) : null}
        </p>
        <Button type="button" onClick={() => setPreview((shown) => !shown)}>
          {preview ? 'Fermer l’aperçu' : 'Aperçu'}
        </Button>
        <Button type="submit" variant="action" disabled={!ready || busy}>
          {busy ? 'Un instant…' : editing ? 'Enregistrer' : 'Publier'}
        </Button>
      </div>
      {preview && (
        <div className="admin-update-form__preview">
          <UpdateCard
            note={{ ...draft, publishedAt: editing?.publishedAt ?? new Date().toISOString() }}
          />
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          title="Publier cette grosse mise à jour ?"
          text={`${mailLine} Il ne pourra pas être renvoyé.`}
          confirmLabel="Publier et envoyer"
          busy={busy}
          problem={problem}
          onConfirm={() => void run(async () => (await publishUpdate(draft)).mailProblem)}
          onClose={() => setConfirming(false)}
        />
      )}
    </form>
  )
}
