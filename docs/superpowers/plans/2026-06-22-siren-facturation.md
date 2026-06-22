# SIREN + raison sociale sur les factures — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collecter le SIREN (9 chiffres + Luhn) et la raison sociale du client, les pousser sur ses factures Stripe (champ personnalisé), via une modale avant le checkout et une section éditable dans la page Abonnement.

**Architecture:** 3 nouvelles colonnes nullable sur `entities` (non protégées par `protect_entity_plan`). Une lib pure `siren.ts` (validation Luhn + activation du bouton). Un helper edge partagé `_shared/billing.ts` (synchro Customer Stripe). L'edge function de checkout est étendue pour persister + synchroniser ; une nouvelle edge function `stripe-update-billing` couvre l'édition hors checkout (abonnés existants). Un composant `BillingInfoForm` réutilisé par la modale Boutique et la carte Abonnement.

**Tech Stack:** React 19 + TS, Vitest, Supabase (Postgres + Edge Functions Deno), Stripe SDK `npm:stripe@18.0.0` (apiVersion `2024-12-18.acacia`).

## Global Constraints

- Package manager : **pnpm**. Tests : **Vitest** (`pnpm test`). Build : `pnpm build`. Lint : `pnpm lint` (0 erreur attendu).
- On travaille sur **`main`** (= prod = atelier). Commit + bump `APP_VERSION` (patch) + push après chaque changement de code.
- Edge functions : import partagé via `../_shared/` (`getStripe`, `getSupabaseAdmin`, `corsHeaders`). Stripe `apiVersion: '2024-12-18.acacia'`.
- Le param SQL de `can_act_as` s'appelle **`target_actor`** (pas `target_actor_id`), sinon PGRST202.
- Le trigger `protect_entity_plan` ne garde QUE `plan`/`comped_pro_until`/`is_ambassador` → les nouvelles colonnes de facturation sont librement éditables par le propriétaire (RLS owner-update existante) ET par la service-role.
- Types Supabase : les nouvelles colonnes ne seront pas dans `Database` généré → **caster** localement (`as EntityRow & { legal_name?: string | null; siren?: string | null; billing_no_siren?: boolean | null }`), précédent projet (cf. reference_supabase_rpc_types). NE PAS bloquer sur la régén de types.
- Tokens DA / CSS : réutiliser la coquille modale et les tokens existants, **pas de classe globale générique nouvelle** (collisions CSS globales du projet).

---

### Task 1: Migration — colonnes de facturation sur `entities`

**Files:**
- Create: `supabase/migrations/20260622120000_entities_billing_siren.sql`

**Interfaces:**
- Produces: colonnes `entities.legal_name TEXT`, `entities.siren TEXT`, `entities.billing_no_siren BOOLEAN NOT NULL DEFAULT false`.

- [ ] **Step 1: Écrire la migration**

```sql
-- Facturation B2B : raison sociale + SIREN du client, pour des factures conformes
-- (réforme facturation électronique : SIREN client obligatoire sur factures B2B).
-- Stripe ne collecte pas le SIREN (FR = eu_vat seulement) → on le stocke ici et on
-- le pousse sur les factures via invoice_settings.custom_fields.
-- Ces colonnes NE SONT PAS protégées par protect_entity_plan (elles ne sont pas
-- des colonnes plan/abonnement) : le propriétaire peut les éditer via RLS owner-update.

ALTER TABLE public.entities
  ADD COLUMN legal_name TEXT,
  ADD COLUMN siren TEXT,
  ADD COLUMN billing_no_siren BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.entities.legal_name IS
  'Raison sociale légale du client (ex. « Uriel Lahoussaye EI »), distincte de brand_name (la marque). Imprimée comme name du Customer Stripe.';
COMMENT ON COLUMN public.entities.siren IS
  'SIREN du client, 9 chiffres normalisés (sans espaces). NULL si billing_no_siren. Poussé en custom_field sur les factures Stripe.';
COMMENT ON COLUMN public.entities.billing_no_siren IS
  'Case « Je n''ai pas de SIREN » (client étranger/particulier) : autorise l''absence de SIREN sans bloquer le checkout.';
```

- [ ] **Step 2: Appliquer en prod (avec le GO d'Uriel)**

Via MCP Supabase `apply_migration` (name: `entities_billing_siren`) ou `supabase db push`. Demander le GO avant.
Expected : migration appliquée, 3 colonnes présentes.

- [ ] **Step 3: Vérifier**

Via MCP `execute_sql` :
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'entities' AND column_name IN ('legal_name','siren','billing_no_siren')
ORDER BY column_name;
```
Expected : 3 lignes (`billing_no_siren` boolean default false, `legal_name` text, `siren` text).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260622120000_entities_billing_siren.sql
git commit -m "feat(facturation): colonnes legal_name/siren/billing_no_siren sur entities"
```

---

### Task 2: Lib pure `siren.ts` — validation Luhn + activation du formulaire (TDD)

**Files:**
- Create: `src/lib/siren.ts`
- Test: `src/lib/siren.test.ts`

**Interfaces:**
- Produces:
  - `validateSiren(input: string): { valid: boolean; normalized: string }` — retire tout non-chiffre, exige exactement 9 chiffres + clé de Luhn.
  - `billingFormReady(v: { legalName: string; siren: string; noSiren: boolean }): boolean` — true si `legalName` non vide ET (`noSiren` coché OU `siren` valide).

- [ ] **Step 1: Écrire les tests**

```ts
import { describe, it, expect } from 'vitest'
import { validateSiren, billingFormReady } from './siren'

describe('validateSiren', () => {
  it('accepte un SIREN valide (Luhn) et le normalise', () => {
    // 552100554 = SIREN Renault (Luhn valide)
    expect(validateSiren('552 100 554')).toEqual({ valid: true, normalized: '552100554' })
    expect(validateSiren('404833048')).toEqual({ valid: true, normalized: '404833048' }) // Google France
  })
  it('refuse une longueur ≠ 9 chiffres', () => {
    expect(validateSiren('5521005')).toEqual({ valid: false, normalized: '5521005' })
    expect(validateSiren('5521005541')).toEqual({ valid: false, normalized: '5521005541' })
  })
  it('refuse une clé de Luhn invalide', () => {
    expect(validateSiren('123456789')).toEqual({ valid: false, normalized: '123456789' })
  })
  it('refuse vide / non numérique', () => {
    expect(validateSiren('')).toEqual({ valid: false, normalized: '' })
    expect(validateSiren('abcdefghi')).toEqual({ valid: false, normalized: '' })
  })
})

describe('billingFormReady', () => {
  it('prêt si raison sociale + SIREN valide', () => {
    expect(billingFormReady({ legalName: 'Rune de Chêne EI', siren: '552100554', noSiren: false })).toBe(true)
  })
  it('prêt si raison sociale + case « pas de SIREN »', () => {
    expect(billingFormReady({ legalName: 'Foreign Ltd', siren: '', noSiren: true })).toBe(true)
  })
  it('pas prêt si raison sociale vide', () => {
    expect(billingFormReady({ legalName: '  ', siren: '552100554', noSiren: false })).toBe(false)
  })
  it('pas prêt si SIREN invalide et case décochée', () => {
    expect(billingFormReady({ legalName: 'X', siren: '123456789', noSiren: false })).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `pnpm test src/lib/siren.test.ts`
Expected: FAIL (module `./siren` introuvable).

- [ ] **Step 3: Implémenter `siren.ts`**

```ts
// Validation du SIREN (9 chiffres, clé de Luhn) + logique d'activation du formulaire
// de facturation. Pur, sans dépendance React — réutilisé par la modale Boutique et
// la carte Abonnement.

/** Normalise (retire tout non-chiffre) et valide un SIREN : 9 chiffres + clé de Luhn. */
export function validateSiren(input: string): { valid: boolean; normalized: string } {
  const normalized = (input ?? '').replace(/\D/g, '')
  if (normalized.length !== 9) return { valid: false, normalized }
  return { valid: luhnValid(normalized), normalized }
}

function luhnValid(digits: string): boolean {
  let sum = 0
  // Luhn : en partant de la droite, on double un chiffre sur deux (positions paires depuis la droite).
  for (let i = 0; i < digits.length; i++) {
    let d = digits.charCodeAt(digits.length - 1 - i) - 48
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

/** Le formulaire de facturation est prêt à soumettre. */
export function billingFormReady(v: { legalName: string; siren: string; noSiren: boolean }): boolean {
  if (v.legalName.trim().length === 0) return false
  if (v.noSiren) return true
  return validateSiren(v.siren).valid
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `pnpm test src/lib/siren.test.ts`
Expected: PASS (4 + 4 assertions vertes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/siren.ts src/lib/siren.test.ts
git commit -m "feat(facturation): lib siren — validation Luhn + activation formulaire (TDD)"
```

---

### Task 3: Helper Stripe partagé + extension de `stripe-checkout-session`

**Files:**
- Create: `supabase/functions/_shared/billing.ts`
- Modify: `supabase/functions/stripe-checkout-session/index.ts`
- Modify: `src/lib/stripe-client.ts`

**Interfaces:**
- Consumes: rien (Task 1 colonnes en base).
- Produces:
  - `_shared/billing.ts` → `syncCustomerBilling(stripe, customerId, b: { legalName: string; siren: string | null; noSiren: boolean }): Promise<void>`.
  - `startCheckout(entityId, billingInterval, billing?: { legalName: string; siren: string | null; noSiren: boolean })` — 3ᵉ param optionnel relayé dans le body.

- [ ] **Step 1: Créer le helper `_shared/billing.ts`**

```ts
// Synchro des infos de facturation client vers le Customer Stripe :
// - name = raison sociale (s'imprime sur la facture)
// - invoice_settings.custom_fields = SIREN (s'imprime sur chaque facture)
// - metadata.siren pour la traçabilité
// Stripe ne supporte pas de tax ID FR SIREN ; on passe donc par un champ personnalisé.
import type Stripe from 'npm:stripe@18.0.0'

export async function syncCustomerBilling(
  stripe: Stripe,
  customerId: string,
  b: { legalName: string; siren: string | null; noSiren: boolean },
): Promise<void> {
  await stripe.customers.update(customerId, {
    name: b.legalName,
    invoice_settings: {
      custom_fields: b.siren ? [{ name: 'SIREN', value: b.siren }] : null,
    },
    metadata: { siren: b.siren ?? '' },
  })
}
```

- [ ] **Step 2: Étendre l'edge function checkout — body + persistance + synchro**

Dans `supabase/functions/stripe-checkout-session/index.ts` :

Remplacer l'interface `Body` (lignes 17-20) par :
```ts
interface Body {
  entityId: string
  billingInterval: 'month' | 'year'
  legalName?: string
  siren?: string | null
  noSiren?: boolean
}
```

Ajouter l'import (près des autres `_shared`) :
```ts
import { syncCustomerBilling } from '../_shared/billing.ts'
```

Après la validation du body (après la ligne `if (!body.entityId || ...) return json({ error: 'invalid_body' }, 400)`), ajouter la normalisation des champs facturation :
```ts
    // Infos de facturation (optionnelles ici : la modale Boutique les fournit, mais une
    // entité déjà renseignée peut souscrire sans les renvoyer).
    const legalName = (body.legalName ?? '').trim() || (entity?.brand_name ?? '')
    const noSiren = body.noSiren === true
    const siren = noSiren ? null : ((body.siren ?? '').replace(/\D/g, '') || null)
```
⚠️ `entity` n'est lu qu'après ce point dans le code actuel : déplacer ce bloc APRÈS la lecture de `entity` (après le bloc `const { data: entity, ... }`), avant la récupération/création du Customer. (Le `legalName` a besoin de `entity.brand_name` en fallback.)

Persister sur l'entité (juste avant la récupération du Customer) :
```ts
    await admin
      .from('entities')
      .update({ legal_name: legalName, siren, billing_no_siren: noSiren })
      .eq('actor_id', entity.actor_id)
```

À la création du Customer (bloc `if (!customerId)`), passer le `name` = raison sociale :
```ts
      const customer = await stripe.customers.create({
        email: user.email,
        name: legalName || entity.brand_name || undefined,
        metadata: { entity_actor_id: entity.actor_id },
      })
```

Après avoir obtenu `customerId` (que le Customer soit neuf ou existant), synchroniser la facturation :
```ts
    await syncCustomerBilling(stripe, customerId, { legalName: legalName || entity.brand_name || '', siren, noSiren })
```

Dans l'objet `stripe.checkout.sessions.create`, **retirer `name: 'auto'`** de `customer_update` pour ne pas écraser la raison sociale (garder l'adresse) :
```ts
      customer_update: { address: 'auto' },
```

- [ ] **Step 3: Étendre `startCheckout` côté client**

Dans `src/lib/stripe-client.ts`, remplacer la signature et le body (lignes 20-24) :
```ts
export interface BillingInfo { legalName: string; siren: string | null; noSiren: boolean }

/** Démarre Stripe Checkout. Si l'entité est déjà abonnée, redirige vers le portail. */
export async function startCheckout(
  entityId: string,
  billingInterval: BillingInterval,
  billing?: BillingInfo,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke<CheckoutResponse>(
    'stripe-checkout-session',
    { body: { entityId, billingInterval, ...(billing ?? {}) } },
  )
```
(Le reste de la fonction inchangé.)

- [ ] **Step 4: Vérifier build + lint**

Run: `pnpm build && pnpm lint`
Expected: build OK, 0 erreur de lint (les edge functions Deno ne sont pas typecheckées par `pnpm build`, normal).

- [ ] **Step 5: Déployer les functions (avec le GO d'Uriel)**

Run: `supabase functions deploy stripe-checkout-session`
Expected: déploiement OK. (À faire APRÈS Task 1 appliquée.)

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/billing.ts supabase/functions/stripe-checkout-session/index.ts src/lib/stripe-client.ts
git commit -m "feat(facturation): synchro raison sociale + SIREN vers Customer Stripe au checkout"
```

---

### Task 4: Composant `BillingInfoForm` + modale avant checkout (Boutique)

**Files:**
- Create: `src/components/billing/BillingInfoForm.tsx`
- Create: `src/components/billing/BillingInfoModal.tsx`
- Create: `src/components/billing/BillingInfo.css`
- Modify: `src/pages/Boutique.tsx`

**Interfaces:**
- Consumes: `validateSiren`, `billingFormReady` (Task 2) ; `BillingInfo`, `startCheckout` (Task 3).
- Produces:
  - `BillingInfoForm` props : `{ value: BillingInfoState; onChange: (v: BillingInfoState) => void }` où `BillingInfoState = { legalName: string; siren: string; noSiren: boolean }`.
  - `BillingInfoModal` props : `{ initial: BillingInfoState; onSubmit: (v: BillingInfoState) => void; onCancel: () => void; submitLabel: string; busy?: boolean }`.

- [ ] **Step 1: Créer `BillingInfoForm.tsx` (champs purs, contrôlés)**

```tsx
import { validateSiren } from '@/lib/siren'
import './BillingInfo.css'

export interface BillingInfoState { legalName: string; siren: string; noSiren: boolean }

export function BillingInfoForm({ value, onChange }: {
  value: BillingInfoState
  onChange: (v: BillingInfoState) => void
}) {
  const sirenInvalid = !value.noSiren && value.siren.trim().length > 0 && !validateSiren(value.siren).valid
  return (
    <div className="billing-form">
      <label className="billing-field">
        <span>Raison sociale</span>
        <input
          type="text"
          value={value.legalName}
          onChange={e => onChange({ ...value, legalName: e.target.value })}
          placeholder="Ex. Atelier Rune de Chêne (EI)"
          autoComplete="organization"
        />
      </label>

      {!value.noSiren && (
        <label className="billing-field">
          <span>SIREN (9 chiffres)</span>
          <input
            type="text"
            inputMode="numeric"
            value={value.siren}
            onChange={e => onChange({ ...value, siren: e.target.value })}
            placeholder="552 100 554"
            aria-invalid={sirenInvalid}
          />
          {sirenInvalid && <em className="billing-error">SIREN invalide (9 chiffres, clé de contrôle).</em>}
        </label>
      )}

      <label className="billing-check">
        <input
          type="checkbox"
          checked={value.noSiren}
          onChange={e => onChange({ ...value, noSiren: e.target.checked, siren: e.target.checked ? '' : value.siren })}
        />
        <span>Je n'ai pas de SIREN (étranger / particulier)</span>
      </label>
    </div>
  )
}
```

- [ ] **Step 2: Créer `BillingInfoModal.tsx`**

```tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { billingFormReady, validateSiren } from '@/lib/siren'
import { BillingInfoForm, type BillingInfoState } from './BillingInfoForm'
import './BillingInfo.css'

export function BillingInfoModal({ initial, onSubmit, onCancel, submitLabel, busy }: {
  initial: BillingInfoState
  onSubmit: (v: BillingInfoState) => void
  onCancel: () => void
  submitLabel: string
  busy?: boolean
}) {
  const [value, setValue] = useState<BillingInfoState>(initial)
  const ready = billingFormReady(value)
  return (
    <div className="billing-backdrop" onClick={onCancel}>
      <div className="billing-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>Informations de facturation</h2>
        <p className="billing-intro">Pour une facture conforme, indique ta raison sociale et ton SIREN.</p>
        <BillingInfoForm value={value} onChange={setValue} />
        <div className="billing-actions">
          <button className="billing-cancel" onClick={onCancel} disabled={busy}>Annuler</button>
          <button
            className="billing-submit"
            disabled={!ready || busy}
            onClick={() => onSubmit({ ...value, siren: value.noSiren ? '' : validateSiren(value.siren).normalized })}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}{submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Créer `BillingInfo.css` (tokens DA existants)**

```css
.billing-backdrop {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.billing-modal {
  background: hsl(var(--card)); color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border)); border-radius: 16px;
  width: min(440px, 100%); padding: 1.5rem; box-shadow: 0 20px 60px rgba(0,0,0,.35);
}
.billing-modal h2 { margin: 0 0 .25rem; font-size: 1.15rem; }
.billing-intro { margin: 0 0 1rem; color: hsl(var(--muted-foreground)); font-size: .9rem; }
.billing-form { display: flex; flex-direction: column; gap: .9rem; }
.billing-field { display: flex; flex-direction: column; gap: .35rem; font-size: .85rem; }
.billing-field input[type="text"] {
  padding: .6rem .7rem; border-radius: 10px;
  border: 1px solid hsl(var(--border)); background: hsl(var(--background)); color: hsl(var(--foreground));
}
.billing-error { color: hsl(var(--status-refuse, 0 70% 55%)); font-style: normal; font-size: .8rem; }
.billing-check { display: flex; align-items: center; gap: .5rem; font-size: .85rem; color: hsl(var(--muted-foreground)); }
.billing-actions { display: flex; justify-content: flex-end; gap: .6rem; margin-top: 1.25rem; }
.billing-cancel, .billing-submit {
  padding: .55rem 1rem; border-radius: 10px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: .4rem;
}
.billing-cancel { background: transparent; border: 1px solid hsl(var(--border)); color: hsl(var(--foreground)); }
.billing-submit { background: var(--copper); border: none; color: #fff; }
.billing-submit:disabled { opacity: .5; cursor: not-allowed; }
```

- [ ] **Step 4: Brancher la modale dans `Boutique.tsx`**

Ajouter les imports :
```tsx
import { BillingInfoModal } from '@/components/billing/BillingInfoModal'
import type { BillingInfoState } from '@/components/billing/BillingInfoForm'
```

Ajouter l'état (près des autres `useState`) :
```tsx
  const [pendingInterval, setPendingInterval] = useState<BillingInterval | null>(null)
```

Caster l'entité pour lire les champs facturation (sous `const targetEntity = ...`) :
```tsx
  const billingEntity = targetEntity as (EntityRow & { legal_name?: string | null; siren?: string | null; billing_no_siren?: boolean | null }) | null
  const hasBilling = !!billingEntity && !!billingEntity.legal_name && (!!billingEntity.siren || billingEntity.billing_no_siren === true)
```

Remplacer `handleClick` : si l'entité a déjà ses infos → checkout direct ; sinon ouvrir la modale.
```tsx
  const handleClick = async (interval: BillingInterval) => {
    if (!targetEntityId) return
    setError(null)
    if (!hasBilling) { setPendingInterval(interval); return }
    setLoading(interval)
    try {
      await startCheckout(targetEntityId, interval)
    } catch (e) {
      console.error('[Boutique] checkout failed', e)
      setError("Impossible de démarrer le paiement. Réessaie dans un instant.")
      setLoading(null)
    }
  }

  const handleBillingSubmit = async (v: BillingInfoState) => {
    if (!targetEntityId || !pendingInterval) return
    const interval = pendingInterval
    setLoading(interval)
    setPendingInterval(null)
    try {
      await startCheckout(targetEntityId, interval, { legalName: v.legalName.trim(), siren: v.noSiren ? null : v.siren, noSiren: v.noSiren })
    } catch (e) {
      console.error('[Boutique] checkout failed', e)
      setError("Impossible de démarrer le paiement. Réessaie dans un instant.")
      setLoading(null)
    }
  }
```

Rendre la modale (avant la fermeture du `</div>` racine) :
```tsx
      {pendingInterval && billingEntity && (
        <BillingInfoModal
          initial={{ legalName: billingEntity.legal_name ?? billingEntity.brand_name ?? '', siren: billingEntity.siren ?? '', noSiren: billingEntity.billing_no_siren === true }}
          submitLabel="Continuer vers le paiement"
          busy={loading !== null}
          onCancel={() => setPendingInterval(null)}
          onSubmit={handleBillingSubmit}
        />
      )}
```

- [ ] **Step 5: Vérifier build + lint**

Run: `pnpm build && pnpm lint`
Expected: build OK, 0 erreur de lint.

- [ ] **Step 6: Commit**

```bash
git add src/components/billing/ src/pages/Boutique.tsx
git commit -m "feat(facturation): modale raison sociale + SIREN avant le checkout (Boutique)"
```

---

### Task 5: Edge function `stripe-update-billing` + carte éditable (Abonnement)

**Files:**
- Create: `supabase/functions/stripe-update-billing/index.ts`
- Modify: `supabase/config.toml:404-415` (ajouter le bloc `[functions.stripe-update-billing]`)
- Modify: `src/lib/stripe-client.ts`
- Modify: `src/pages/Abonnement.tsx`
- Modify: `src/pages/Abonnement.css`

**Interfaces:**
- Consumes: `syncCustomerBilling` (Task 3), `BillingInfoForm`/`BillingInfoModal` (Task 4), `validateSiren`/`billingFormReady` (Task 2).
- Produces: `updateBillingInfo(entityId: string, billing: BillingInfo): Promise<void>` dans `stripe-client.ts`.

- [ ] **Step 1: Créer l'edge function `stripe-update-billing/index.ts`**

```ts
// stripe-update-billing : persiste raison sociale + SIREN sur l'entité et, si un Customer
// Stripe existe déjà, synchronise son name + custom_field SIREN. Couvre l'édition hors
// checkout (abonnés existants qui se mettent en règle).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { getStripe } from '../_shared/stripe.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { syncCustomerBilling } from '../_shared/billing.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface Body { entityId: string; legalName: string; siren?: string | null; noSiren?: boolean }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const body = (await req.json()) as Body
    if (!body.entityId || !body.legalName?.trim()) return json({ error: 'invalid_body' }, 400)

    const { data: canAct, error: canActErr } = await userClient
      .rpc('can_act_as', { target_actor: body.entityId })
    if (canActErr) return json({ error: 'authz_failed' }, 500)
    if (!canAct) return json({ error: 'forbidden' }, 403)

    const noSiren = body.noSiren === true
    const siren = noSiren ? null : ((body.siren ?? '').replace(/\D/g, '') || null)
    const legalName = body.legalName.trim()

    const admin = getSupabaseAdmin()
    const { data: entity, error: entityErr } = await admin
      .from('entities')
      .select('actor_id, stripe_customer_id')
      .eq('actor_id', body.entityId)
      .maybeSingle()
    if (entityErr || !entity) return json({ error: 'entity_not_found' }, 404)

    await admin
      .from('entities')
      .update({ legal_name: legalName, siren, billing_no_siren: noSiren })
      .eq('actor_id', entity.actor_id)

    if (entity.stripe_customer_id) {
      const stripe = getStripe()
      await syncCustomerBilling(stripe, entity.stripe_customer_id, { legalName, siren, noSiren })
    }

    return json({ ok: true })
  } catch (err) {
    console.error('[update-billing] internal error', err)
    return json({ error: 'internal_error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Déclarer la function dans `config.toml`**

Après le bloc `[functions.stripe-portal-link]` (vers la ligne 410), ajouter :
```toml
[functions.stripe-update-billing]
verify_jwt = true
```

- [ ] **Step 3: Ajouter `updateBillingInfo` au client Stripe**

Dans `src/lib/stripe-client.ts`, après `openCustomerPortal` :
```ts
/** Persiste raison sociale + SIREN et synchronise le Customer Stripe (édition hors checkout). */
export async function updateBillingInfo(entityId: string, billing: BillingInfo): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    'stripe-update-billing',
    { body: { entityId, ...billing } },
  )
  if (error) throw new Error(error.message || 'update_billing_failed')
  if (!data?.ok) throw new Error(data?.error || 'update_billing_failed')
}
```

- [ ] **Step 4: Ajouter la carte « Facturation » dans `Abonnement.tsx`**

Imports :
```tsx
import { useState } from 'react' // déjà importé ; sinon compléter
import { updateBillingInfo } from '@/lib/stripe-client'
import { BillingInfoModal } from '@/components/billing/BillingInfoModal'
import type { BillingInfoState } from '@/components/billing/BillingInfoForm'
```

Caster l'entité (près de `const entity = ...`) pour lire les champs facturation :
```tsx
  const billing = entity as (typeof entity & { legal_name?: string | null; siren?: string | null; billing_no_siren?: boolean | null })
```

État + handler (dans le composant) :
```tsx
  const [editBilling, setEditBilling] = useState(false)
  const [savingBilling, setSavingBilling] = useState(false)

  const handleSaveBilling = async (v: BillingInfoState) => {
    if (!targetEntityId) return
    setSavingBilling(true)
    try {
      await updateBillingInfo(targetEntityId, { legalName: v.legalName.trim(), siren: v.noSiren ? null : v.siren, noSiren: v.noSiren })
      await refreshProfile()
      setEditBilling(false)
    } catch (e) {
      console.error('[Abonnement] save billing failed', e)
    } finally {
      setSavingBilling(false)
    }
  }
```

Rendre la carte (juste avant le bouton « Gérer mon abonnement », et aussi dans le early-return « pas d'abonnement actif » si tu veux — au minimum dans le rendu principal). Carte :
```tsx
      <div className="abo-card abo-billing">
        <h2>Informations de facturation</h2>
        {billing?.legal_name
          ? <p>{billing.legal_name}{billing.siren ? <> · SIREN {billing.siren}</> : billing.billing_no_siren ? <> · sans SIREN</> : null}</p>
          : <p className="abo-muted">Aucune info de facturation. Ajoute ta raison sociale et ton SIREN pour des factures conformes.</p>}
        <button className="abo-billing-edit" onClick={() => setEditBilling(true)}>Modifier</button>
      </div>

      {editBilling && (
        <BillingInfoModal
          initial={{ legalName: billing?.legal_name ?? entity?.brand_name ?? '', siren: billing?.siren ?? '', noSiren: billing?.billing_no_siren === true }}
          submitLabel="Enregistrer"
          busy={savingBilling}
          onCancel={() => setEditBilling(false)}
          onSubmit={handleSaveBilling}
        />
      )}
```
⚠️ Cette carte doit être rendue dans le **return principal** (status active/trialing/past_due) ET, idéalement, dans le early-return « pas d'abonnement actif » (lignes 88-108) pour qu'une entité gratuite puisse aussi pré-remplir. Au minimum : return principal. Placer le `useState` AVANT tout `return` (règle des hooks).

- [ ] **Step 5: Style minimal dans `Abonnement.css`**

```css
.abo-billing-edit {
  margin-top: .5rem; padding: .4rem .9rem; border-radius: 10px;
  background: transparent; border: 1px solid hsl(var(--border)); color: hsl(var(--foreground));
  font-weight: 600; cursor: pointer;
}
```

- [ ] **Step 6: Vérifier build + lint**

Run: `pnpm build && pnpm lint`
Expected: build OK, 0 erreur de lint.

- [ ] **Step 7: Déployer la function (avec le GO d'Uriel)**

Run: `supabase functions deploy stripe-update-billing`
Expected: déploiement OK.

- [ ] **Step 8: Bump version + commit**

Bump `APP_VERSION` (patch) dans `src/version.ts`, puis :
```bash
git add supabase/functions/stripe-update-billing/ supabase/config.toml src/lib/stripe-client.ts src/pages/Abonnement.tsx src/pages/Abonnement.css src/version.ts
git commit -m "feat(facturation): édition raison sociale + SIREN dans Abonnement (abonnés existants)"
git push
```

---

## Recette live (Uriel, Stripe test mode — après déploiement)

1. Entité gratuite → Boutique → clic essai → **modale SIREN** → saisie valide → checkout → vérifier `entities.siren`/`legal_name` peuplés + Customer Stripe `name` = raison sociale + **custom field « SIREN »** visible sur la facture.
2. Case « Je n'ai pas de SIREN » → checkout passe, pas de custom field.
3. Abonné existant → Abonnement → carte **Facturation** → « Modifier » → saisie → vérifier maj immédiate du Customer Stripe.
4. **SIRET émetteur Fellowship** : renseigner dans le Dashboard Stripe (Coordonnées société + Account tax ID) → visible en tête de facture. (Manuel, hors code — checklist à dérouler avec le SIRET sous la main.)

## Notes de couverture du spec

- Collecte SIREN + raison sociale → Tasks 2, 4.
- Validation 9 chiffres + Luhn → Task 2.
- Modale avant checkout, obligatoire + case d'échappement → Task 4.
- Section éditable Abonnement (abonnés existants) → Task 5.
- Synchro custom_field Stripe + name → Tasks 3, 5.
- Colonnes DB non protégées par le trigger → Task 1.
- SIRET émetteur (manuel) → recette, hors code.
- Hors scope : Factur-X/PDP (2027), collecte TVA (déjà via `tax_id_collection`).
