/**
 * QUOI     — les quatre étapes du formulaire de création.
 * POURQUOI — chaque étape est un morceau de formulaire sans état : elle reçoit le brouillon et
 *            la fonction qui le modifie. Le parcours (navigation, envoi) reste dans CreateEvent.
 */
import { Field, Input, Textarea, Toggle } from '@/components/ui/Field'
import { parseSqlDate } from '@/lib/dates'
import { useTransitionNavigate } from '@/lib/navigation'
import { canActOn, monthsBeyond } from '@/lib/plan'
import { usePlan } from '@/lib/usePlan'
import { ApplyFields } from './ApplyFields'
import { PlaceFields } from './PlaceFields'
import type { EventDraft, UpdateFn } from './useEventDraft'

/* --------------------------------- Étapes -------------------------------- */

export function StepIdentity({ draft, update }: { draft: EventDraft; update: UpdateFn }) {
  return (
    <>
      <h1 className="create__ask">Quel événement veux-tu ajouter ?</h1>
      <p className="create__hint">Son nom, tel qu'il est annoncé par l'organisateur.</p>

      <div className="fields">
        <Field label="Nom" required>
          <Input
            autoFocus
            value={draft.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Fête médiévale de Provins 2026"
          />
        </Field>

        <Toggle
          checked={draft.isPrivate}
          onChange={(value) => update('isPrivate', value)}
          title="Événement privé"
          note="Visible seulement de toi et des personnes que tu invites"
        />
      </div>
    </>
  )
}

export function StepPlace({
  draft,
  update,
  patch,
}: {
  draft: EventDraft
  update: UpdateFn
  patch: (fields: Partial<EventDraft>) => void
}) {
  return (
    <>
      <h1 className="create__ask">Où et quand ?</h1>
      <p className="create__hint">L’adresse, la ville et les dates.</p>

      <div className="fields">
        <PlaceFields draft={draft} update={update} patch={patch} />
        <BeyondHorizon startDate={draft.startDate} />
      </div>
    </>
  )
}

/**
 * En gratuit, une date au-delà des 6 mois entre dans l'annuaire mais pas dans le calendrier de
 * l'exposant (lib/plan.ts) : on le dit avant l'enregistrement, pas après.
 */
function BeyondHorizon({ startDate }: { startDate: string }) {
  const { pro } = usePlan()
  const go = useTransitionNavigate()
  if (!startDate) return null
  const start = parseSqlDate(startDate)
  const today = new Date()
  if (canActOn(start, pro, today)) return null
  return (
    <p className="create__hint create__hint--pro">
      Cette date est dans {monthsBeyond(start, today)} mois : elle entrera dans l’annuaire, pas dans
      ton calendrier. Le Pro t’ouvre toute ton année.{' '}
      <button type="button" className="create__pro-link" onClick={() => go('/pro')}>
        Découvrir le Pro
      </button>
    </p>
  )
}

export function StepTags({
  draft,
  tags,
  onToggle,
}: {
  draft: EventDraft
  tags: string[]
  onToggle: (tag: string) => void
}) {
  return (
    <>
      <h1 className="create__ask">Quelles catégories ?</h1>
      <p className="create__hint">La première choisie est la principale.</p>

      <div className="tag-picker">
        {tags.map((tag) => {
          const index = draft.tags.indexOf(tag)
          const className = index === 0 ? 'tag tag--first' : index > 0 ? 'tag tag--on' : 'tag'
          return (
            <button
              key={tag}
              type="button"
              className={className}
              onClick={() => onToggle(tag)}
              aria-pressed={index >= 0}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </>
  )
}

export function StepDetails({
  draft,
  update,
  poster,
  onPoster,
}: {
  draft: EventDraft
  update: UpdateFn
  poster: File | null
  onPoster: (file: File | null) => void
}) {
  return (
    <>
      <h1 className="create__ask">Les détails</h1>
      <p className="create__hint">
        L’affiche et ce qui aide les exposants à candidater. Tout est facultatif.
      </p>

      <div className="fields">
        {/* L'affiche est en tête : c'est le seul champ qui transforme la fiche. */}
        <Field label="Affiche">
          <label className={poster ? 'dropzone dropzone--filled' : 'dropzone'}>
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                onPoster(event.target.files?.[0] ?? null)
                // Rechoisir le même fichier après l'avoir retiré doit encore être vu.
                event.target.value = ''
              }}
            />
            {poster ? poster.name : 'Choisis une image'}
          </label>
          {poster && (
            <button type="button" className="dropzone__remove" onClick={() => onPoster(null)}>
              Retirer l’affiche
            </button>
          )}
        </Field>

        <Field label="Description">
          <Textarea
            value={draft.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="Ce qu'un exposant a besoin de savoir avant de candidater…"
          />
        </Field>

        <ApplyFields draft={draft} update={update} />
      </div>
    </>
  )
}
