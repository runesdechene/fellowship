/**
 * QUOI     — la fenêtre d'un témoignage : photo, prénom, métier, la phrase, l'adresse de la vitrine
 *            reliée, actif ou non, l'ordre.
 * POURQUOI — les stories de la landing (« Ils en parlent mieux que nous ») se nourrissent d'ici ; la
 *            vitrine reliée leur donne sa couverture et son lien.
 * ATTENTION — la photo part dès qu'elle est choisie (seau `testimonials`) ; l'enregistrement, lui,
 *            attend « Enregistrer ».
 */
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Toggle } from '@/components/ui/Field'
import { imageProblem } from '@/lib/image-resize'
import {
  saveTestimonial,
  uploadPhoto,
  type AdminTestimonial,
  type TestimonialDraft,
} from './useAdminTestimonials'

interface Props {
  testimonial: AdminTestimonial | null
  /** L'adresse actuelle de la vitrine reliée, lue par son `actor_id`. */
  slug: string
  /** Le logo de la vitrine reliée : la photo par défaut, comme sur la landing. */
  vitrineAvatar: string | null
  nextOrder: number
  onClose: () => void
  onDone: () => void
}

export function TestimonialDialog({
  testimonial,
  slug,
  vitrineAvatar,
  nextOrder,
  onClose,
  onDone,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const picker = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<TestimonialDraft>({
    name: testimonial?.name ?? '',
    craft: testimonial?.craft ?? '',
    quote: testimonial?.quote ?? '',
    avatar_url: testimonial?.avatar_url ?? null,
    slug,
    is_active: testimonial?.is_active ?? true,
    sort_order: testimonial?.sort_order ?? nextOrder,
  })
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const ready = draft.name.trim() && draft.craft.trim() && draft.quote.trim()

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  function close() {
    if (!busy) onClose()
  }

  async function pick(file: File | undefined) {
    if (!file) return
    const refused = imageProblem(file)
    if (refused) {
      setProblem(refused)
      return
    }
    setBusy(true)
    setProblem(null)
    try {
      const url = await uploadPhoto(file)
      // Ce qui a été tapé pendant l'envoi reste : on repart du brouillon du moment.
      setDraft((current) => ({ ...current, avatar_url: url }))
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'L’envoi de la photo n’a pas abouti.')
    }
    setBusy(false)
  }

  async function save() {
    setBusy(true)
    setProblem(null)
    try {
      await saveTestimonial(testimonial?.id ?? null, {
        ...draft,
        name: draft.name.trim(),
        craft: draft.craft.trim(),
        quote: draft.quote.trim(),
        slug: draft.slug.trim().replace(/^(https?:\/\/)?flw\.sh\//, ''),
      })
      onDone()
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'L’enregistrement n’a pas abouti.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="testimonial-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="confirm-dialog__card">
        <h2 id="testimonial-dialog-title" className="confirm-dialog__title">
          {testimonial ? 'Modifier le témoignage' : 'Ajouter un témoignage'}
        </h2>
        <Field label="Photo">
          <span className="admin-table__people">
            <Avatar
              src={draft.avatar_url ?? vitrineAvatar}
              name={draft.name}
              className="admin-table__logo"
            />
            <Button onClick={() => picker.current?.click()} disabled={busy}>
              {draft.avatar_url ? 'Changer' : 'Choisir une photo'}
            </Button>
          </span>
          <input
            ref={picker}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => void pick(event.target.files?.[0])}
          />
        </Field>
        <Field label="Prénom" required>
          <Input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </Field>
        <Field label="Métier" required>
          <Input
            value={draft.craft}
            placeholder="Maroquinière"
            onChange={(event) => setDraft({ ...draft, craft: event.target.value })}
          />
        </Field>
        <Field label="Ce qu’il ou elle dit" required>
          <Textarea
            rows={4}
            value={draft.quote}
            onChange={(event) => setDraft({ ...draft, quote: event.target.value })}
          />
        </Field>
        <Field label="Vitrine reliée (flw.sh/…)">
          <Input
            value={draft.slug}
            placeholder="atelier-sauvage"
            onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
          />
        </Field>
        <Field label="Ordre">
          <Input
            type="number"
            value={draft.sort_order}
            onChange={(event) =>
              setDraft({ ...draft, sort_order: Number(event.target.value) || 0 })
            }
          />
        </Field>
        <Toggle
          checked={draft.is_active}
          onChange={(is_active) => setDraft({ ...draft, is_active })}
          title="Affiché sur la landing"
        />
        {problem && <p className="confirm-dialog__problem">{problem}</p>}
        <div className="confirm-dialog__actions">
          <Button onClick={close} disabled={busy}>
            Annuler
          </Button>
          <Button variant="action" onClick={() => void save()} disabled={busy || !ready}>
            {busy ? 'Un instant…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
