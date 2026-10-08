/**
 * QUOI     — le parcours de création d'un événement (/evenement/nouveau), en quatre étapes, avec
 *            l'aperçu de la fiche à côté.
 * POURQUOI — créer une date sans quitter l'app : l'affiche part dans le stockage, l'événement est
 *            créé, et le créateur y est inscrit en « intéressé » (décision d'août 2026).
 * ATTENTION — l'affiche n'est pas dans le brouillon : un fichier ne survit pas au rechargement,
 *            seul le texte est gardé (useEventDraft).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTransitionNavigate, useViewTransition } from '@/lib/navigation'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import { parseSqlDate } from '@/lib/dates'
import { canActOn } from '@/lib/plan'
import { usePlan } from '@/lib/usePlan'
import { supabase } from '@/lib/supabase'
import { EventPreview } from './EventPreview'
import { useSimilarEvents } from './useSimilarEvents'
import { useTags } from './useTags'
import { blockingReason, STEPS, useEventDraft } from './useEventDraft'
import { DuplicateWarning, StepDetails, StepIdentity, StepPlace, StepTags } from './Steps'

/** Le dépôt public des affiches. */
const POSTER_BUCKET = 'event-images'

/** Le temps que la question « on efface ? » reste posée avant de se retirer. */
const CONFIRM_MS = 6000

export function CreateEvent() {
  const go = useTransitionNavigate()
  const { actor, person } = useAuth()
  const { pro } = usePlan()
  const { draft, update, toggleTag, clear, status } = useEventDraft()
  const tags = useTags()

  const [step, setStep] = useState(0)
  const [poster, setPoster] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBlocker, setShowBlocker] = useState(false)
  const [askingDiscard, setAskingDiscard] = useState(false)

  // L'aperçu de l'affiche vient du navigateur, avant tout envoi. L'URL objet
  // doit être révoquée, sinon le fichier reste en mémoire.
  const posterUrl = useMemo(() => (poster ? URL.createObjectURL(poster) : null), [poster])
  useEffect(() => {
    if (!posterUrl) return
    return () => URL.revokeObjectURL(posterUrl)
  }, [posterUrl])

  const blocker = blockingReason(draft, step)
  const similar = useSimilarEvents(draft.name, step === 0 && !draft.isPrivate)

  // Le sens de la marche décide de quel côté l'ancienne étape sort et de quel
  // côté la nouvelle arrive.
  const transition = useViewTransition()

  const goNext = useCallback(() => {
    if (blocker) {
      setShowBlocker(true)
      return
    }
    setShowBlocker(false)
    transition('step-next', () => setStep((current) => Math.min(current + 1, STEPS.length - 1)))
  }, [blocker, transition])

  const goBack = useCallback(() => {
    setShowBlocker(false)
    transition('step-back', () => setStep((current) => Math.max(current - 1, 0)))
  }, [transition])

  // La question ne reste pas posée indéfiniment : sans réponse elle se
  // retire, plutôt que d'attendre un clic distrait des heures plus tard.
  useEffect(() => {
    if (!askingDiscard) return
    const timer = setTimeout(() => setAskingDiscard(false), CONFIRM_MS)
    return () => clearTimeout(timer)
  }, [askingDiscard])

  /**
   * Abandonner le brouillon vide l'atelier sans le quitter : c'est le seul
   * moyen de repartir d'une fiche vierge, puisque la saisie est conservée
   * d'une visite à l'autre. Partir, lui, se fait par la barre du haut.
   */
  const discardDraft = useCallback(() => {
    setAskingDiscard(false)
    setShowBlocker(false)
    setError(null)
    setPoster(null)
    clear()
    transition('step-back', () => setStep(0))
  }, [clear, transition])

  async function submit() {
    if (!actor) return
    setSaving(true)
    setError(null)

    let imageUrl: string | null = null
    if (poster) {
      const path = `${crypto.randomUUID()}-${poster.name.replace(/[^\w.-]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from(POSTER_BUCKET).upload(path, poster)
      if (uploadError) {
        setSaving(false)
        setError("L'affiche n'a pas pu être envoyée. Réessaie, ou crée l'événement sans elle.")
        return
      }
      imageUrl = supabase.storage.from(POSTER_BUCKET).getPublicUrl(path).data.publicUrl
    }

    const { data: created, error: insertError } = await supabase
      .from('events')
      .insert({
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
      .select('id')
      .single()

    if (insertError) {
      setSaving(false)
      setError("L'événement n'a pas pu être créé. " + insertError.message)
      return
    }

    // Ajouter une date, c'est déjà la repérer. On la marque « intéressé » —
    // le cran sans engagement — pour qu'elle apparaisse tout de suite dans
    // « à venir » au lieu de disparaître. On n'écrit PAS « inscrit » : ça
    // voudrait dire que la demande est faite auprès de l'organisateur, ce
    // que l'app ne sait pas.
    // En gratuit, au-delà des 6 mois, la date entre dans l'annuaire seulement (lib/plan.ts) :
    // l'étape des dates l'a dit avant l'enregistrement.
    if (canActOn(parseSqlDate(draft.startDate), pro, new Date())) {
      await supabase.from('participations').insert({
        actor_id: actor.id,
        event_id: created.id,
        status: 'interesse',
        acted_by_user_id: person?.actor_id ?? null,
      })
    }

    setSaving(false)

    // L'événement, lui, existe bel et bien : un échec ici ne bloque rien, et n'est pas
    // signalé. L'exposant pourra se marquer depuis la fiche.

    clear()
    go('/')
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="create">
      <div className="create__top">
        {/* La sortie normale : on part, le brouillon reste. */}
        <button type="button" className="create__quit" onClick={() => go('/')}>
          <ArrowLeft size={15} strokeWidth={2} />
          Tableau de bord
        </button>

        <div className="create__top-right">
          <span className="create__progress">
            Étape {step + 1} sur {STEPS.length}
            {isLast && ' · facultative'}
          </span>

          {/* Tout ce qui concerne le brouillon se dit ici : ce qu'il en est, et
              le seul moyen de s'en défaire. Rien de destructeur ne traîne du
              côté de la sortie. */}
          {status !== 'quiet' &&
            (askingDiscard ? (
              <span className="create__draft create__draft--asking">
                Effacer le brouillon ?
                <button type="button" className="create__draft-yes" onClick={discardDraft}>
                  Effacer
                </button>
                <button
                  type="button"
                  className="create__draft-no"
                  onClick={() => setAskingDiscard(false)}
                >
                  Garder
                </button>
              </span>
            ) : (
              <span className="create__draft-group">
                {/* Un statut, pas une commande : le brouillon part au stockage
                    tout seul, ce badge ne fait que l'annoncer. */}
                <span
                  className={
                    status === 'kept' ? 'create__draft' : 'create__draft create__draft--refused'
                  }
                  role="status"
                  title={
                    status === 'kept'
                      ? undefined
                      : "Ce navigateur refuse le stockage : le brouillon sera perdu en fermant l'onglet."
                  }
                >
                  <Save size={14} strokeWidth={2} />
                  {status === 'kept' ? 'Brouillon sauvegardé !' : 'Brouillon non gardé'}
                </span>

                <button
                  type="button"
                  className="create__draft-drop"
                  onClick={() => setAskingDiscard(true)}
                  aria-label="Abandonner le brouillon"
                  title="Abandonner le brouillon et repartir d'une fiche vierge"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </span>
            ))}
        </div>
      </div>

      <div className="create__body">
        <div>
          <div className="create__step">
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
              <Button variant="action" onClick={() => void submit()} disabled={saving}>
                {saving ? 'Création…' : "Créer l'événement"}
              </Button>
            ) : (
              <Button variant="action" onClick={goNext}>
                Continuer
              </Button>
            )}
          </div>

          {showBlocker && blocker && <p className="create__blocker">{blocker}</p>}
          {error && <p className="create__blocker">{error}</p>}
        </div>

        <aside className="mate">
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
