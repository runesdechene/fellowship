import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTransitionNavigate } from '@/lib/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Toggle } from '@/components/ui/Field'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { parseSqlDate, formatDayMonth } from '@/lib/dates'
import { EventPreview } from './EventPreview'
import { useSimilarEvents } from './useSimilarEvents'
import { useTags } from './useTags'
import { blockingReason, STEPS, useEventDraft, type EventDraft } from './useEventDraft'

/** Le dépôt public des affiches. */
const POSTER_BUCKET = 'event-images'

export function CreateEvent() {
  const go = useTransitionNavigate()
  const { actor, person } = useAuth()
  const { draft, update, toggleTag, clear } = useEventDraft()
  const tags = useTags()

  const [step, setStep] = useState(0)
  const [poster, setPoster] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBlocker, setShowBlocker] = useState(false)

  // L'aperçu de l'affiche vient du navigateur, avant tout envoi. L'URL objet
  // doit être révoquée, sinon le fichier reste en mémoire.
  const posterUrl = useMemo(() => (poster ? URL.createObjectURL(poster) : null), [poster])
  useEffect(() => {
    if (!posterUrl) return
    return () => URL.revokeObjectURL(posterUrl)
  }, [posterUrl])

  const blocker = blockingReason(draft, step)
  const similar = useSimilarEvents(draft.name, step === 0 && !draft.isPrivate)

  // Le sens de la marche : il décide de quel côté l'étape suivante arrive.
  const [direction, setDirection] = useState<'next' | 'back'>('next')

  const goNext = useCallback(() => {
    if (blocker) {
      setShowBlocker(true)
      return
    }
    setShowBlocker(false)
    setDirection('next')
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }, [blocker])

  const goBack = useCallback(() => {
    setShowBlocker(false)
    setDirection('back')
    setStep((current) => Math.max(current - 1, 0))
  }, [])

  async function submit() {
    if (!actor) return
    setSaving(true)
    setError(null)

    let imageUrl: string | null = null
    if (poster) {
      const path = `${crypto.randomUUID()}-${poster.name.replace(/[^\w.-]/g, '_')}`
      const { error: uploadError } = await supabase.storage
        .from(POSTER_BUCKET)
        .upload(path, poster)
      if (uploadError) {
        setSaving(false)
        setError("L'affiche n'a pas pu être envoyée. Réessaie, ou crée l'événement sans elle.")
        return
      }
      imageUrl = supabase.storage.from(POSTER_BUCKET).getPublicUrl(path).data.publicUrl
    }

    const { error: insertError } = await supabase.from('events').insert({
      name: draft.name.trim(),
      city: draft.city.trim(),
      department: draft.department.trim(),
      start_date: draft.startDate,
      // La base exige une date de fin : un événement d'un jour finit le jour même.
      end_date: draft.endDate || draft.startDate,
      address: draft.address.trim() || null,
      description: draft.description.trim() || null,
      registration_deadline: draft.registrationDeadline || null,
      registration_url: draft.registrationUrl.trim() || null,
      external_url: draft.externalUrl.trim() || null,
      contact_email: draft.contactEmail.trim() || null,
      registration_note: draft.registrationNote.trim() || null,
      image_url: imageUrl,
      tags: draft.tags,
      is_private: draft.isPrivate,
      created_by_actor: actor.id,
      acted_by_user_id: person?.actor_id ?? null,
    })

    setSaving(false)
    if (insertError) {
      setError("L'événement n'a pas pu être créé. " + insertError.message)
      return
    }

    clear()
    go('/')
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="create">
      <div className="create__top">
        <button type="button" className="create__quit" onClick={() => go('/')}>
          <ArrowLeft size={15} strokeWidth={2} />
          Tableau de bord
        </button>
        <span className="create__progress">
          Étape {step + 1} sur {STEPS.length}
          {isLast && ' · facultative'}
        </span>
      </div>

      <div className="create__body">
        <div>
          {/* La clé fait rejouer l'animation à chaque changement d'étape. */}
          <div
            key={step}
            className={direction === 'back' ? 'create__step create__step--back' : 'create__step'}
          >
            {step === 0 && <StepIdentity draft={draft} update={update} />}
            {step === 1 && <StepPlace draft={draft} update={update} />}
            {step === 2 && <StepTags draft={draft} tags={tags} onToggle={toggleTag} />}
            {step === 3 && (
              <StepDetails draft={draft} update={update} poster={poster} onPoster={setPoster} />
            )}
          </div>

          <div className="create__actions">
            {step > 0 && <Button onClick={goBack}>Retour</Button>}
            {isLast ? (
              <Button variant="action" onClick={submit} disabled={saving}>
                {saving ? 'Création…' : "Créer l'événement"}
              </Button>
            ) : (
              <Button variant="action" onClick={goNext}>
                Continuer
              </Button>
            )}
            <span className="create__spacer" />
            {step === 0 ? (
              <Button variant="bare" onClick={() => go('/')} aria-label="Annuler">
                Annuler
              </Button>
            ) : (
              <Button variant="bare" onClick={() => go('/')}>
                Enregistrer et finir plus tard
              </Button>
            )}
          </div>

          {showBlocker && blocker && <p className="create__blocker">{blocker}</p>}
          {error && <p className="create__blocker">{error}</p>}
        </div>

        {/* La clé ne change que si le compagnon change de NATURE : la fiche
            se met à jour sur place, elle ne se recrée pas à chaque question. */}
        <aside className="mate" key={step === 0 ? 'doublons' : 'fiche'}>
          {step === 0 && similar.length > 0 ? (
            <DuplicateWarning similar={similar} />
          ) : (
            <>
              <p className="mate__label">Ce que verront les exposants</p>
              <EventPreview draft={draft} posterUrl={posterUrl} />
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Le compagnon de la première étape : ce qui existe déjà et lui ressemble.
   Une fiche vide n'aurait rien dit ; ceci arrive au moment où ça compte.
   ------------------------------------------------------------------------ */
function DuplicateWarning({
  similar,
}: {
  similar: ReturnType<typeof useSimilarEvents>
}) {
  return (
    <>
      <p className="mate__label">
        {similar.length === 1 ? 'Un événement ressemble' : `${similar.length} événements ressemblent`}
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
        Si c'est l'un d'eux, ouvre-le plutôt que d'en créer un second — tu y retrouveras
        les autres exposants.
      </p>
    </>
  )
}

/* --------------------------------- Étapes -------------------------------- */

type UpdateFn = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => void

function StepIdentity({ draft, update }: { draft: EventDraft; update: UpdateFn }) {
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

function StepPlace({ draft, update }: { draft: EventDraft; update: UpdateFn }) {
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

function StepTags({
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
          const className =
            index === 0 ? 'tag tag--first' : index > 0 ? 'tag tag--on' : 'tag'
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

function StepDetails({
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
