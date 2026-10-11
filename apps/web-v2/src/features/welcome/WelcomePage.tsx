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
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useTransitionNavigate } from '@/lib/navigation'
import { supabase } from '@/lib/supabase'
import { isSlugTaken } from '@/lib/vitrine-edit'
import { departmentOf, slugFor, stepProblem, type WelcomeKind } from '@/lib/welcome'
import { ActivityPreview } from './ActivityPreview'
import { clearWelcome, useWelcomeDraft } from './useWelcomeDraft'
import { useSlugFree } from './useSlugFree'
import { WelcomePreview } from './WelcomePreview'
import { WelcomeStepFields } from './WelcomeStepFields'

/** `?retour=` n'accepte qu'une adresse de l'app, jamais un autre site. */
function safeReturn(value: string | null): string | null {
  return value?.startsWith('/') && !value.startsWith('//') ? value : null
}

export function WelcomePage({ kind }: { kind: WelcomeKind }) {
  const { user, person, entities, actor, reloadIdentity, switchActor } = useAuth()
  const go = useTransitionNavigate()
  const [search] = useSearchParams()
  const { draft, set, steps, step, index, next, back, goTo } = useWelcomeDraft(kind)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const title = useRef<HTMLDivElement>(null)

  const slug = slugFor(draft)
  const problem = stepProblem(step, draft)
  const slugState = useSlugFree(slug, step === 'address' && problem === null)
  const last = index === steps.length - 1
  const entity = entities.find((item) => item.actor_id === actor?.id) ?? entities[0]
  const brand = kind === 'nameOnly' ? (entity?.brand_name ?? '') : draft.brand
  const department = departmentOf(draft.postalCode)
  const place = draft.city.trim()
    ? `${draft.city.trim()}${department ? ` (${department})` : ''}`
    : ''
  const blocked = problem !== null || (step === 'address' && slugState === 'taken')

  // Le titre de chaque étape prend le focus : le lecteur d'écran annonce où l'on est.
  useEffect(() => {
    title.current?.querySelector('h1')?.focus()
  }, [step])

  async function finish() {
    if (!user) return
    setBusy(true)
    setFailed(null)
    try {
      if (steps.includes('firstName')) {
        const { error } = await supabase
          .from('users')
          .update({ display_name: draft.firstName.trim() })
          .eq('actor_id', user.id)
        if (error) throw error
      }
      let created: string | null = null
      if (kind !== 'nameOnly') {
        const { data, error } = await supabase.rpc('create_owned_entity', {
          p_type: 'exposant',
          p_brand_name: draft.brand.trim(),
          p_craft_type: draft.craft.trim() || undefined,
          p_city: draft.city.trim() || undefined,
          p_postal_code: draft.postalCode.trim() || undefined,
          p_department: department ?? undefined,
          p_public_slug: slug,
        })
        if (isSlugTaken(error)) {
          goTo(steps.indexOf('address'))
          setFailed('Cette adresse vient d’être prise. Choisis-en une autre.')
          return
        }
        if (error) throw error
        created = data
        if (draft.referral) {
          await supabase
            .rpc('attribute_referral', { p_code: draft.referral, p_filleul_entity_id: data })
            .then(
              () => undefined,
              () => undefined,
            )
        }
      }
      await reloadIdentity()
      if (created) switchActor(created)
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
    if (last) void finish()
    else next()
  }

  return (
    <div className="door">
      <div className="door__side">
        <img className="door__logo" src={`${import.meta.env.BASE_URL}icon.png`} alt="Fellowship" />
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
          <div ref={title} className="welcome__body">
            <WelcomeStepFields
              step={step}
              number={index + 1}
              total={steps.length}
              draft={draft}
              slug={slug}
              slugState={slugState}
              slugProblem={step === 'address' ? problem : null}
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
