/**
 * QUOI     — l'arrivée d'un exposant (`/bienvenue`) : les étapes à gauche, la vitrine en direct à
 *            droite, et la création à la fin.
 * POURQUOI — lot 10a (maquettes 2102:72, 2244:2, 2244:53) : la marque d'abord, puis le prénom ; le
 *            prénom seul quand une enseigne existe déjà ; sans le prénom pour « Créer un compte
 *            exposant ».
 * ATTENTION — la création réutilise ce qui existe : `users.update` pour le prénom,
 *            `create_owned_entity` (enseigne + appartenance « owner », d'un seul coup),
 *            `attribute_referral` (sans bloquer s'il échoue).
 */
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Wordmark } from '@/components/ui/Wordmark'
import { useAuth } from '@/lib/auth'
import { useTransitionNavigate } from '@/lib/navigation'
import { supabase } from '@/lib/supabase'
import { isSlugTaken } from '@/lib/vitrine-edit'
import {
  departmentOf,
  firstProblemStep,
  NOMAD_CITY,
  safeReturn,
  slugFor,
  stepProblem,
  type WelcomeDraft,
  type WelcomeKind,
} from '@/lib/welcome'
import { ActivityPreview } from './ActivityPreview'
import { clearWelcome, useWelcomeDraft } from './useWelcomeDraft'
import { useSlugFree } from './useSlugFree'
import { WelcomePreview } from './WelcomePreview'
import { WelcomeStepFields } from './WelcomeStepFields'

export function WelcomePage({ kind }: { kind: WelcomeKind }) {
  const { user, person, entities, actor, reloadIdentity, switchActor } = useAuth()
  const go = useTransitionNavigate()
  const [search] = useSearchParams()
  const { draft, set: setDraft, steps, step, index, next, back, goTo } = useWelcomeDraft(kind)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  // L'adresse refusée par la base à la création : « Déjà prise » tant qu'on ne l'a pas changée.
  const [refused, setRefused] = useState<string | null>(null)
  // L'enseigne déjà créée : un nouvel essai (après un prénom qui n'a pas pu s'écrire) n'en crée
  // pas une seconde.
  const created = useRef<string | null>(null)

  function set(patch: Partial<WelcomeDraft>) {
    setFailed(null)
    setDraft(patch)
  }

  const slug = slugFor(draft)
  const problem = stepProblem(step, draft)
  const checked = useSlugFree(slug, step === 'address' && problem === null)
  const slugState = slug === refused ? 'taken' : checked
  const last = index === steps.length - 1
  const entity = entities.find((item) => item.actor_id === actor?.id) ?? entities[0]
  const brand = kind === 'nameOnly' ? (entity?.brand_name ?? '') : draft.brand
  const city = draft.nomad ? NOMAD_CITY : draft.city.trim()
  const postalCode = draft.nomad ? '' : draft.postalCode.trim()
  const department = departmentOf(postalCode)
  const place = city ? `${city}${department ? ` (${department})` : ''}` : ''
  const blocked = problem !== null || (step === 'address' && slugState === 'taken')

  async function finish() {
    if (!user) return
    setBusy(true)
    setFailed(null)
    try {
      // L'enseigne d'abord, le prénom ensuite : si le prénom échoue, l'arrivée reprend sur lui seul
      // (« nameOnly ») au lieu de laisser un exposant sans enseigne passer pour un festivalier.
      if (kind !== 'nameOnly' && !created.current) {
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
          if (step !== 'address') goTo(steps.indexOf('address'))
          return
        }
        if (error) throw error
        created.current = data
        if (draft.referral) {
          await supabase
            .rpc('attribute_referral', { p_code: draft.referral, p_filleul_entity_id: data })
            .then(
              () => undefined,
              () => undefined,
            )
        }
      }
      if (steps.includes('firstName')) {
        const { error } = await supabase
          .from('users')
          .update({ display_name: draft.firstName.trim() })
          .eq('actor_id', user.id)
        if (error) throw error
      }
      await reloadIdentity()
      if (created.current) switchActor(created.current)
      clearWelcome()
      go(safeReturn(search.get('retour')) ?? (kind === 'newEntity' ? '/reglages' : '/'))
    } catch {
      setFailed('La création n’a pas abouti. Réessaie.')
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (blocked || busy) return
    if (!last) {
      next()
      return
    }
    // Un lien vers la dernière étape ouvert ailleurs arrive sans les réponses d'avant.
    const missing = firstProblemStep(steps, draft)
    if (missing !== null) goTo(missing)
    else void finish()
  }

  return (
    <div className="door">
      <div className="door__side">
        <Wordmark className="door__logo" />
        <form className="door__form" onSubmit={submit}>
          <div className="welcome__top">
            {index > 0 && (
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
              set={set}
            >
              {step === 'firstName' && (
                <ActivityPreview
                  firstName={draft.firstName}
                  brand={brand}
                  avatarUrl={person?.avatar_url}
                />
              )}
            </WelcomeStepFields>
          </div>
          <button type="submit" className="door__submit" disabled={blocked || busy}>
            {busy
              ? 'Création…'
              : last
                ? kind === 'nameOnly'
                  ? 'Entrer'
                  : 'Créer ma vitrine'
                : 'Continuer'}
            {!busy && <ArrowRight size={16} strokeWidth={2} />}
          </button>
          {failed && <p className="door__error">{failed}</p>}
        </form>
      </div>
      <WelcomePreview
        brand={brand}
        craft={kind === 'nameOnly' ? (entity?.craft_type ?? '') : draft.craft}
        place={kind === 'nameOnly' ? (entity?.city ?? '') : place}
        slug={kind === 'nameOnly' ? (entity?.public_slug ?? '') : slug}
        avatarUrl={kind === 'nameOnly' ? entity?.avatar_url : null}
      />
    </div>
  )
}
