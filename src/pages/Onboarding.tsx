import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  slugify, deriveDepartment, resolveOnboardingFlow, resolveUniqueHandle,
  type OnboardingPath,
} from '@/lib/onboarding'
import './Onboarding.css'

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken'

export function OnboardingPage() {
  const { person, entities, refreshProfile, switchActor } = useAuth()
  const navigate = useNavigate()

  const [chosenPath, setChosenPath] = useState<OnboardingPath | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState({ prenom: '', brand: '', craft: '', city: '', postal: '', slug: '' })
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const slugTouched = useRef(false)

  const flow = resolveOnboardingFlow(entities.length, chosenPath)
  const steps = flow.steps
  const currentStep = steps[stepIndex]
  const isLastInputStep = stepIndex === steps.length - 1

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  // Slug entité : pré-remplissage depuis la marque tant que l'utilisateur n'a pas édité le slug.
  useEffect(() => {
    if (chosenPath === 'exposant' && !slugTouched.current) {
      setForm((f) => ({ ...f, slug: slugify(f.brand) }))
    }
  }, [form.brand, chosenPath])

  // Slug entité : vérif live débouncée d'unicité.
  useEffect(() => {
    if (currentStep !== 'slug') return
    const s = form.slug.trim()
    if (!s) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    const t = setTimeout(async () => {
      const { data } = await supabase.from('entities').select('actor_id').eq('public_slug', s).maybeSingle()
      setSlugStatus(data ? 'taken' : 'available')
    }, 400)
    return () => clearTimeout(t)
  }, [form.slug, currentStep])

  const choose = (path: OnboardingPath) => { setChosenPath(path); setStepIndex(0) }
  const goNext = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  const goBack = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1)
    else if (flow.needsChoice === false && entities.length === 0) { setChosenPath(null); setStepIndex(0) }
  }

  const handleSubmit = async () => {
    if (!person) return
    setSaving(true)
    setError(null)
    try {
      const isHandleTaken = async (h: string) => {
        const { data } = await supabase.from('users').select('actor_id').eq('handle', h).maybeSingle()
        return !!data
      }
      const handle = await resolveUniqueHandle(form.prenom, isHandleTaken)

      if (flow.case === 'completion') {
        // Exposant migré : on complète juste la personne, l'entité existe déjà.
        const { error: e } = await supabase.from('users')
          .update({ display_name: form.prenom, handle }).eq('actor_id', person.actor_id)
        if (e) throw e
        if (entities[0]) switchActor(entities[0].actor_id)
      } else if (flow.case === 'festivalier') {
        const { error: e } = await supabase.from('users').update({
          display_name: form.prenom, handle,
          postal_code: form.postal, department: deriveDepartment(form.postal),
        }).eq('actor_id', person.actor_id)
        if (e) throw e
      } else {
        // Exposant : personne d'abord, puis création ATOMIQUE de l'entité (slug inclus dans la RPC).
        const { error: eu } = await supabase.from('users')
          .update({ display_name: form.prenom, handle }).eq('actor_id', person.actor_id)
        if (eu) throw eu
        const { data: newId, error: er } = await supabase.rpc('create_owned_entity', {
          p_type: 'exposant', p_brand_name: form.brand,
          p_craft_type: form.craft, p_city: form.city,
          p_department: deriveDepartment(form.postal) ?? undefined, p_postal_code: form.postal,
          p_public_slug: form.slug.trim(),
        })
        if (er) {
          // Collision de slug (UNIQUE) = la transaction a tout annulé, rien n'est créé → retry propre.
          if (er.code === '23505' || /duplicate|unique/i.test(er.message || '')) {
            setError('Ce lien est déjà pris, choisis-en un autre.')
            setStepIndex(steps.indexOf('slug'))
            setSlugStatus('taken')
            setSaving(false)
            return
          }
          throw er
        }
        switchActor(newId as string)
      }

      await refreshProfile()
      setSubmitted(true)
    } catch {
      setError('Une erreur est survenue. Réessaie.')
      setSaving(false)
    }
  }

  // Libellé/titre du premier "name" : complétion (migré) vs nouveau parcours.
  const nameTitle = flow.case === 'completion' ? `Bienvenue ! Comment on t'appelle ?` : `Comment on t'appelle ?`
  const nameSub = chosenPath === 'exposant' ? `D'abord toi, la personne. Ta marque vient juste après.` : null

  // Eyebrow helpers
  const stepPos = steps.indexOf(currentStep) + 1
  const stepTotal = steps.length

  // Initiales entité (succès exposant)
  const initials = form.brand.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?'

  return (
    <div className="onboarding">
      {/* Discreet theme toggle */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}>
        <ThemeToggle />
      </div>

      <div className="ob-wrap">
        <div className="ob-logo">
          <span className="mark">✦</span> Fellowship
        </div>

        <div className="ob-card">
          {/* ── SUCCESS SCREEN ── */}
          {submitted && flow.case !== 'exposant' && (
            <section className="step">
              <div className="done-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></div>
              <h2>Bienvenue, {form.prenom}&nbsp;!</h2>
              <div className="sub">Ton espace est prêt. Découvre les festivals et suis tes créateurs préférés.</div>
              <div className="spacer" />
              <button className="btn btn-p" onClick={() => navigate('/explorer', { replace: true })}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg> Explorer les festivals
              </button>
            </section>
          )}
          {submitted && flow.case === 'exposant' && (
            <section className="step">
              <div className="done-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></div>
              <h2>Ta vitrine est prête&nbsp;!</h2>
              <div className="sub">Voici ton entité. Tu pourras candidater, gérer ta saison et la faire vivre.</div>
              <div className="entitycard">
                <div className="eav">{initials}</div>
                <div className="et"><b>{form.brand}</b><span>Exposant · {form.craft} · {form.city}</span></div>
              </div>
              <div className="person-line">rattachée à <b>{form.prenom}</b> · ton compte</div>
              <div className="spacer" />
              <button className="btn btn-p" onClick={() => navigate('/explorer', { replace: true })}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg> Entrer dans Fellowship
              </button>
              <div className="addhint"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg> Tu pourras ajouter d'autres entités via le sélecteur.</div>
            </section>
          )}

          {/* Back button */}
          {!submitted && currentStep !== 'choice' && (stepIndex > 0 || entities.length === 0) && (
            <button className="ob-back" onClick={goBack}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}

          {/* Progress dots */}
          {!submitted && currentStep !== 'choice' && (
            <div className="ob-dots">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={'dot' + (i === stepIndex ? ' on' : i < stepIndex ? ' done' : '')}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {!submitted && error && (
            <p style={{ color: 'salmon', textAlign: 'center', fontSize: 13, marginBottom: 12 }}>
              {error}
            </p>
          )}

          {/* ── STEPS (hidden when submitted) ── */}
          {!submitted && (<>

          {/* ── ÉTAPE : choice ── */}
          {currentStep === 'choice' && (
            <section className="step">
              <div className="eyb">Bienvenue</div>
              <h2>Tu viens pour quoi&nbsp;?</h2>
              <div className="sub">Le réseau qui fait tourner les festivals.</div>
              <div className="choice">
                <button
                  type="button"
                  className="cc"
                  onClick={() => choose('exposant')}
                  disabled={!acceptedTerms}
                  aria-disabled={!acceptedTerms}
                >
                  <div className="cic">🎪</div>
                  <div className="ct">
                    <b>Je suis exposant / créateur</b>
                    <span>Gérer ma saison, ma vitrine, candidater aux festivals.</span>
                  </div>
                  <span className="carr" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                  </span>
                </button>
                <button
                  type="button"
                  className="cc"
                  onClick={() => choose('festivalier')}
                  disabled={!acceptedTerms}
                  aria-disabled={!acceptedTerms}
                >
                  <div className="cic">🎟️</div>
                  <div className="ct">
                    <b>Je découvre des festivals</b>
                    <span>Suivre des créateurs, repérer où aller, planifier mes sorties.</span>
                  </div>
                  <span className="carr" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                  </span>
                </button>
              </div>

              <label className="terms-consent">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span>
                  J'accepte les{' '}
                  <Link to="/legal/cgu" target="_blank" rel="noopener noreferrer">CGU</Link>
                  {' '}et la{' '}
                  <Link to="/legal/confidentialite" target="_blank" rel="noopener noreferrer">Politique de confidentialité</Link>
                  {' '}de Fellowship.
                </span>
              </label>

              <div className="addhint">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                Tu pourras devenir exposant plus tard, sans recréer de compte.
              </div>
            </section>
          )}

          {/* ── ÉTAPE : name (prénom) ── */}
          {currentStep === 'name' && (
            <form className="step" onSubmit={(e) => { e.preventDefault(); if (isLastInputStep) { handleSubmit() } else { goNext() } }}>
              <div className="eyb">
                {flow.case === 'completion'
                  ? 'Bienvenue'
                  : chosenPath === 'exposant'
                    ? `Toi · ${stepPos} / ${stepTotal}`
                    : 'Festivalier'}
              </div>
              <h2>{nameTitle}</h2>
              {nameSub
                ? <div className="sub">{nameSub}</div>
                : <div className="sub">Ton prénom suffit pour commencer.</div>
              }
              <div className="field">
                <label>{chosenPath === 'exposant' ? 'Ton prénom' : 'Prénom'}</label>
                <input
                  type="text"
                  value={form.prenom}
                  onChange={(e) => update({ prenom: e.target.value })}
                  placeholder="Camille"
                  autoFocus
                />
              </div>
              <div className="spacer" />
              <button
                className="btn btn-p"
                disabled={!form.prenom || saving}
                type="submit"
              >
                {isLastInputStep ? (saving ? 'Enregistrement…' : "C'est parti !") : 'Continuer'}
              </button>
            </form>
          )}

          {/* ── ÉTAPE : postal (festivalier) ── */}
          {currentStep === 'postal' && (
            <form className="step" onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
              <div className="eyb">Festivalier</div>
              <h2>Tu es où&nbsp;?</h2>
              <div className="sub">Pour te montrer les festivals près de chez toi.</div>
              <div className="field">
                <label>Code postal</label>
                <input
                  type="text"
                  value={form.postal}
                  onChange={(e) => update({ postal: e.target.value })}
                  placeholder="69000"
                  autoFocus
                />
                <div className="hint">On ne montre jamais ton adresse exacte.</div>
              </div>
              <div className="spacer" />
              <button
                className="btn btn-p"
                disabled={!form.postal || saving}
                type="submit"
              >
                {saving ? 'Enregistrement…' : 'Découvrir les festivals'}
              </button>
            </form>
          )}

          {/* ── ÉTAPE : brand (exposant) ── */}
          {currentStep === 'brand' && (
            <form className="step" onSubmit={(e) => { e.preventDefault(); goNext() }}>
              <div className="eyb">Ton entité exposant · {stepPos} / {stepTotal}</div>
              <h2>Ta marque</h2>
              <div className="sub">C'est l'entité sous laquelle tu exposes.</div>
              <div className="field">
                <label>Nom de la marque</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => update({ brand: e.target.value })}
                  placeholder="Rune de Chêne"
                  autoFocus
                />
              </div>
              <div className="spacer" />
              <button
                className="btn btn-p"
                disabled={!form.brand}
                type="submit"
              >
                Continuer
              </button>
            </form>
          )}

          {/* ── ÉTAPE : craft (métier libre) ── */}
          {currentStep === 'craft' && (
            <form className="step" onSubmit={(e) => { e.preventDefault(); goNext() }}>
              <div className="eyb">Ton entité exposant · {stepPos} / {stepTotal}</div>
              <h2>Ton métier&nbsp;?</h2>
              <div className="sub">Dis-le avec tes mots.</div>
              <div className="field">
                <label>Métier / artisanat</label>
                <input
                  type="text"
                  value={form.craft}
                  onChange={(e) => update({ craft: e.target.value })}
                  placeholder="Forgeron, céramiste, maroquinier…"
                  autoFocus
                />
                <div className="hint">Champ libre — c'est ta façon de nommer ton art.</div>
              </div>
              <div className="spacer" />
              <button
                className="btn btn-p"
                disabled={!form.craft}
                type="submit"
              >
                Continuer
              </button>
            </form>
          )}

          {/* ── ÉTAPE : location (ville + CP entité) ── */}
          {currentStep === 'location' && (
            <form className="step" onSubmit={(e) => { e.preventDefault(); goNext() }}>
              <div className="eyb">Ton entité exposant · {stepPos} / {stepTotal}</div>
              <h2>Où es-tu basé&nbsp;?</h2>
              <div className="sub">Ton point de départ pour les distances et l'itinéraire.</div>
              <div className="row2">
                <div className="field" style={{ margin: 0 }}>
                  <label>Ville</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => update({ city: e.target.value })}
                    placeholder="Lyon"
                    autoFocus
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Code postal</label>
                  <input
                    type="text"
                    value={form.postal}
                    onChange={(e) => update({ postal: e.target.value })}
                    placeholder="69000"
                  />
                </div>
              </div>
              <div className="spacer" />
              <button
                className="btn btn-p"
                disabled={!form.city || !form.postal}
                type="submit"
                style={{ marginTop: 18 }}
              >
                Continuer
              </button>
            </form>
          )}

          {/* ── ÉTAPE : slug (lien public entité) ── */}
          {currentStep === 'slug' && (
            <form className="step" onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
              <div className="eyb">Ton entité exposant · {stepPos} / {stepTotal}</div>
              <h2>Ton lien public</h2>
              <div className="sub">L'adresse de ta vitrine, à partager partout.</div>
              <div className="field">
                <label>Lien</label>
                <div className="slug-field">
                  <span className="pfx">flw.sh/</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => { slugTouched.current = true; update({ slug: slugify(e.target.value) }) }}
                    placeholder="rune-de-chene"
                    autoFocus
                  />
                </div>
                {slugStatus === 'checking' && <div className="hint">Vérification…</div>}
                {slugStatus === 'available' && <div className="hint" style={{ color: 'var(--lime)' }}>✓ Disponible</div>}
                {slugStatus === 'taken' && <div className="hint" style={{ color: 'salmon' }}>Ce lien est déjà pris.</div>}
              </div>
              <div className="spacer" />
              <button
                className="btn btn-p"
                disabled={!form.slug || slugStatus !== 'available' || saving}
                type="submit"
              >
                <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                {saving ? 'Création…' : 'Créer ma vitrine'}
              </button>
            </form>
          )}

          </>)}
        </div>
      </div>
    </div>
  )
}
