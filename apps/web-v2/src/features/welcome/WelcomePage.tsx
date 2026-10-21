/**
 * QUOI     — l'arrivée d'un exposant (`/bienvenue`) : les étapes à gauche, la vitrine en direct à
 *            droite, la création en quittant l'étape photo et bannière, puis les exposants et les
 *            festivals à suivre.
 * POURQUOI — lot 10a (maquettes 2102:72, 2244:2, 2244:53) : la marque d'abord, puis le prénom ; le
 *            prénom seul quand une enseigne existe déjà ; sans le prénom pour « Créer un compte
 *            exposant ». Sept étapes depuis le 21/10/2026 (spec 2026-10-21-arrivee-sept-etapes,
 *            maquettes 2391:65 à 2392:271).
 * ATTENTION — la création réutilise ce qui existe : `create_owned_entity` (enseigne + appartenance
 *            « owner », d'un seul coup), `attribute_referral` et l'envoi des images (sans bloquer
 *            s'ils échouent), `users.update` pour le prénom. L'identité n'est relue qu'à la toute
 *            fin : relue plus tôt, `WelcomeRoute` verrait l'enseigne et sortirait de l'arrivée.
 */
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ImageDrop } from '@/components/ui/ImageDrop'
import { Wordmark } from '@/components/ui/Wordmark'
import { useAuth } from '@/lib/auth'
import { uploadEntityImage } from '@/lib/entity-images'
import { useTransitionNavigate } from '@/lib/navigation'
import { supabase } from '@/lib/supabase'
import { isSlugTaken } from '@/lib/vitrine-edit'
import {
  CREATION_STEP,
  departmentOf,
  draftFate,
  EMPTY_DRAFT,
  firstProblemStep,
  isAfterCreation,
  NOMAD_CITY,
  safeReturn,
  slugFor,
  stepProblem,
  type WelcomeDraft,
  type WelcomeKind,
} from '@/lib/welcome'
import { ActivityPreview } from './ActivityPreview'
import { clearWelcome, useWelcomeDraft } from './useWelcomeDraft'
import { useReferralOwner } from './useReferralOwner'
import { useSlugFree } from './useSlugFree'
import { useWelcomeImages, type ChosenImage } from './useWelcomeImages'
import { WelcomeFestivals } from './WelcomeFestivals'
import { WelcomePeople } from './WelcomePeople'
import { WelcomePreview } from './WelcomePreview'
import { WelcomeStepFields } from './WelcomeStepFields'

/** Envoie les images choisies et les pose sur l'enseigne ; un échec ne bloque pas l'arrivée. */
async function sendImages(actorId: string, avatar: ChosenImage | null, cover: ChosenImage | null) {
  try {
    const columns: { avatar_url?: string; banner_url?: string } = {}
    if (avatar) columns.avatar_url = (await uploadEntityImage(actorId, 'avatar', avatar)).url
    if (cover) columns.banner_url = (await uploadEntityImage(actorId, 'cover', cover)).url
    if (avatar || cover) await supabase.from('entities').update(columns).eq('actor_id', actorId)
  } catch {
    /* la vitrine se complète plus tard, en mode édition */
  }
}

export function WelcomePage({ kind }: { kind: WelcomeKind }) {
  const { user, person, entities, actor, reloadIdentity, switchActor } = useAuth()
  const go = useTransitionNavigate()
  const [search] = useSearchParams()
  const { draft, set: setDraft, steps, step, index, next, back, goTo } = useWelcomeDraft(kind)
  const { images, problems, pick } = useWelcomeImages()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  // L'adresse refusée par la base à la création : « Déjà prise » tant qu'on ne l'a pas changée.
  const [refused, setRefused] = useState<string | null>(null)

  function set(patch: Partial<WelcomeDraft>) {
    setFailed(null)
    setDraft(patch)
  }

  const slug = slugFor(draft)
  const problem = stepProblem(step, draft)
  const checked = useSlugFree(slug, step === 'address' && problem === null)
  const referralOwner = useReferralOwner(draft.referral, step === 'address')
  const slugState = slug === refused ? 'taken' : checked
  const last = index === steps.length - 1
  const created = isAfterCreation(steps, index)
  const entity = entities.find((item) => item.actor_id === actor?.id) ?? entities[0]
  const brand = kind === 'nameOnly' ? (entity?.brand_name ?? '') : draft.brand
  const city = draft.nomad ? NOMAD_CITY : draft.city.trim()
  const postalCode = draft.nomad ? '' : draft.postalCode.trim()
  const department = departmentOf(postalCode)
  const place = city ? `${city}${department ? ` (${department})` : ''}` : ''
  const blocked = problem !== null || (step === 'address' && slugState === 'taken')

  // Un brouillon qui porte déjà une enseigne ne revient jamais avant la création : soit l'arrivée
  // est finie (on repart de zéro), soit c'est un retour arrière (on reprend aux festivals).
  const fate = draftFate(
    steps,
    index,
    draft.createdId,
    entities.map((item) => item.actor_id),
  )
  useEffect(() => {
    if (fate === 'reset') {
      setDraft(EMPTY_DRAFT)
      goTo(0)
    }
    if (fate === 'resume') goTo(steps.indexOf('festivals'))
  }, [fate, goTo, setDraft, steps])

  /** L'enseigne, créée une seule fois : un retour en arrière ou un nouvel essai la retrouve. */
  async function create(): Promise<string | null> {
    if (draft.createdId) return draft.createdId
    const { data, error } = await supabase.rpc('create_owned_entity', {
      p_type: 'exposant',
      p_brand_name: draft.brand.trim(),
      p_craft_type: draft.craft.trim() || undefined,
      p_city: city || undefined,
      p_postal_code: postalCode || undefined,
      p_department: department ?? undefined,
      p_public_slug: slug,
    })
    if (isSlugTaken(error)) {
      setRefused(slug)
      goTo(steps.indexOf('address'))
      return null
    }
    if (error) throw error
    setDraft({ createdId: data })
    if (draft.referral) {
      await supabase
        .rpc('attribute_referral', { p_code: draft.referral, p_filleul_entity_id: data })
        .then(
          () => undefined,
          () => undefined,
        )
    }
    await sendImages(data, images.avatar, images.cover)
    return data
  }

  async function saveFirstName() {
    if (!user || !steps.includes('firstName')) return
    const { error } = await supabase
      .from('users')
      .update({ display_name: draft.firstName.trim() })
      .eq('actor_id', user.id)
    if (error) throw error
  }

  /** La fin : l'identité relue, la nouvelle enseigne choisie, puis l'adresse demandée au départ. */
  async function enter() {
    await reloadIdentity()
    if (draft.createdId) switchActor(draft.createdId)
    clearWelcome()
    go(safeReturn(search.get('retour')) ?? (kind === 'newEntity' ? '/reglages' : '/'))
  }

  async function run(work: () => Promise<void>) {
    setBusy(true)
    setFailed(null)
    try {
      await work()
    } catch {
      setFailed('La création n’a pas abouti. Réessaie.')
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (blocked || busy) return
    const creates = step === CREATION_STEP || (kind === 'nameOnly' && last)
    if (!creates && !last) {
      next()
      return
    }
    // Un lien vers une étape avancée ouvert ailleurs arrive sans les réponses d'avant.
    const missing = firstProblemStep(steps, draft)
    if (!created && missing !== null) {
      goTo(missing)
      return
    }
    void run(async () => {
      if (kind === 'nameOnly') {
        await saveFirstName()
        await enter()
        return
      }
      if (step === CREATION_STEP) {
        if (!(await create())) return
        await saveFirstName()
        next()
        return
      }
      await enter()
    })
  }

  const label = busy
    ? 'Création…'
    : step === CREATION_STEP
      ? 'Créer ma vitrine'
      : last
        ? kind === 'nameOnly'
          ? 'Entrer'
          : 'Commencer'
        : 'Continuer'

  return (
    <div className={created ? 'door door--wide' : 'door'}>
      <div className="door__side">
        <Wordmark className="door__logo" />
        <form className="door__form" onSubmit={submit}>
          <div className="welcome__top">
            {index > 0 && !created && (
              <button type="button" className="door__back" onClick={back}>
                <ChevronLeft size={14} strokeWidth={2} />
                Retour
              </button>
            )}
            {steps.length > 1 && (
              <span className="welcome__progress" aria-hidden="true">
                {steps.map((item, at) => (
                  <span
                    key={item}
                    className={
                      at === index
                        ? 'welcome__dash welcome__dash--current'
                        : at < index
                          ? 'welcome__dash welcome__dash--done'
                          : 'welcome__dash'
                    }
                  />
                ))}
              </span>
            )}
          </div>
          <div className="welcome__body">
            <WelcomeStepFields
              step={step}
              number={index + 1}
              total={steps.length}
              draft={draft}
              slug={slug}
              slugState={slugState}
              problem={problem}
              referralOwner={referralOwner}
              set={set}
            >
              {step === 'firstName' && (
                <ActivityPreview
                  firstName={draft.firstName}
                  brand={brand}
                  avatarUrl={person?.avatar_url}
                />
              )}
              {step === 'design' && (
                <>
                  <ImageDrop
                    label="Ta photo · facultatif"
                    round
                    preview={images.avatar?.preview ?? null}
                    fileName={images.avatar?.name ?? null}
                    problem={problems.avatar}
                    onPick={(file) => void pick('avatar', file)}
                  />
                  <ImageDrop
                    label="Ta bannière · facultatif"
                    round={false}
                    preview={images.cover?.preview ?? null}
                    fileName={images.cover?.name ?? null}
                    problem={problems.cover}
                    onPick={(file) => void pick('cover', file)}
                  />
                </>
              )}
              {step === 'people' && draft.createdId && <WelcomePeople actorId={draft.createdId} />}
              {step === 'festivals' && draft.createdId && (
                <WelcomeFestivals actorId={draft.createdId} />
              )}
            </WelcomeStepFields>
          </div>
          <div className="welcome__actions">
            <button type="submit" className="door__submit" disabled={blocked || busy}>
              {label}
              {!busy && <ArrowRight size={16} strokeWidth={2} />}
            </button>
            {step === 'festivals' && (
              <button type="button" className="welcome__skip" disabled={busy} onClick={next}>
                Aucun de ces festivals ne m’intéresse, passer cette étape
              </button>
            )}
          </div>
          {failed && <p className="door__error">{failed}</p>}
        </form>
      </div>
      {!created && (
        <WelcomePreview
          brand={brand}
          craft={kind === 'nameOnly' ? (entity?.craft_type ?? '') : draft.craft}
          place={kind === 'nameOnly' ? (entity?.city ?? '') : place}
          slug={kind === 'nameOnly' ? (entity?.public_slug ?? '') : slug}
          avatarUrl={kind === 'nameOnly' ? entity?.avatar_url : (images.avatar?.preview ?? null)}
          bannerUrl={kind === 'nameOnly' ? null : (images.cover?.preview ?? null)}
        />
      )}
    </div>
  )
}
