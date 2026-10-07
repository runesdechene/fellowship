/**
 * QUOI     — les quatre étapes du formulaire de création, et l'avertissement de doublon.
 * POURQUOI — chaque étape est un morceau de formulaire sans état : elle reçoit le brouillon et
 *            la fonction qui le modifie. Le parcours (navigation, envoi) reste dans CreateEvent.
 */
import { Field, Input, Textarea, Toggle } from '@/components/ui/Field'
import { parseSqlDate, formatDayMonth } from '@/lib/dates'
import type { useSimilarEvents } from './useSimilarEvents'
import type { EventDraft } from './useEventDraft'

/* ---------------------------------------------------------------------------
   Le compagnon de la première étape : ce qui existe déjà et lui ressemble.
   Une fiche vide n'aurait rien dit ; ceci arrive au moment où ça compte.
   ------------------------------------------------------------------------ */
export function DuplicateWarning({ similar }: { similar: ReturnType<typeof useSimilarEvents> }) {
  return (
    <>
      <p className="mate__label">
        {similar.length === 1
          ? 'Un événement ressemble'
          : `${similar.length} événements ressemblent`}
      </p>
      {similar.map((event) => (
        <button key={event.id} type="button" className="dupe">
          <span className="dupe__identity">
            <span className="dupe__name">{event.name}</span>
            <span className="dupe__meta">
              {event.city} ({event.department}) · {formatDayMonth(parseSqlDate(event.startDate))}
            </span>
          </span>
        </button>
      ))}
      <p className="mate__note">
        Si c'est l'un d'eux, ouvre-le plutôt que d'en créer un second — tu y retrouveras les autres
        exposants.
      </p>
    </>
  )
}

/* --------------------------------- Étapes -------------------------------- */

type UpdateFn = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => void

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
          note="Visible par toi seul. N'entre pas dans l'annuaire."
        />
      </div>
    </>
  )
}

export function StepPlace({ draft, update }: { draft: EventDraft; update: UpdateFn }) {
  return (
    <>
      <h1 className="create__ask">Où et quand se passe-t-il ?</h1>
      <p className="create__hint">La ville et la date de début suffisent pour l'enregistrer.</p>

      <div className="fields">
        <Field label="Adresse ou lieu">
          <Input
            value={draft.address}
            onChange={(event) => update('address', event.target.value)}
            placeholder="Place du Châtel, cour du château…"
          />
        </Field>

        <div className="fields__row">
          <Field label="Ville" required>
            <Input
              value={draft.city}
              onChange={(event) => update('city', event.target.value)}
              placeholder="Provins"
            />
          </Field>
          <Field label="Département" required>
            <Input
              value={draft.department}
              onChange={(event) => update('department', event.target.value)}
              placeholder="77"
            />
          </Field>
        </div>

        <div className="fields__row">
          <Field label="Début" required>
            <Input
              type="date"
              value={draft.startDate}
              onChange={(event) => update('startDate', event.target.value)}
            />
          </Field>
          <Field label="Fin">
            <Input
              type="date"
              value={draft.endDate}
              onChange={(event) => update('endDate', event.target.value)}
            />
          </Field>
        </div>
      </div>
    </>
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
      <h1 className="create__ask">De quoi s'agit-il ?</h1>
      <p className="create__hint">
        Le premier que tu choisis devient la catégorie principale — c'est elle qui classera
        l'événement. Tu peux en mettre plusieurs.
      </p>

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
      <h1 className="create__ask">Ce qu'on peut ajouter</h1>
      <p className="create__hint">
        Rien n'est obligatoire. Tu peux créer l'événement maintenant et compléter plus tard.
      </p>

      <div className="fields">
        {/* L'affiche est en tête : c'est le seul champ qui transforme la fiche. */}
        <Field label="Affiche">
          <label className={poster ? 'dropzone dropzone--filled' : 'dropzone'}>
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => onPoster(event.target.files?.[0] ?? null)}
            />
            {poster ? poster.name : 'Choisis une image'}
          </label>
        </Field>

        <Field label="Description">
          <Textarea
            value={draft.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="Ce qu'un exposant a besoin de savoir avant de candidater…"
          />
        </Field>

        <div className="fields__row">
          <Field label="Date limite d'inscription">
            <Input
              type="date"
              value={draft.registrationDeadline}
              onChange={(event) => update('registrationDeadline', event.target.value)}
            />
          </Field>
          <Field label="Lien d'inscription">
            <Input
              type="url"
              value={draft.registrationUrl}
              onChange={(event) => update('registrationUrl', event.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>

        <div className="fields__row">
          <Field label="Site de l'événement">
            <Input
              type="url"
              value={draft.externalUrl}
              onChange={(event) => update('externalUrl', event.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Email de contact">
            <Input
              type="email"
              value={draft.contactEmail}
              onChange={(event) => update('contactEmail', event.target.value)}
              placeholder="contact@exemple.fr"
            />
          </Field>
        </div>

        <Field label="Comment candidater">
          <Input
            value={draft.registrationNote}
            onChange={(event) => update('registrationNote', event.target.value)}
            placeholder="Ex : envoyer un dossier par mail"
          />
        </Field>
      </div>
    </>
  )
}
