/**
 * QUOI     — la fenêtre d'une catégorie : nom, adresse (slug), les deux couleurs, l'ordre, et
 *            l'aperçu de la pastille telle qu'elle s'affichera.
 * POURQUOI — les couleurs sont des données posées ici par Uriel (lib/tags.ts) : n'importe quelle
 *            couleur CSS, comme celles déjà en base (`hsl(24 72% 44% / 0.1)`), d'où des champs texte.
 * ATTENTION — renommer une catégorie qui sert déjà la renomme aussi sur ses fiches (la fenêtre le dit).
 */
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Tag } from '@/components/ui/Tag'
import { cleanSlug } from '@/lib/vitrine-edit'
import { saveCategory, styleOf, type Category, type CategoryDraft } from './useCategories'

interface Props {
  category: Category | null
  /** L'ordre proposé à une nouvelle catégorie : après la dernière. */
  nextOrder: number
  onClose: () => void
  onDone: () => void
}

export function CategoryDialog({ category, nextOrder, onClose, onDone }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<CategoryDraft>({
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    bg_color: category?.bg_color ?? '',
    text_color: category?.text_color ?? '',
    sort_order: category?.sort_order ?? nextOrder,
  })
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const renamed =
    category !== null && category.evenements > 0 && category.name !== draft.name.trim()
  const ready = draft.name.trim() && draft.slug && draft.bg_color.trim() && draft.text_color.trim()

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  function close() {
    if (!busy) onClose()
  }

  async function save() {
    setBusy(true)
    setProblem(null)
    try {
      await saveCategory(category?.id ?? null, { ...draft, name: draft.name.trim() })
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
      aria-labelledby="category-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="confirm-dialog__card">
        <h2 id="category-dialog-title" className="confirm-dialog__title">
          {category ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
        </h2>
        <Field label="Nom" required>
          <Input
            value={draft.name}
            placeholder="Marché de Noël"
            onChange={(event) => {
              const name = event.target.value
              // Une nouvelle catégorie prend son adresse du nom ; une existante garde la sienne.
              setDraft({
                ...draft,
                name,
                slug: category ? draft.slug : cleanSlug(name).replace(/-$/, ''),
              })
            }}
          />
        </Field>
        <Field label="Adresse (slug)" required>
          <Input
            value={draft.slug}
            onChange={(event) => setDraft({ ...draft, slug: cleanSlug(event.target.value) })}
          />
        </Field>
        <Field label="Couleur de fond" required>
          <Input
            value={draft.bg_color}
            placeholder="hsl(24 72% 44% / 0.1)"
            onChange={(event) => setDraft({ ...draft, bg_color: event.target.value })}
          />
        </Field>
        <Field label="Couleur du texte" required>
          <Input
            value={draft.text_color}
            placeholder="hsl(24 72% 50%)"
            onChange={(event) => setDraft({ ...draft, text_color: event.target.value })}
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
        <p className="confirm-dialog__text">
          Aperçu : <Tag name={draft.name} style={styleOf(draft)} />
        </p>
        {renamed && (
          <p className="confirm-dialog__text">
            Ses {category.evenements} fiche(s) prendront le nouveau nom.
          </p>
        )}
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
