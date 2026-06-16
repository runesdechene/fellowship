# Parrainage Fellowship — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le parrainage « Offre un mois, gagne un mois » : essai 30j pour le filleul, crédit/Pro offert au parrain à la 1ʳᵉ facture payée du filleul, badge Ambassadeur, le tout attaché à l'entité.

**Architecture:** L'entité est l'unité de parrainage. Deux nouvelles tables (`referral_codes`, `referrals`) + deux colonnes sur `entities` (`comped_pro_until`, `is_ambassador`). L'attribution se fait via RPC `SECURITY DEFINER` ; la récompense parrain est déclenchée par le webhook Stripe sur `invoice.payment_succeeded` (montant > 0). Le gating Pro central (`planForActor`) lit aussi `comped_pro_until`. Aucune nouvelle faille : le webhook (service-role) reste seul à écrire `plan`/`comped_pro_until`/`is_ambassador` (trigger `protect_entity_plan` étendu).

**Tech Stack:** React 19 + TS, Supabase (Postgres + RLS + Deno edge functions), Stripe (npm:stripe@18, customer balance + trial), Vitest (tests de fonctions pures uniquement).

**Spec de référence :** `docs/superpowers/specs/2026-06-16-parrainage-design.md`

---

## Décisions verrouillées (rappel)

- **Parrain = entité, point.** Une personne sans vitrine n'est pas parrain.
- **Filleul** : essai 30j (pas 14) — PAS de coupon (buggait sur l'annuel). Un seul octroi à vie (`filleul_gift_granted`).
- **Parrain Pro** : crédit `customer balance` d'un mois de son plan. **Parrain gratuit** : `comped_pro_until += 1 mois`.
- **Déclencheur** : `invoice.payment_succeeded` avec `amount_paid > 0` (anti-fraude).
- **Badge Ambassadeur** : `entities.is_ambassador = true` au 1er filleul `rewarded`, permanent.
- **Zéro plafond.**

## Carte des fichiers

**Migrations (créés) :**
- `supabase/migrations/20260616120000_referral_entities_columns.sql` — colonnes `comped_pro_until` + `is_ambassador` + trigger `protect_entity_plan` étendu.
- `supabase/migrations/20260616120100_referral_tables.sql` — tables `referral_codes`, `referrals`, RLS.
- `supabase/migrations/20260616120200_referral_rpcs.sql` — RPC `ensure_referral_code`, `get_referral_overview`, `attribute_referral`.

**Lib pures (créés/testés) :**
- `src/lib/referral.ts` + `src/lib/referral.test.ts` — `normalizeReferralCode`, `monthlyCreditCents`, `isAmbassador`, `referralLink`.
- `src/lib/referral-capture.ts` — capture `?r=` (localStorage).
- `src/lib/navModel.test.ts` (créé) — couvre `planForActor` + `comped_pro_until`.

**Edge functions (modifiés) :**
- `supabase/functions/stripe-checkout-session/index.ts` — essai 30j si filleul parrainé.
- `supabase/functions/stripe-webhook/index.ts` — récompense parrain + marquage gift + ambassadeur.

**Front (modifiés/créés) :**
- `src/lib/navModel.ts` — `planForActor` lit `comped_pro_until`.
- `src/main.tsx` — appel `captureReferralFromUrl()` au boot.
- `src/pages/Onboarding.tsx` — champ code + appel `attribute_referral`.
- `src/hooks/use-referral.ts` (créé) — code + stats.
- `src/components/abonnement/ReferralCard.tsx` (créé) + insertion dans `src/pages/Abonnement.tsx`.
- `src/components/ui/AmbassadeurBadge.tsx` (créé) + insertion dans `src/components/vitrine/VitrineHeader.tsx`.
- `src/components/mes-dates/DateQuotaModal.tsx` — ligne « ou parraine un ami ».

**Manuel (hors code) :** aucune (plus de coupon Stripe à créer — bénéfice du choix essai 30j).

---

## Task 1: Fonctions pures de parrainage (TDD)

**Files:**
- Create: `src/lib/referral.ts`
- Test: `src/lib/referral.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/referral.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizeReferralCode, monthlyCreditCents, isAmbassador, referralLink } from './referral'

describe('normalizeReferralCode', () => {
  it('majuscule, retire accents et non-alphanum', () => {
    expect(normalizeReferralCode('Rune de Chêne')).toBe('RUNEDECHENE')
    expect(normalizeReferralCode('  l’Atelier #1 ')).toBe('LATELIER1')
  })
  it('tronque à 20 caractères', () => {
    expect(normalizeReferralCode('A'.repeat(30))).toBe('A'.repeat(20))
  })
})

describe('monthlyCreditCents', () => {
  it('mensuel = montant tel quel', () => {
    expect(monthlyCreditCents(1199, 'month')).toBe(1199)
  })
  it('annuel = montant / 12 arrondi', () => {
    expect(monthlyCreditCents(11988, 'year')).toBe(999)
  })
  it('0 ou négatif = 0', () => {
    expect(monthlyCreditCents(0, 'month')).toBe(0)
    expect(monthlyCreditCents(-5, 'year')).toBe(0)
  })
})

describe('isAmbassador', () => {
  it('true seulement si is_ambassador === true', () => {
    expect(isAmbassador({ is_ambassador: true })).toBe(true)
    expect(isAmbassador({ is_ambassador: false })).toBe(false)
    expect(isAmbassador({})).toBe(false)
    expect(isAmbassador(null)).toBe(false)
  })
})

describe('referralLink', () => {
  it('construit le lien ?r=', () => {
    expect(referralLink('https://flwsh.app', 'RUNEDECHENE')).toBe('https://flwsh.app/?r=RUNEDECHENE')
    expect(referralLink('https://flwsh.app/', 'ABC')).toBe('https://flwsh.app/?r=ABC')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/referral.test.ts`
Expected: FAIL — `Failed to resolve import './referral'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/referral.ts`:

```ts
// Fonctions pures du parrainage. La normalisation est partagée (capture ?r=, onboarding,
// et passée en base à l'RPC ensure_referral_code) : un seul endroit testé pour les accents.

/** Normalise un nom de marque en code de parrainage : MAJ, sans accents, alphanumérique, ≤20. */
export function normalizeReferralCode(input: string): string {
  return input
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents (Chêne → Chene)
    .toUpperCase().replace(/[^A-Z0-9]/g, '')
    .slice(0, 20)
}

/** Crédit « un mois » en centimes selon l'intervalle de facturation du parrain. */
export function monthlyCreditCents(unitAmount: number, interval: 'month' | 'year'): number {
  if (unitAmount <= 0) return 0
  return interval === 'year' ? Math.round(unitAmount / 12) : unitAmount
}

/** Badge Ambassadeur : entité ayant amené ≥1 filleul payant (permanent, posé par le webhook). */
export function isAmbassador(entity: { is_ambassador?: boolean | null } | null | undefined): boolean {
  return entity?.is_ambassador === true
}

/** Lien de parrainage partageable (digital). */
export function referralLink(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}/?r=${code}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/referral.test.ts`
Expected: PASS (4 describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/referral.ts src/lib/referral.test.ts
git commit -m "feat(parrainage): fonctions pures (normalize, crédit mensuel, badge, lien)"
```

---

## Task 2: Gating Pro lit `comped_pro_until` (TDD)

**Files:**
- Modify: `src/lib/navModel.ts:109-113`
- Test: `src/lib/navModel.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/lib/navModel.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { planForActor } from './navModel'

const entity = { kind: 'entity' }
const person = { kind: 'person' }
const future = new Date(Date.now() + 86_400_000).toISOString() // +1j
const past = new Date(Date.now() - 86_400_000).toISOString()   // -1j

describe('planForActor', () => {
  it('personne = toujours free', () => {
    expect(planForActor(person, { plan: 'pro' })).toBe('free')
  })
  it('entité plan=pro = pro', () => {
    expect(planForActor(entity, { plan: 'pro' })).toBe('pro')
  })
  it('entité gratuite mais comped_pro_until futur = pro', () => {
    expect(planForActor(entity, { plan: 'free', comped_pro_until: future })).toBe('pro')
  })
  it('comped_pro_until expiré = free', () => {
    expect(planForActor(entity, { plan: 'free', comped_pro_until: past })).toBe('free')
  })
  it('pas de comped = free', () => {
    expect(planForActor(entity, { plan: 'free' })).toBe('free')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/navModel.test.ts`
Expected: FAIL on « comped_pro_until futur = pro » (renvoie 'free' avant la modif).

- [ ] **Step 3: Modify `planForActor`**

In `src/lib/navModel.ts`, replace lines 109-113:

```ts
export function planForActor(actor: { kind: string } | null, entityRow: unknown): Plan {
  if (actor?.kind !== 'entity') return 'free'
  const e = entityRow as { plan?: Plan | null; comped_pro_until?: string | null } | null | undefined
  if (e?.plan === 'pro') return 'pro'
  // Pro offert via parrainage (hors Stripe) : actif tant que la date n'est pas passée.
  if (e?.comped_pro_until && new Date(e.comped_pro_until) > new Date()) return 'pro'
  return 'free'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/navModel.test.ts`
Expected: PASS (5 assertions).

Note : `isCertified` (navModel:120) reste inchangé — un Pro *comped* débloque les fonctionnalités mais **pas** le badge Certifié (le badge reste lié au vrai `plan='pro'`/`verified`). Séparation voulue : le comped, c'est goûter au Pro, pas la crédibilité.

- [ ] **Step 5: Commit**

```bash
git add src/lib/navModel.ts src/lib/navModel.test.ts
git commit -m "feat(parrainage): planForActor lit comped_pro_until (Pro offert hors Stripe)"
```

---

## Task 3: Migration — colonnes entités + trigger protégé

**Files:**
- Create: `supabase/migrations/20260616120000_referral_entities_columns.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Parrainage v1 — colonnes de récompense sur entities + extension du trigger de protection.
-- comped_pro_until : Pro offert hors Stripe (récompense d'un parrain au plan gratuit).
-- is_ambassador    : badge public permanent, posé au 1er filleul payant.
-- Les DEUX sont écrites UNIQUEMENT par la service-role (webhook). On étend protect_entity_plan
-- pour qu'un utilisateur authentifié ne puisse jamais se les auto-attribuer (même faille que plan).

ALTER TABLE public.entities
  ADD COLUMN comped_pro_until timestamptz,
  ADD COLUMN is_ambassador boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.entities.comped_pro_until IS
  'Pro offert hors Stripe (récompense parrain gratuit). Gating : plan=''pro'' OU comped_pro_until > now(). Écrit par service-role uniquement.';
COMMENT ON COLUMN public.entities.is_ambassador IS
  'Badge « Ambassadeur Fellowship » : true dès le 1er filleul payant (permanent). Écrit par service-role uniquement.';

-- Étend le garde-fou existant (cf. 20260528230000) : plan + comped_pro_until + is_ambassador
-- sont réinitialisés à OLD si l'appel vient d'un utilisateur authentifié (auth.uid() NOT NULL).
-- La service-role (webhook) a auth.uid() = NULL → seule voie autorisée à écrire ces colonnes.
CREATE OR REPLACE FUNCTION public.protect_entity_plan() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
  AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      NEW.plan := OLD.plan;
    END IF;
    IF NEW.comped_pro_until IS DISTINCT FROM OLD.comped_pro_until THEN
      NEW.comped_pro_until := OLD.comped_pro_until;
    END IF;
    IF NEW.is_ambassador IS DISTINCT FROM OLD.is_ambassador THEN
      NEW.is_ambassador := OLD.is_ambassador;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

- [ ] **Step 2: Apply locally / to linked project**

Run: `supabase db push`
Expected: migration `20260616120000` appliquée sans erreur.

- [ ] **Step 3: Verify the trigger blocks client writes (manual SQL check)**

In Supabase SQL editor (as an authenticated test user, not service-role), attempt:
`UPDATE entities SET is_ambassador = true WHERE actor_id = '<your-entity>';`
Expected: the row's `is_ambassador` stays `false` (trigger reverts).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260616120000_referral_entities_columns.sql
git commit -m "feat(parrainage): colonnes comped_pro_until + is_ambassador, trigger étendu"
```

---

## Task 4: Migration — tables referral_codes & referrals

**Files:**
- Create: `supabase/migrations/20260616120100_referral_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Parrainage v1 — tables. L'unité de parrainage est l'ENTITÉ (owner_entity_id / *_entity_id).
-- Accès client : AUCUN direct (RLS activée, zéro policy). Tout passe par les RPC SECURITY
-- DEFINER (lecture/attribution) et la service-role (webhook : récompense). Le badge public
-- est lu via entities.is_ambassador, pas via ces tables → pas besoin d'exposer referrals.

-- Code de parrainage : un par entité, dérivé du nom de marque (+ suffixe si collision).
CREATE TABLE public.referral_codes (
  code            text PRIMARY KEY,
  owner_entity_id uuid NOT NULL REFERENCES public.entities(actor_id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- Une entité = au plus un code.
CREATE UNIQUE INDEX referral_codes_owner_key ON public.referral_codes (owner_entity_id);

-- Rattachement filleul → parrain. Un filleul a au plus un parrain, à vie.
CREATE TABLE public.referrals (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parrain_entity_id     uuid NOT NULL REFERENCES public.entities(actor_id) ON DELETE CASCADE,
  filleul_entity_id     uuid NOT NULL UNIQUE REFERENCES public.entities(actor_id) ON DELETE CASCADE,
  status                text NOT NULL DEFAULT 'attributed'
                          CHECK (status IN ('attributed', 'rewarded', 'rejected_fraud')),
  filleul_gift_granted  boolean NOT NULL DEFAULT false,
  attributed_at         timestamptz NOT NULL DEFAULT now(),
  filleul_first_paid_at timestamptz,
  parrain_rewarded_at   timestamptz,
  -- Pas d'auto-parrainage, même au niveau DB (défense en profondeur).
  CONSTRAINT referrals_no_self CHECK (parrain_entity_id <> filleul_entity_id)
);
CREATE INDEX referrals_parrain_idx ON public.referrals (parrain_entity_id);

-- RLS : activée, aucune policy → inaccessible à anon/authenticated. Accès via RPC + service-role.
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.referral_codes IS
  'Codes de parrainage (1 par entité). Accès via RPC ensure_referral_code / get_referral_overview / attribute_referral.';
COMMENT ON TABLE public.referrals IS
  'Rattachements filleul→parrain. status attributed→rewarded au 1er paiement réel du filleul (webhook). RLS sans policy : RPC + service-role only.';
```

- [ ] **Step 2: Apply**

Run: `supabase db push`
Expected: migration `20260616120100` appliquée.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260616120100_referral_tables.sql
git commit -m "feat(parrainage): tables referral_codes + referrals (RLS lockée)"
```

---

## Task 5: Migration — RPC (génération code, overview, attribution)

**Files:**
- Create: `supabase/migrations/20260616120200_referral_rpcs.sql`

Pré-requis vérifié : la fonction `can_act_as(target_actor uuid)` existe déjà (utilisée par `stripe-checkout-session`). On l'appelle positionnellement.

- [ ] **Step 1: Write the migration**

```sql
-- Parrainage v1 — RPC. Toutes en SECURITY DEFINER, bornées par can_act_as() sur l'entité
-- appelante, search_path verrouillé. Le client passe une base déjà normalisée (accents retirés
-- côté TS) ; la RPC re-sécurise (regex) et gère collision + insertion atomique.

-- 1) Récupère (ou crée) le code de parrainage de l'entité. Idempotent.
CREATE OR REPLACE FUNCTION public.ensure_referral_code(p_entity_id uuid, p_base_code text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing  text;
  v_base      text;
  v_candidate text;
  v_n         int := 1;
BEGIN
  IF NOT can_act_as(p_entity_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT code INTO v_existing FROM referral_codes WHERE owner_entity_id = p_entity_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Re-sécurise la base (MAJ alphanumérique). Fallback si trop courte.
  v_base := regexp_replace(upper(coalesce(p_base_code, '')), '[^A-Z0-9]', '', 'g');
  IF length(v_base) < 3 THEN
    v_base := 'FLWSH';
  END IF;
  v_base := left(v_base, 20);

  -- Boucle de collision : RUNEDECHENE, RUNEDECHENE2, RUNEDECHENE3…
  v_candidate := v_base;
  LOOP
    BEGIN
      INSERT INTO referral_codes (code, owner_entity_id) VALUES (v_candidate, p_entity_id);
      RETURN v_candidate;
    EXCEPTION
      WHEN unique_violation THEN
        -- soit le code est pris (collision), soit l'entité a reçu un code en concurrence.
        SELECT code INTO v_existing FROM referral_codes WHERE owner_entity_id = p_entity_id;
        IF v_existing IS NOT NULL THEN
          RETURN v_existing;
        END IF;
        v_n := v_n + 1;
        v_candidate := v_base || v_n::text;
    END;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code(uuid, text) TO authenticated;

-- 2) Stats de parrainage de l'entité (pour la page Abonnement).
CREATE OR REPLACE FUNCTION public.get_referral_overview(p_entity_id uuid)
RETURNS TABLE(code text, rewarded_count int, pending_count int, is_ambassador boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT can_act_as(p_entity_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN QUERY
  SELECT
    (SELECT rc.code FROM referral_codes rc WHERE rc.owner_entity_id = p_entity_id),
    (SELECT count(*)::int FROM referrals r WHERE r.parrain_entity_id = p_entity_id AND r.status = 'rewarded'),
    (SELECT count(*)::int FROM referrals r WHERE r.parrain_entity_id = p_entity_id AND r.status = 'attributed'),
    (SELECT e.is_ambassador FROM entities e WHERE e.actor_id = p_entity_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_referral_overview(uuid) TO authenticated;

-- 3) Attribution : rattache le filleul à son parrain. Retourne un code de résultat.
CREATE OR REPLACE FUNCTION public.attribute_referral(p_code text, p_filleul_entity_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner  uuid;
  v_norm   text;
  v_status text;
BEGIN
  IF NOT can_act_as(p_filleul_entity_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_norm := regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');
  SELECT owner_entity_id INTO v_owner FROM referral_codes WHERE code = v_norm;
  IF v_owner IS NULL THEN
    RETURN 'invalid_code';
  END IF;
  IF v_owner = p_filleul_entity_id THEN
    RETURN 'self_referral';
  END IF;
  IF EXISTS (SELECT 1 FROM referrals WHERE filleul_entity_id = p_filleul_entity_id) THEN
    RETURN 'already_attributed';
  END IF;
  -- Filleul déjà abonné (à un moment) → pas éligible au cadeau filleul.
  SELECT subscription_status INTO v_status FROM entities WHERE actor_id = p_filleul_entity_id;
  IF v_status IS NOT NULL AND v_status IN ('active', 'trialing', 'past_due') THEN
    RETURN 'not_eligible';
  END IF;

  INSERT INTO referrals (parrain_entity_id, filleul_entity_id, status)
    VALUES (v_owner, p_filleul_entity_id, 'attributed');
  RETURN 'ok';
EXCEPTION
  WHEN unique_violation THEN
    -- course : un autre appel a inséré le même filleul entre-temps.
    RETURN 'already_attributed';
END;
$$;
GRANT EXECUTE ON FUNCTION public.attribute_referral(text, uuid) TO authenticated;
```

- [ ] **Step 2: Apply**

Run: `supabase db push`
Expected: migration `20260616120200` appliquée.

- [ ] **Step 3: Smoke-test the RPCs (manual SQL, as service-role in SQL editor)**

```sql
-- Remplace les UUID par deux entités de test distinctes.
SELECT ensure_referral_code('<entityA>', 'Rune de Chêne');   -- attendu: 'RUNEDECHENE'
SELECT attribute_referral('RUNEDECHENE', '<entityA>');        -- attendu: 'self_referral'
SELECT attribute_referral('RUNEDECHENE', '<entityB>');        -- attendu: 'ok'
SELECT attribute_referral('RUNEDECHENE', '<entityB>');        -- attendu: 'already_attributed'
SELECT * FROM get_referral_overview('<entityA>');             -- pending_count = 1
```
(Note : `can_act_as` étant `SECURITY DEFINER` côté DB, ce smoke-test passe en SQL editor ; en prod c'est le JWT du client qui borne l'accès.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260616120200_referral_rpcs.sql
git commit -m "feat(parrainage): RPC ensure_referral_code / get_referral_overview / attribute_referral"
```

---

## Task 6: Edge — checkout : essai 30j pour filleul parrainé

**Files:**
- Modify: `supabase/functions/stripe-checkout-session/index.ts:99-102`

- [ ] **Step 1: Add referral lookup before session creation**

In `supabase/functions/stripe-checkout-session/index.ts`, just BEFORE `const price = ...` (line 93), insert:

```ts
    // Parrainage : le filleul parrainé (rattachement en attente, cadeau non encore consommé)
    // bénéficie d'un essai de 30 jours au lieu de 14. Pas de coupon (qui buggerait sur l'annuel).
    const { data: pendingRef } = await admin
      .from('referrals')
      .select('id')
      .eq('filleul_entity_id', entity.actor_id)
      .eq('status', 'attributed')
      .eq('filleul_gift_granted', false)
      .maybeSingle()
    const trialDays = pendingRef ? 30 : 14
```

- [ ] **Step 2: Use `trialDays` in the session**

Replace lines 99-102 (`subscription_data: { trial_period_days: 14, ... }`):

```ts
      subscription_data: {
        trial_period_days: trialDays,
        metadata: { entity_actor_id: entity.actor_id },
      },
```

- [ ] **Step 3: Type-check the function**

Run: `supabase functions deploy stripe-checkout-session` (ou `deno check supabase/functions/stripe-checkout-session/index.ts` si Deno est installé localement)
Expected: déploiement/déno check sans erreur de type.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/stripe-checkout-session/index.ts
git commit -m "feat(parrainage): essai 30j pour un filleul parrainé (au lieu de 14)"
```

---

## Task 7: Edge — webhook : récompense parrain + gift + ambassadeur

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts` (handler `handleCheckoutCompleted` ~80, `handleInvoicePaymentSucceeded` ~129, + nouveau helper)

- [ ] **Step 1: Mark the filleul gift as consumed on checkout completion**

In `handleCheckoutCompleted`, after `await syncSubscriptionToDB(entityActorId, sub)` (line 89), add:

```ts
  // Cadeau filleul (essai 30j) consommé : on le verrouille pour ne pas le ré-octroyer
  // si le filleul résilie pendant l'essai puis se réabonne.
  await getSupabaseAdmin()
    .from('referrals')
    .update({ filleul_gift_granted: true })
    .eq('filleul_entity_id', entityActorId)
    .eq('status', 'attributed')
```

- [ ] **Step 2: Trigger the parrain reward on the filleul's first real paid invoice**

In `handleInvoicePaymentSucceeded`, after `await syncSubscriptionToDB(entityActorId, sub)` (line 134), add:

```ts
  // Récompense parrain : déclenchée par la 1ʳᵉ facture RÉELLEMENT payée du filleul.
  await rewardReferrerIfAny(entityActorId, invoice)
```

- [ ] **Step 3: Add the reward helper**

At the end of `supabase/functions/stripe-webhook/index.ts` (after `syncSubscriptionToDB`), add:

```ts
// Récompense le parrain quand CE filleul paie sa 1ʳᵉ vraie facture (anti-fraude).
// Claim-first (transition attributed→rewarded atomique) → idempotent, jamais de double crédit.
async function rewardReferrerIfAny(filleulEntityId: string, invoice: Stripe.Invoice) {
  // amount_paid > 0 : ignore les factures à 0 (l'essai ne génère pas de paiement réel).
  if ((invoice.amount_paid ?? 0) <= 0) return
  const admin = getSupabaseAdmin()

  // Parrainage en attente où cette entité est le filleul ?
  const { data: ref } = await admin
    .from('referrals')
    .select('id, parrain_entity_id')
    .eq('filleul_entity_id', filleulEntityId)
    .eq('status', 'attributed')
    .maybeSingle()
  if (!ref) return

  // Claim atomique : on ne récompense que si on fait nous-mêmes la transition.
  const now = new Date().toISOString()
  const { data: claimed } = await admin
    .from('referrals')
    .update({ status: 'rewarded', filleul_first_paid_at: now, parrain_rewarded_at: now })
    .eq('id', ref.id)
    .eq('status', 'attributed')
    .select('id')
    .maybeSingle()
  if (!claimed) return // déjà récompensé par un autre passage

  // Charge le parrain (entité).
  const { data: parrain } = await admin
    .from('entities')
    .select('actor_id, plan, stripe_customer_id, stripe_subscription_id, comped_pro_until')
    .eq('actor_id', ref.parrain_entity_id)
    .maybeSingle()
  if (!parrain) return

  const parrainIsPro = parrain.plan === 'pro' && !!parrain.stripe_subscription_id
  if (parrainIsPro) {
    // Parrain Pro → crédit d'un mois de son plan sur son customer balance (négatif = crédit).
    const sub = await getStripe().subscriptions.retrieve(parrain.stripe_subscription_id as string)
    const price = sub.items.data[0]?.price
    const unit = price?.unit_amount ?? 0
    const interval = price?.recurring?.interval ?? 'month'
    // monthlyCreditCents (cf. src/lib/referral.ts, dupliqué ici : edge runtime isolé).
    const creditCents = unit <= 0 ? 0 : (interval === 'year' ? Math.round(unit / 12) : unit)
    if (creditCents > 0 && parrain.stripe_customer_id) {
      await getStripe().customers.createBalanceTransaction(parrain.stripe_customer_id, {
        amount: -creditCents,
        currency: price?.currency ?? 'eur',
        description: 'Parrainage Fellowship — 1 mois offert',
      })
    }
  } else {
    // Parrain gratuit → 1 mois de Pro offert (hors Stripe) via comped_pro_until.
    const base = parrain.comped_pro_until && new Date(parrain.comped_pro_until) > new Date()
      ? new Date(parrain.comped_pro_until)
      : new Date()
    base.setMonth(base.getMonth() + 1)
    await admin.from('entities')
      .update({ comped_pro_until: base.toISOString() })
      .eq('actor_id', parrain.actor_id)
  }

  // Badge Ambassadeur permanent (1er filleul payant).
  await admin.from('entities')
    .update({ is_ambassador: true })
    .eq('actor_id', parrain.actor_id)
}
```

- [ ] **Step 4: Deploy & type-check**

Run: `supabase functions deploy stripe-webhook`
Expected: déploiement sans erreur de type (le type `Stripe` est déjà importé ligne 9).

- [ ] **Step 5: Manual end-to-end check (Stripe test mode)**

1. Entité A : `ensure_referral_code` → code. 2. Entité B s'inscrit avec le code (Onboarding, Task 9). 3. B souscrit (essai 30j visible). 4. Dans Stripe test, avance l'horloge ou force la 1ʳᵉ facture payée. 5. Vérifie : `referrals.status = 'rewarded'`, A `is_ambassador = true`, et crédit balance (si A Pro) ou `A.comped_pro_until` ≈ +1 mois (si A gratuit).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat(parrainage): récompense parrain au 1er paiement filleul + badge ambassadeur"
```

---

## Task 8: Capture du `?r=` au boot

**Files:**
- Create: `src/lib/referral-capture.ts`
- Modify: `src/main.tsx` (ajout d'un import + appel)

- [ ] **Step 1: Create the capture module**

`src/lib/referral-capture.ts` :

```ts
// Capture du code de parrainage depuis l'URL d'arrivée (ex: flwsh.app/?r=RUNEDECHENE).
// Persiste en localStorage pour survivre au parcours login OTP → onboarding (≠ même page).
import { normalizeReferralCode } from './referral'

const KEY = 'flwsh.referralCode'

export function captureReferralFromUrl(search: string = window.location.search): void {
  const raw = new URLSearchParams(search).get('r')
  if (!raw) return
  const code = normalizeReferralCode(raw)
  if (code.length >= 3) localStorage.setItem(KEY, code)
}

export function getStoredReferralCode(): string | null {
  return localStorage.getItem(KEY)
}

export function clearStoredReferralCode(): void {
  localStorage.removeItem(KEY)
}
```

- [ ] **Step 2: Call it at app boot**

In `src/main.tsx`, add the import near the other imports and call it once before the React render (the search string is read at module load, which is the first paint after landing):

```ts
import { captureReferralFromUrl } from '@/lib/referral-capture'

captureReferralFromUrl()
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: build TypeScript OK.

- [ ] **Step 4: Commit**

```bash
git add src/lib/referral-capture.ts src/main.tsx
git commit -m "feat(parrainage): capture du code ?r= au démarrage (localStorage)"
```

---

## Task 9: Onboarding — champ code + attribution

**Files:**
- Modify: `src/pages/Onboarding.tsx`

- [ ] **Step 1: Import capture helpers**

Add to the import block (after line 10):

```ts
import { getStoredReferralCode, clearStoredReferralCode } from '@/lib/referral-capture'
```

- [ ] **Step 2: Add `referral` to form state + prefill**

Replace line 21:

```ts
  const [form, setForm] = useState({ prenom: '', brand: '', craft: '', city: '', postal: '', slug: '', referral: '' })
```

After the slug-prefill effect (after line 41), add a prefill-from-capture effect:

```ts
  // Pré-remplit le code de parrainage s'il a été capturé via un lien ?r=.
  useEffect(() => {
    const stored = getStoredReferralCode()
    if (stored) setForm((f) => ({ ...f, referral: stored }))
  }, [])
```

- [ ] **Step 3: Attribute the referral after entity creation**

In `handleSubmit`, in the exposant branch, replace `switchActor(newId as string)` (line 108) with:

```ts
        switchActor(newId as string)

        // Parrainage : rattache le filleul à son parrain. Best-effort — un échec ne doit
        // jamais bloquer la fin de l'onboarding (l'entité est déjà créée).
        const refCode = form.referral.trim() || getStoredReferralCode() || ''
        if (refCode) {
          try {
            await (supabase.rpc as any)('attribute_referral', { p_code: refCode, p_filleul_entity_id: newId })
            clearStoredReferralCode()
          } catch (e) {
            console.error('[onboarding] referral attribution failed', e)
          }
        }
```

- [ ] **Step 4: Add the optional code input on the slug step**

In the `slug` step `<form>`, insert this `<div className="field">` right AFTER the closing `</div>` of the existing slug field (after line 447, before `<div className="spacer" />`):

```tsx
              <div className="field">
                <label>Code de parrainage <span style={{ opacity: 0.6, fontWeight: 400 }}>(facultatif)</span></label>
                <input
                  type="text"
                  value={form.referral}
                  onChange={(e) => update({ referral: e.target.value })}
                  placeholder="RUNEDECHENE"
                />
                <div className="hint">Un ami exposant t'a parrainé ? Saisis son code : 30 jours de Pro offerts.</div>
              </div>
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: OK.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Onboarding.tsx
git commit -m "feat(parrainage): saisie du code à l'onboarding + attribution du filleul"
```

---

## Task 10: Hook + carte Parrainage dans Abonnement

**Files:**
- Create: `src/hooks/use-referral.ts`
- Create: `src/components/abonnement/ReferralCard.tsx`
- Modify: `src/pages/Abonnement.tsx`

- [ ] **Step 1: Create the hook**

`src/hooks/use-referral.ts` :

```ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizeReferralCode, referralLink } from '@/lib/referral'

export interface ReferralOverview {
  code: string | null
  link: string | null
  rewardedCount: number
  pendingCount: number
  isAmbassador: boolean
  loading: boolean
}

interface OverviewRow {
  code: string | null
  rewarded_count: number
  pending_count: number
  is_ambassador: boolean
}

/** Code + stats de parrainage de l'entité. Crée le code à la volée (ensure_referral_code). */
export function useReferral(entityId: string | null, brandName: string | null): ReferralOverview {
  const [data, setData] = useState<ReferralOverview>({
    code: null, link: null, rewardedCount: 0, pendingCount: 0, isAmbassador: false, loading: true,
  })

  useEffect(() => {
    if (!entityId) { setData(d => ({ ...d, loading: false })); return } // eslint-disable-line react-hooks/set-state-in-effect
    let cancelled = false
    async function run() {
      const base = normalizeReferralCode(brandName ?? '')
      // 1) garantit l'existence du code.
      await (supabase.rpc as any)('ensure_referral_code', { p_entity_id: entityId, p_base_code: base })
      // 2) lit le code + les stats.
      const { data: rows } = await (supabase.rpc as any)('get_referral_overview', { p_entity_id: entityId })
      const row = (rows as OverviewRow[] | null)?.[0] ?? null
      if (cancelled) return
      const code = row?.code ?? null
      setData({
        code,
        link: code ? referralLink(window.location.origin, code) : null,
        rewardedCount: row?.rewarded_count ?? 0,
        pendingCount: row?.pending_count ?? 0,
        isAmbassador: row?.is_ambassador ?? false,
        loading: false,
      })
    }
    run()
    return () => { cancelled = true }
  }, [entityId, brandName])

  return data
}
```

- [ ] **Step 2: Create the card component**

`src/components/abonnement/ReferralCard.tsx` :

```tsx
import { useState } from 'react'
import { Gift, Copy, Check, Award } from 'lucide-react'
import { useReferral } from '@/hooks/use-referral'

/** Carte Parrainage dans la page Abonnement : code, lien à copier, compteur, statut Ambassadeur. */
export function ReferralCard({ entityId, brandName }: { entityId: string; brandName: string | null }) {
  const { code, link, rewardedCount, pendingCount, isAmbassador, loading } = useReferral(entityId, brandName)
  const [copied, setCopied] = useState(false)

  if (loading || !code) return null

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard indispo : l'utilisateur peut sélectionner le lien à la main */ }
  }

  return (
    <div className="abo-card">
      <h2><Gift size={18} strokeWidth={2} style={{ verticalAlign: '-3px', marginRight: 6 }} />Parraine un ami</h2>
      <p>Offre un mois, gagne un mois. Ton ami a <strong>30 jours de Pro offerts</strong> ; tu gagnes <strong>un mois</strong> dès qu'il paie sa 1ʳᵉ facture.</p>

      <div className="field" style={{ marginTop: 12 }}>
        <label>Ton code</label>
        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '0.04em' }}>{code}</div>
      </div>

      <button type="button" className="abo-cta" onClick={copy} style={{ marginTop: 12 }}>
        {copied ? <Check strokeWidth={2} /> : <Copy strokeWidth={2} />}
        {copied ? 'Lien copié !' : 'Copier mon lien de parrainage'}
      </button>

      <p className="abo-muted" style={{ marginTop: 12 }}>
        {rewardedCount > 0
          ? <><strong>{rewardedCount}</strong> filleul{rewardedCount > 1 ? 's' : ''} payant{rewardedCount > 1 ? 's' : ''} · {rewardedCount} mois gagné{rewardedCount > 1 ? 's' : ''}.</>
          : 'Aucun filleul payant pour l\'instant.'}
        {pendingCount > 0 && <> {pendingCount} en attente de leur 1ʳᵉ facture.</>}
      </p>

      {isAmbassador && (
        <p style={{ marginTop: 8, color: 'var(--copper)', fontWeight: 700 }}>
          <Award size={16} strokeWidth={2} style={{ verticalAlign: '-3px', marginRight: 4 }} />
          Tu es Ambassadeur Fellowship.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Insert the card into Abonnement**

In `src/pages/Abonnement.tsx`, add the import (after line 5):

```ts
import { ReferralCard } from '@/components/abonnement/ReferralCard'
```

Then render it just BEFORE the portal button (`<button onClick={handlePortal} ...>`, line 175):

```tsx
      {targetEntityId && <ReferralCard entityId={targetEntityId} brandName={entity?.brand_name ?? null} />}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: OK.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-referral.ts src/components/abonnement/ReferralCard.tsx src/pages/Abonnement.tsx
git commit -m "feat(parrainage): carte Parrainage (code, lien, compteur) dans Abonnement"
```

---

## Task 11: Badge Ambassadeur sur la vitrine

**Files:**
- Create: `src/components/ui/AmbassadeurBadge.tsx`
- Modify: `src/components/vitrine/VitrineHeader.tsx`

- [ ] **Step 1: Create the badge component**

`src/components/ui/AmbassadeurBadge.tsx` (calqué sur `CertifiedBadge`, couleur cuivre `--copper`) :

```tsx
import { Award } from 'lucide-react'

interface AmbassadeurBadgeProps {
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

/**
 * Badge public « Ambassadeur » : entité ayant amené ≥1 filleul payant (permanent).
 * Gélule cuivre (token `--copper`, jour ET nuit). Présentational pur — la logique est
 * `isAmbassador(entity)` (src/lib/referral.ts), lue depuis entities.is_ambassador.
 */
export function AmbassadeurBadge({ size = 'sm', showLabel = true, className = '' }: AmbassadeurBadgeProps) {
  const iconSize = size === 'sm' ? 12 : 14
  const textClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold align-middle ${textClass} ${className}`}
      style={{
        color: 'var(--copper)',
        background: 'color-mix(in srgb, var(--copper) 16%, transparent)',
        border: '1px solid color-mix(in srgb, var(--copper) 34%, transparent)',
      }}
      title="Ambassadeur Fellowship"
    >
      <Award size={iconSize} strokeWidth={2} aria-hidden="true" />
      {showLabel ? 'Ambassadeur' : <span className="sr-only">Ambassadeur</span>}
    </span>
  )
}
```

- [ ] **Step 2: Render it next to Certifié in the vitrine header**

In `src/components/vitrine/VitrineHeader.tsx`, add imports (after line 5):

```ts
import { AmbassadeurBadge } from '@/components/ui/AmbassadeurBadge'
import { isAmbassador } from '@/lib/referral'
```

Then replace line 36 (`<div className="v-brand">…`):

```tsx
          <div className="v-brand">{entity.brand_name}{isCertified(entity) && <CertifiedBadge size="md" />}{isAmbassador(entity as { is_ambassador?: boolean | null }) && <AmbassadeurBadge size="md" />}</div>
```

(Le `.v-brand` est un flex avec `gap: 10px` et `flex-wrap` — les deux badges s'alignent proprement, cf. `Vitrine.css:142-153`.)

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/AmbassadeurBadge.tsx src/components/vitrine/VitrineHeader.tsx
git commit -m "feat(parrainage): badge Ambassadeur sur la vitrine (à côté de Certifié)"
```

---

## Task 12: Bandeau parrainage sur le mur du quota

**Files:**
- Modify: `src/components/mes-dates/DateQuotaModal.tsx`

- [ ] **Step 1: Add the referral line to the quota wall**

In `src/components/mes-dates/DateQuotaModal.tsx`, replace line 14 (the `<p>…</p>`) with:

```tsx
        <p>C'est le maximum en gratuit. Passe Pro pour suivre un <b>nombre illimité</b> de dates — plus le Calendrier, la Communauté et ton Cockpit.</p>
        <p style={{ fontSize: 13, opacity: 0.85, marginTop: -4 }}>…ou <b>parraine un ami exposant</b> : tu gagnes un mois de Pro dès qu'il paie. <Link to="/abonnement" onClick={onClose}>Voir mon code</Link></p>
```

(`Link` est déjà importé ligne 1.)

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add src/components/mes-dates/DateQuotaModal.tsx
git commit -m "feat(parrainage): bandeau « ou parraine un ami » sur le mur du quota"
```

---

## Task 13: Vérification finale + bump version + push

**Files:**
- Modify: le fichier de version (localiser via grep).

- [ ] **Step 1: Full verification suite**

```bash
pnpm test
pnpm build
pnpm lint
```
Expected: tous verts. Les nouveaux tests `referral.test.ts` et `navModel.test.ts` passent.

- [ ] **Step 2: Bump APP_VERSION (patch)**

Run: `git grep -n "APP_VERSION" -- "src/**"` pour localiser la constante de version, puis incrémente le patch (ex. `0.7.277` → `0.7.278`).

- [ ] **Step 3: Commit & push**

```bash
git add -A
git commit -m "chore(parrainage): bump version + vérif finale"
git push
```

---

## Self-review (couverture spec)

| Section spec | Tâche(s) | Couvert |
|--------------|----------|---------|
| §3.1 Filleul essai 30j | T6 | ✅ |
| §3.2 Parrain Pro crédit balance | T7 | ✅ |
| §3.3 Parrain gratuit comped_pro_until | T1 (gating T2), T7 | ✅ |
| §4.1 Attribution (lien + code) | T8, T9 | ✅ |
| §4.3 Récompense différée anti-fraude | T7 (amount_paid>0, claim-first) | ✅ |
| §5 Modèle de données | T3, T4 | ✅ |
| §5bis Badge Ambassadeur | T7 (set), T1+T11 (read+UI) | ✅ |
| §6 UI (Abonnement, bandeau, onboarding) | T10, T12, T9 | ✅ |
| §7 Sécurité (trigger, self-referral, gift unique) | T3, T4, T5, T6 | ✅ |

**Anti-placeholder :** aucun TODO/TBD ; tout step de code montre le code complet.
**Cohérence des noms :** `comped_pro_until`, `is_ambassador`, `filleul_gift_granted`, `attribute_referral`, `ensure_referral_code`, `get_referral_overview`, `rewardReferrerIfAny`, `normalizeReferralCode`, `monthlyCreditCents`, `isAmbassador`, `referralLink` — identiques d'une tâche à l'autre.

## Notes d'ordre & déploiement

- **Ordre DB-first impératif** : T3→T4→T5 (migrations) avant T6/T7 (edge functions qui lisent ces tables/colonnes).
- **Déploiement edge** : `supabase functions deploy stripe-webhook stripe-checkout-session` après merge — les edge functions ne partent PAS avec le build Netlify.
- **Recette live** : faire le parcours réel en Stripe test (T7 step 5) avant d'annoncer la feature.
