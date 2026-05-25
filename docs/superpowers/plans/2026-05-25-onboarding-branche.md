# Onboarding branché (Plan 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recâbler l'onboarding sur le modèle acteur (personne + entités), selon la maquette validée, en écrivant `users`/`entities` (jamais `profiles`), avec namespace `/u/<handle>` pour les personnes.

**Architecture:** Logique de flux pure et testable (`src/lib/onboarding.ts`) pilotant un wizard réécrit (`Onboarding.tsx`) qui consomme le nouveau `AuthContext` (`person`/`entities`/`switchActor`/`refreshProfile`). 3 cas : exposant migré (complétion personne seule), festivalier (personne), exposant (personne + `create_owned_entity` RPC + UPDATE entité). Handle perso auto-généré (unicité par injection de dépendance).

**Tech Stack:** React 19 + TS, Supabase (Postgres + RPC), `@supabase/supabase-js` v2, Vitest. Branche : `feat/accounts-foundation`.

**Spec de référence :** [`../specs/2026-05-25-onboarding-branche-design.md`](../specs/2026-05-25-onboarding-branche-design.md)

---

## File Structure

**Migrations (créer) :**
- `supabase/migrations/20260525120004_users_handle.sql` — ajoute `users.handle TEXT UNIQUE`.

**Code (créer) :**
- `src/lib/onboarding.ts` — helpers : `slugify`, `deriveDepartment`, `resolveOnboardingFlow`, `resolveUniqueHandle` (DI pour rester testable).
- `src/lib/onboarding.test.ts` — tests Vitest.

**Code (modifier) :**
- `src/pages/Onboarding.tsx` — réécriture complète (wizard branché sur le modèle acteur).
- `src/types/supabase.ts` — régénéré après la migration (pour typer `users.handle`).

**Hors périmètre (rappel spec) :** DA Nuit de Festival, upload photo/logo, page profil festivalier, route `/u/:handle`, sélecteur multi-entités, admin.

---

## Task 1 : Migration `users.handle`

**Files :**
- Create: `supabase/migrations/20260525120004_users_handle.sql`
- Modify: `src/types/supabase.ts` (régénéré)

- [ ] **Step 1 : Écrire la migration**

```sql
-- 20260525120004_users_handle.sql
-- Namespace d'identité : les personnes sont publiquement adressables en flw.sh/u/<handle>.
-- (Les entités gardent entities.public_slug pour flw.sh/<slug>.) Handle généré à l'onboarding.
ALTER TABLE users ADD COLUMN handle TEXT UNIQUE;
```

- [ ] **Step 2 : Appliquer** — `"C:/Users/uriel/Desktop/DEVs/fellowship/node_modules/supabase/bin/supabase.exe" db reset`
Expected: toutes les migrations s'appliquent, aucune erreur.

- [ ] **Step 3 : Vérifier la colonne** (psql)

Run: `docker exec supabase_db_fellowship psql -U postgres -d postgres -c "\d users"`
Expected: ligne `handle | text` présente, avec contrainte UNIQUE.

- [ ] **Step 4 : Régénérer les types**

Run: `"C:/Users/uriel/Desktop/DEVs/fellowship/node_modules/supabase/bin/supabase.exe" gen types typescript --local > src/types/supabase.ts`
Then: `grep -n "handle" src/types/supabase.ts`
Expected: `handle: string | null` apparaît dans le type Row de `users`.

- [ ] **Step 5 : Commit**

```bash
git add supabase/migrations/20260525120004_users_handle.sql src/types/supabase.ts
git commit -m "feat(accounts): users.handle for flw.sh/u/<handle> person namespace"
```

---

## Task 2 : Helpers purs `onboarding.ts` + tests (TDD)

**Files :**
- Create: `src/lib/onboarding.ts`
- Test: `src/lib/onboarding.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```typescript
// src/lib/onboarding.test.ts
import { describe, it, expect } from 'vitest'
import { slugify, deriveDepartment, resolveOnboardingFlow, resolveUniqueHandle } from './onboarding'

describe('slugify', () => {
  it('minuscule + tirets', () => expect(slugify('Rune de Chêne')).toBe('rune-de-chene'))
  it('retire accents', () => expect(slugify('Atelier Lumière')).toBe('atelier-lumiere'))
  it('caractères spéciaux → tirets, trim', () => expect(slugify('  Forge & Co !! ')).toBe('forge-co'))
  it('vide → vide', () => expect(slugify('')).toBe(''))
})

describe('deriveDepartment', () => {
  it('métropole = 2 premiers chiffres', () => expect(deriveDepartment('69003')).toBe('69'))
  it('Paris', () => expect(deriveDepartment('75011')).toBe('75'))
  it('Corse-du-Sud 2A (<20200)', () => expect(deriveDepartment('20000')).toBe('2A'))
  it('Haute-Corse 2B (>=20200)', () => expect(deriveDepartment('20600')).toBe('2B'))
  it('DOM = 3 chiffres', () => expect(deriveDepartment('97400')).toBe('974'))
  it('CP invalide → null', () => expect(deriveDepartment('abc')).toBeNull())
  it('CP vide → null', () => expect(deriveDepartment('')).toBeNull())
})

describe('resolveOnboardingFlow', () => {
  it('a déjà une entité → complétion personne seule, pas de création', () => {
    const f = resolveOnboardingFlow(1, null)
    expect(f.case).toBe('completion')
    expect(f.needsChoice).toBe(false)
    expect(f.createsEntity).toBe(false)
    expect(f.steps).toEqual(['name'])
  })
  it('0 entité, pas de choix encore → écran de choix', () => {
    const f = resolveOnboardingFlow(0, null)
    expect(f.needsChoice).toBe(true)
    expect(f.steps).toEqual(['choice'])
  })
  it('festivalier → name + postal, pas de création', () => {
    const f = resolveOnboardingFlow(0, 'festivalier')
    expect(f.createsEntity).toBe(false)
    expect(f.steps).toEqual(['name', 'postal'])
  })
  it('exposant → 5 étapes + création entité', () => {
    const f = resolveOnboardingFlow(0, 'exposant')
    expect(f.createsEntity).toBe(true)
    expect(f.steps).toEqual(['name', 'brand', 'craft', 'location', 'slug'])
  })
})

describe('resolveUniqueHandle', () => {
  it('renvoie la base si libre', async () => {
    const h = await resolveUniqueHandle('Camille', async () => false)
    expect(h).toBe('camille')
  })
  it('suffixe compteur si pris', async () => {
    const taken = new Set(['camille', 'camille-2'])
    const h = await resolveUniqueHandle('Camille', async (x) => taken.has(x))
    expect(h).toBe('camille-3')
  })
  it('base vide → membre', async () => {
    const h = await resolveUniqueHandle('', async () => false)
    expect(h).toBe('membre')
  })
})
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `pnpm test src/lib/onboarding.test.ts`
Expected: FAIL (module `./onboarding` absent).

- [ ] **Step 3 : Implémenter**

```typescript
// src/lib/onboarding.ts
export type OnboardingPath = 'festivalier' | 'exposant'

export interface OnboardingFlow {
  case: 'completion' | 'festivalier' | 'exposant'
  needsChoice: boolean
  createsEntity: boolean
  steps: string[]
}

/** Slug/handle : minuscules, sans accents, [^a-z0-9] → tirets, trim. */
export function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Code département FR depuis le code postal (Corse 2A/2B, DOM 3 chiffres). null si invalide. */
export function deriveDepartment(postalCode: string): string | null {
  const cp = (postalCode || '').trim()
  if (!/^\d{5}$/.test(cp)) return null
  if (cp.startsWith('97') || cp.startsWith('98')) return cp.slice(0, 3) // DOM/TOM
  if (cp.startsWith('20')) return parseInt(cp, 10) < 20200 ? '2A' : '2B' // Corse
  return cp.slice(0, 2)
}

/** Détermine le parcours selon le nb d'entités existantes et le choix de l'utilisateur. */
export function resolveOnboardingFlow(entityCount: number, chosenPath: OnboardingPath | null): OnboardingFlow {
  if (entityCount > 0) {
    return { case: 'completion', needsChoice: false, createsEntity: false, steps: ['name'] }
  }
  if (chosenPath === 'festivalier') {
    return { case: 'festivalier', needsChoice: false, createsEntity: false, steps: ['name', 'postal'] }
  }
  if (chosenPath === 'exposant') {
    return { case: 'exposant', needsChoice: false, createsEntity: true, steps: ['name', 'brand', 'craft', 'location', 'slug'] }
  }
  return { case: 'festivalier', needsChoice: true, createsEntity: false, steps: ['choice'] }
}

/** Handle perso unique : slugify(base), suffixe compteur si pris. `isTaken` injecté (testable). */
export async function resolveUniqueHandle(base: string, isTaken: (handle: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base) || 'membre'
  for (let i = 1; i <= 50; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`
    if (!(await isTaken(candidate))) return candidate
  }
  return `${root}-${Date.now()}`
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `pnpm test src/lib/onboarding.test.ts`
Expected: PASS (toutes les assertions).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/onboarding.ts src/lib/onboarding.test.ts
git commit -m "feat(onboarding): pure flow helpers (slugify, deriveDepartment, resolveOnboardingFlow, resolveUniqueHandle) + tests"
```

---

## Task 3 : Réécriture `Onboarding.tsx`

**Files :**
- Modify (rewrite): `src/pages/Onboarding.tsx`

- [ ] **Step 1 : Remplacer tout le contenu du fichier**

```tsx
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
  const nameTitle = flow.case === 'completion' ? 'Bienvenue ! Comment on t’appelle ?' : 'Comment on t’appelle ?'
  const nameSub = chosenPath === 'exposant' ? 'D’abord toi, la personne. Ta marque vient juste après.' : null

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
              {isLastInputStep ? (saving ? 'Enregistrement…' : 'C’est parti !') : 'Continuer'}
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
            <p className="text-muted-foreground">C’est l’entité sous laquelle tu exposes.</p>
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
            <p className="text-muted-foreground">Ton point de départ pour les distances et l’itinéraire.</p>
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
            <p className="text-muted-foreground">L’adresse de ta vitrine, à partager partout.</p>
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
```

- [ ] **Step 2 : Vérifier le build + lint**

Run: `pnpm build && pnpm lint`
Expected: 0 erreur.

- [ ] **Step 3 : Lancer la suite de tests**

Run: `pnpm test`
Expected: tous les fichiers passent (onboarding inclus).

- [ ] **Step 4 : Commit**

```bash
git add src/pages/Onboarding.tsx
git commit -m "feat(onboarding): rewire wizard onto actor model (person/entity, /u handle, slug live-check)"
```

---

## Task 4 : Vérification de bout en bout (smoke API local)

**Files :** aucun fichier commité (script jetable, supprimé après).

> Comme pour la fondation : pas de Playwright + `.env` distant → on pilote le **surface API réel** (le client supabase-js exact de l'app) contre le Supabase local, avec un vrai login OTP via Mailpit. Vérifie le parcours exposant (création entité via le même chemin que l'app) + le handle perso.

- [ ] **Step 1 : Écrire un script de smoke** `smoke2.mjs` à la racine

```javascript
import { createClient } from '@supabase/supabase-js'
const URL = 'http://127.0.0.1:54321'
const KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const MAILPIT = 'http://127.0.0.1:54324'
const email = `ob2_${Date.now()}@flwsh.dev`
const sb = createClient(URL, KEY)
const fail = (m) => { console.error('❌', m); process.exit(1) }

await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
await new Promise(r => setTimeout(r, 800))
const list = await fetch(`${MAILPIT}/api/v1/messages`).then(r => r.json())
const msg = list.messages.find(m => m.To.some(t => t.Address === email))
const body = await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`).then(r => r.json())
const token = (body.Text || body.HTML).match(/\b(\d{6})\b/)[1]
const { data: vs } = await sb.auth.verifyOtp({ email, token, type: 'email' })
const uid = vs.user.id

// Parcours exposant (mêmes appels que Onboarding.tsx)
await sb.from('users').update({ display_name: 'Uriel', handle: 'uriel' }).eq('actor_id', uid)
const { data: newId, error: er } = await sb.rpc('create_owned_entity', { p_type: 'exposant', p_brand_name: 'Rune de Chêne' })
if (er) fail('rpc: ' + er.message)
const { error: ee } = await sb.from('entities').update({
  craft_type: 'Forgeron', city: 'Lyon', department: '69', postal_code: '69003', public_slug: 'rune-' + Date.now(),
}).eq('actor_id', newId)
if (ee) fail('update entity: ' + ee.message)

const { data: u } = await sb.from('users').select('handle, display_name').eq('actor_id', uid).single()
if (u.handle !== 'uriel' || u.display_name !== 'Uriel') fail('users mal écrit: ' + JSON.stringify(u))
const { data: ms } = await sb.from('memberships').select('role, entities(brand_name, craft_type, public_slug)').eq('user_actor_id', uid)
if (ms.length !== 1 || ms[0].role !== 'owner' || ms[0].entities.craft_type !== 'Forgeron') fail('membership/entity KO: ' + JSON.stringify(ms))
console.log('✅ SMOKE PLAN2 PASS — person(handle) + create_owned_entity + entity update sous RLS:', ms[0].entities)
process.exit(0)
```

- [ ] **Step 2 : Lancer**

Run: `node smoke2.mjs`
Expected: `✅ SMOKE PLAN2 PASS …`

- [ ] **Step 3 : Nettoyer**

```bash
rm -f smoke2.mjs
```

---

## Auto-vérification (à faire après écriture)
- **Couverture spec** : namespace `/u/handle` (Task 1 `users.handle` + génération Task 2/3) ✓ ; 3 cas A/B/C (`resolveOnboardingFlow` + submit Task 3) ✓ ; slug sans `@` + live-check (Task 3) ✓ ; département dérivé (`deriveDepartment`) ✓ ; écrit `users`/`entities` jamais `profiles` (Task 3) ✓ ; switchActor exposant (Task 3) ✓ ; anti-doublon migré (cas `completion`) ✓.
- **Hors périmètre** non implémenté : DA, upload image, page profil festivalier, route `/u/:handle`, sélecteur multi-entités, admin.

## Risques & rollback
| Risque | Mitigation |
|---|---|
| Course sur le slug (live-check OK puis pris au submit) | Filet : l'UPDATE échoue sur la contrainte UNIQUE → message + retour étape slug (Task 3 `handleSubmit`). |
| Handle collision | `resolveUniqueHandle` boucle compteur + fallback timestamp. |
| Exposant migré repasse l'onboarding | Cas `completion` (entité existante) → pas de création. |
| `users.handle` non typé après migration | Step 4 de Task 1 régénère les types. |
