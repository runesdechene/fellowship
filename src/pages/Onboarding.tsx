import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Store, Eye } from 'lucide-react'
import {
  slugify, deriveDepartment, resolveOnboardingFlow, resolveUniqueHandle,
  type OnboardingPath,
} from '@/lib/onboarding'

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken'

export function OnboardingPage() {
  const { person, entities, refreshProfile, switchActor } = useAuth()
  const navigate = useNavigate()

  const [chosenPath, setChosenPath] = useState<OnboardingPath | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState({ prenom: '', brand: '', craft: '', city: '', postal: '', slug: '' })
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
        // Exposant : personne d'abord, puis création + complétion de l'entité.
        const { error: eu } = await supabase.from('users')
          .update({ display_name: form.prenom, handle }).eq('actor_id', person.actor_id)
        if (eu) throw eu
        const { data: newId, error: er } = await supabase.rpc('create_owned_entity', {
          p_type: 'exposant', p_brand_name: form.brand,
        })
        if (er) throw er
        const { error: ee } = await supabase.from('entities').update({
          craft_type: form.craft, city: form.city,
          department: deriveDepartment(form.postal), postal_code: form.postal,
          public_slug: form.slug.trim(),
        }).eq('actor_id', newId as string)
        if (ee) {
          // Course sur le slug : on renvoie l'utilisateur corriger.
          setError('Ce lien est déjà pris, choisis-en un autre.')
          setStepIndex(steps.indexOf('slug'))
          setSlugStatus('taken')
          setSaving(false)
          return
        }
        switchActor(newId as string)
      }

      await refreshProfile()
      navigate('/explorer', { replace: true })
    } catch {
      setError('Une erreur est survenue. Réessaie.')
      setSaving(false)
    }
  }

  const inputClass = 'w-full rounded-full border border-input bg-card px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-ring'
  const totalDots = steps.length

  // Libellé/titre du premier "name" : complétion (migré) vs nouveau parcours.
  const nameTitle = flow.case === 'completion' ? `Bienvenue ! Comment on t’appelle ?` : `Comment on t’appelle ?`
  const nameSub = chosenPath === 'exposant' ? `D’abord toi, la personne. Ta marque vient juste après.` : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* progression */}
        {currentStep !== 'choice' && (
          <div className="mb-8 flex justify-center gap-2">
            {Array.from({ length: totalDots }, (_, i) => (
              <div key={i} className={`h-2 w-2 rounded-full transition-colors ${i <= stepIndex ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        )}

        {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}

        {/* ÉTAPE choix */}
        {currentStep === 'choice' && (
          <div className="space-y-6">
            <h2 className="page-title text-center">Tu viens pour quoi&nbsp;?</h2>
            <p className="text-muted-foreground text-center">Le réseau qui fait tourner les festivals.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => choose('exposant')} className="flex items-center gap-4 rounded-2xl bg-card p-5 text-left transition-colors hover:bg-muted">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Store strokeWidth={1.5} className="h-6 w-6" /></div>
                <div><div className="font-bold text-foreground">Je suis exposant / créateur</div><div className="text-sm text-muted-foreground">Gérer ma saison, ma vitrine, candidater aux festivals.</div></div>
              </button>
              <button onClick={() => choose('festivalier')} className="flex items-center gap-4 rounded-2xl bg-card p-5 text-left transition-colors hover:bg-muted">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent"><Eye strokeWidth={1.5} className="h-6 w-6" /></div>
                <div><div className="font-bold text-foreground">Je découvre des festivals</div><div className="text-sm text-muted-foreground">Suivre des créateurs, repérer où aller, planifier mes sorties.</div></div>
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground">Tu pourras devenir exposant plus tard, sans recréer de compte.</p>
          </div>
        )}

        {/* ÉTAPE name (prénom) */}
        {currentStep === 'name' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">{nameTitle}</h2>
            {nameSub && <p className="text-muted-foreground">{nameSub}</p>}
            <input type="text" className={inputClass} placeholder="Ton prénom" value={form.prenom}
              onChange={(e) => update({ prenom: e.target.value })} autoFocus />
            <Button className="w-full" size="lg" disabled={!form.prenom || saving}
              onClick={isLastInputStep ? handleSubmit : goNext}>
              {isLastInputStep ? (saving ? 'Enregistrement…' : `C'est parti !`) : 'Continuer'}
            </Button>
          </div>
        )}

        {/* ÉTAPE postal (festivalier) */}
        {currentStep === 'postal' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Tu es où&nbsp;?</h2>
            <p className="text-muted-foreground">Pour te montrer les festivals près de chez toi.</p>
            <input type="text" className={inputClass} placeholder="69000" value={form.postal}
              onChange={(e) => update({ postal: e.target.value })} autoFocus />
            <Button className="w-full" size="lg" disabled={!form.postal || saving} onClick={handleSubmit}>
              {saving ? 'Enregistrement…' : 'Découvrir les festivals'}
            </Button>
          </div>
        )}

        {/* ÉTAPE brand (exposant) */}
        {currentStep === 'brand' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Ta marque</h2>
            <p className="text-muted-foreground">C'est l'entité sous laquelle tu exposes.</p>
            <input type="text" className={inputClass} placeholder="Rune de Chêne" value={form.brand}
              onChange={(e) => update({ brand: e.target.value })} autoFocus />
            <Button className="w-full" size="lg" disabled={!form.brand} onClick={goNext}>Continuer</Button>
          </div>
        )}

        {/* ÉTAPE craft (métier libre) */}
        {currentStep === 'craft' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Ton métier&nbsp;?</h2>
            <p className="text-muted-foreground">Dis-le avec tes mots — champ libre.</p>
            <input type="text" className={inputClass} placeholder="Forgeron, céramiste, maroquinier…" value={form.craft}
              onChange={(e) => update({ craft: e.target.value })} autoFocus />
            <Button className="w-full" size="lg" disabled={!form.craft} onClick={goNext}>Continuer</Button>
          </div>
        )}

        {/* ÉTAPE location (ville + CP entité) */}
        {currentStep === 'location' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Où es-tu basé&nbsp;?</h2>
            <p className="text-muted-foreground">Ton point de départ pour les distances et l'itinéraire.</p>
            <input type="text" className={inputClass} placeholder="Lyon" value={form.city}
              onChange={(e) => update({ city: e.target.value })} autoFocus />
            <input type="text" className={inputClass} placeholder="69000" value={form.postal}
              onChange={(e) => update({ postal: e.target.value })} />
            <Button className="w-full" size="lg" disabled={!form.city || !form.postal} onClick={goNext}>Continuer</Button>
          </div>
        )}

        {/* ÉTAPE slug (lien public entité, sans @) */}
        {currentStep === 'slug' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Ton lien public</h2>
            <p className="text-muted-foreground">L'adresse de ta vitrine, à partager partout.</p>
            <div className="flex items-center gap-0 overflow-hidden rounded-full border border-input bg-card text-lg">
              <span className="px-5 py-3 text-muted-foreground">flw.sh/</span>
              <input type="text" className="w-full bg-card px-0 py-3 focus:outline-none" placeholder="rune-de-chene"
                value={form.slug}
                onChange={(e) => { slugTouched.current = true; update({ slug: slugify(e.target.value) }) }} autoFocus />
            </div>
            {slugStatus === 'checking' && <p className="text-sm text-muted-foreground">Vérification…</p>}
            {slugStatus === 'available' && <p className="text-sm text-green-600">✓ Disponible</p>}
            {slugStatus === 'taken' && <p className="text-sm text-destructive">Ce lien est déjà pris.</p>}
            <Button className="w-full" size="lg" onClick={handleSubmit}
              disabled={!form.slug || slugStatus === 'taken' || slugStatus === 'checking' || saving}>
              {saving ? 'Création…' : 'Créer ma vitrine'}
            </Button>
          </div>
        )}

        {/* retour */}
        {currentStep !== 'choice' && (stepIndex > 0 || entities.length === 0) && (
          <button onClick={goBack} className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground">← Retour</button>
        )}
      </div>
    </div>
  )
}
