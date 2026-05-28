# Stripe MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activer l'abonnement Pro payant (Stripe Checkout + Customer Portal, trial 14j avec CB, Stripe Tax) pour les entités Fellowship.

**Architecture:** Frontend React → 3 edge functions Deno Supabase (`stripe-checkout-session`, `stripe-portal-link`, `stripe-webhook`) ↔ Stripe API. Données stockées dans `entities` (6 colonnes Stripe ajoutées). Idempotence webhook via table `stripe_events_processed`. Service-role écrit `entities.plan` (bypass trigger `protect_entity_plan` existant).

**Tech Stack:** Deno (edge functions) + Stripe SDK v18 + Supabase JS + React 19 + TypeScript 5.9 + Vite + React Router 7 + Vitest.

**Spec de référence :** [`docs/superpowers/specs/2026-05-28-stripe-mvp-design.md`](../specs/2026-05-28-stripe-mvp-design.md)

---

## Pré-requis (à faire par Uriel en parallèle, avant Task 8)

Sans ces secrets, Tasks 8-9 ne peuvent pas être testés.

1. Compte Stripe en mode **Test** (https://dashboard.stripe.com).
2. **Stripe Tax** activé + numéro TVA renseigné (Settings → Tax).
3. **Product "Fellowship Pro"** créé avec 2 Prices :
   - Mensuel : `11.99 EUR` recurring monthly, **tax_behavior=exclusive**.
   - Annuel : `119.88 EUR` recurring yearly, **tax_behavior=exclusive**.
4. **Customer Portal** configuré (Settings → Billing → Customer Portal) :
   - Cancellation = "At end of billing period"
   - Allow plan switching = oui
   - Allow update payment method = oui
   - Allow view invoices = oui
5. **Webhook endpoint** (Developers → Webhooks) :
   - URL = `https://<projet>.supabase.co/functions/v1/stripe-webhook` (récupérée à Task 0)
   - Events sélectionnés : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`
   - Récupérer le **signing secret** (`whsec_...`).
6. Communiquer à l'engineer les 4 valeurs : `STRIPE_SECRET_KEY` (sk_test_...), `STRIPE_WEBHOOK_SECRET` (whsec_...), `STRIPE_PRICE_MONTHLY` (price_...), `STRIPE_PRICE_YEARLY` (price_...).

---

## Task 0 : Setup infrastructure edge functions

**Files:**
- Create: `supabase/functions/_shared/cors.ts`
- Create: `supabase/functions/_shared/stripe.ts`
- Create: `supabase/functions/_shared/supabase-admin.ts`
- Modify: `supabase/config.toml` (ajout section `[functions]`)

- [ ] **Step 0.1 : Créer le dossier `supabase/functions/_shared/`**

```bash
mkdir -p supabase/functions/_shared
```

- [ ] **Step 0.2 : Créer `supabase/functions/_shared/cors.ts`**

```typescript
// Headers CORS partagés par toutes les edge functions.
// Le webhook n'en a pas besoin (POST signé par Stripe), mais checkout-session
// et portal-link sont appelées depuis le frontend → CORS requis.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
```

- [ ] **Step 0.3 : Créer `supabase/functions/_shared/stripe.ts`**

```typescript
import Stripe from 'npm:stripe@18.0.0'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY env var is required')

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(), // Deno-friendly
})
```

- [ ] **Step 0.4 : Créer `supabase/functions/_shared/supabase-admin.ts`**

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required')
}

/** Client Supabase avec la service-role : bypass RLS + bypass trigger protect_entity_plan
 *  (qui ne déclenche que si auth.uid() IS NOT NULL). À utiliser UNIQUEMENT dans les
 *  edge functions de confiance (webhook signé, jamais exposé au client). */
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
```

- [ ] **Step 0.5 : Ajouter section `[functions]` dans `supabase/config.toml`**

À ajouter en bas du fichier :

```toml
[functions.stripe-checkout-session]
verify_jwt = true

[functions.stripe-portal-link]
verify_jwt = true

[functions.stripe-webhook]
# Webhook Stripe : auth = vérification de signature (pas JWT Supabase).
verify_jwt = false
```

- [ ] **Step 0.6 : Commit setup**

```bash
git add supabase/functions/_shared supabase/config.toml
git commit -m "feat(stripe): setup edge functions infra (_shared utilities + config)"
```

---

## Task 1 : Migration DB — colonnes Stripe sur entities + table idempotence

**Files:**
- Create: `supabase/migrations/20260528240000_stripe_subscription.sql`
- Test: vérification via `pnpm supabase db push` puis lecture schema

- [ ] **Step 1.1 : Créer la migration**

```sql
-- supabase/migrations/20260528240000_stripe_subscription.sql

-- Colonnes Stripe sur entities (1 entité = 1 customer Stripe = 1 subscription max).
ALTER TABLE public.entities
  ADD COLUMN stripe_customer_id text,
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN subscription_status text,
  ADD COLUMN billing_interval text,
  ADD COLUMN current_period_end timestamptz,
  ADD COLUMN trial_end timestamptz;

ALTER TABLE public.entities ADD CONSTRAINT entities_subscription_status_check
  CHECK (subscription_status IS NULL OR subscription_status IN (
    'trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid'
  ));

ALTER TABLE public.entities ADD CONSTRAINT entities_billing_interval_check
  CHECK (billing_interval IS NULL OR billing_interval IN ('month','year'));

-- Index pour lookup rapide depuis le webhook (subscription.id → entity).
CREATE UNIQUE INDEX entities_stripe_subscription_id_key
  ON public.entities (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX entities_stripe_customer_id_key
  ON public.entities (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Table d'idempotence : chaque event Stripe traité est marqué.
-- INSERT ON CONFLICT DO NOTHING dans le webhook = court-circuit si déjà traité.
CREATE TABLE public.stripe_events_processed (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_events_processed ENABLE ROW LEVEL SECURITY;
-- Aucune policy = inaccessible à anon/authenticated. Seul service-role écrit/lit.

-- Note sur le trigger protect_entity_plan (existant) :
-- Sa condition `auth.uid() IS NOT NULL` exclut déjà les appels service-role
-- (le webhook), donc aucune modif nécessaire. Documenté ici pour mémoire.
```

- [ ] **Step 1.2 : Appliquer la migration en local**

```bash
pnpm supabase db push --linked
```

Si on bosse en remote-only (cf. `reference_supabase_cli.md` mémoire), commande à adapter selon préférence locale.

- [ ] **Step 1.3 : Vérifier le schema appliqué**

```bash
pnpm supabase db diff --linked --schema public | head -50
```

Expected: aucune divergence. Si divergence, voir `reference_supabase_db_diverge_recovery.md`.

- [ ] **Step 1.4 : Régénérer les types TypeScript**

```bash
pnpm supabase gen types typescript --linked > src/types/database.generated.ts
```

(Si la commande de regen diffère selon le projet, adapter. Sinon, mémoire `reference_supabase_rpc_types.md` couvre le fallback `as any`.)

- [ ] **Step 1.5 : Commit migration**

```bash
git add supabase/migrations/20260528240000_stripe_subscription.sql src/types/database.generated.ts
git commit -m "feat(stripe): migration entities + stripe_events_processed (idempotence)"
```

---

## Task 2 : Edge function `stripe-checkout-session`

**Files:**
- Create: `supabase/functions/stripe-checkout-session/index.ts`

- [ ] **Step 2.1 : Créer la fonction**

```typescript
// supabase/functions/stripe-checkout-session/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { stripe } from '../_shared/stripe.ts'
import { supabaseAdmin } from '../_shared/supabase-admin.ts'
import { corsHeaders } from '../_shared/cors.ts'

const STRIPE_PRICE_MONTHLY = Deno.env.get('STRIPE_PRICE_MONTHLY')!
const STRIPE_PRICE_YEARLY = Deno.env.get('STRIPE_PRICE_YEARLY')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://flwsh.netlify.app'

interface Body {
  entityId: string
  billingInterval: 'month' | 'year'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    // Auth : récupère le user JWT (verify_jwt=true côté config => déjà validé par la gateway).
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const body = (await req.json()) as Body
    if (!body.entityId || !['month', 'year'].includes(body.billingInterval)) {
      return json({ error: 'invalid body' }, 400)
    }

    // Vérif owner : can_act_as(entityId) côté Postgres avec le JWT user.
    const { data: canAct, error: canActErr } = await userClient
      .rpc('can_act_as', { target_actor_id: body.entityId })
    if (canActErr || !canAct) return json({ error: 'forbidden' }, 403)

    // Récupère l'entité (admin client : bypass RLS pour lire stripe_customer_id éventuel).
    const { data: entity, error: entityErr } = await supabaseAdmin
      .from('entities')
      .select('actor_id, stripe_customer_id, brand_name, subscription_status')
      .eq('actor_id', body.entityId)
      .single()
    if (entityErr || !entity) return json({ error: 'entity not found' }, 404)

    // Si déjà un sub actif/trialing, on redirige vers le portail au lieu de re-souscrire.
    if (entity.subscription_status && ['active', 'trialing', 'past_due'].includes(entity.subscription_status)) {
      return json({ error: 'already subscribed', portal: true }, 409)
    }

    // Récupère ou crée le Customer Stripe pour cette entité.
    let customerId = entity.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: entity.brand_name ?? undefined,
        metadata: { entity_actor_id: entity.actor_id },
      })
      customerId = customer.id
      await supabaseAdmin
        .from('entities')
        .update({ stripe_customer_id: customerId })
        .eq('actor_id', entity.actor_id)
    }

    const price = body.billingInterval === 'month' ? STRIPE_PRICE_MONTHLY : STRIPE_PRICE_YEARLY

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { entity_actor_id: entity.actor_id },
      },
      automatic_tax: { enabled: true },
      customer_update: { name: 'auto', address: 'auto' },
      tax_id_collection: { enabled: true },
      allow_promotion_codes: false, // pas de coupon en V1
      success_url: `${APP_URL}/abonnement?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/boutique?status=cancel`,
      metadata: { entity_actor_id: entity.actor_id },
    })

    return json({ url: session.url })
  } catch (err) {
    console.error('[stripe-checkout-session]', err)
    return json({ error: 'internal_error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2.2 : Serve localement et faire un dry-run smoke test**

```bash
pnpm supabase functions serve stripe-checkout-session --env-file .env.functions.test
```

(`.env.functions.test` doit contenir les secrets test Stripe.)

Dans un autre terminal :

```bash
curl -i -X POST http://localhost:54321/functions/v1/stripe-checkout-session \
  -H "Authorization: Bearer <jwt utilisateur test>" \
  -H "Content-Type: application/json" \
  -d '{"entityId":"<uuid entité test>","billingInterval":"month"}'
```

Expected: HTTP 200 avec `{"url":"https://checkout.stripe.com/c/..."}`.

- [ ] **Step 2.3 : Deploy en remote**

```bash
pnpm supabase functions deploy stripe-checkout-session
```

- [ ] **Step 2.4 : Commit**

```bash
git add supabase/functions/stripe-checkout-session
git commit -m "feat(stripe): edge function stripe-checkout-session (subscription + trial 14j + tax)"
```

---

## Task 3 : Edge function `stripe-portal-link`

**Files:**
- Create: `supabase/functions/stripe-portal-link/index.ts`

- [ ] **Step 3.1 : Créer la fonction**

```typescript
// supabase/functions/stripe-portal-link/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { stripe } from '../_shared/stripe.ts'
import { supabaseAdmin } from '../_shared/supabase-admin.ts'
import { corsHeaders } from '../_shared/cors.ts'

const APP_URL = Deno.env.get('APP_URL') ?? 'https://flwsh.netlify.app'

interface Body { entityId: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

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
    if (!body.entityId) return json({ error: 'invalid body' }, 400)

    const { data: canAct } = await userClient
      .rpc('can_act_as', { target_actor_id: body.entityId })
    if (!canAct) return json({ error: 'forbidden' }, 403)

    const { data: entity } = await supabaseAdmin
      .from('entities')
      .select('stripe_customer_id')
      .eq('actor_id', body.entityId)
      .single()
    if (!entity?.stripe_customer_id) {
      return json({ error: 'no_customer', message: 'Aucun abonnement existant pour cette entité' }, 404)
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: entity.stripe_customer_id,
      return_url: `${APP_URL}/abonnement`,
    })

    return json({ url: session.url })
  } catch (err) {
    console.error('[stripe-portal-link]', err)
    return json({ error: 'internal_error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 3.2 : Deploy**

```bash
pnpm supabase functions deploy stripe-portal-link
```

- [ ] **Step 3.3 : Commit**

```bash
git add supabase/functions/stripe-portal-link
git commit -m "feat(stripe): edge function stripe-portal-link (Customer Portal)"
```

---

## Task 4 : Edge function `stripe-webhook` (signature + idempotence + 5 events)

**Files:**
- Create: `supabase/functions/stripe-webhook/index.ts`

- [ ] **Step 4.1 : Créer la fonction**

```typescript
// supabase/functions/stripe-webhook/index.ts
import Stripe from 'npm:stripe@18.0.0'
import { stripe } from '../_shared/stripe.ts'
import { supabaseAdmin } from '../_shared/supabase-admin.ts'

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // 1. Vérif signature.
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  const rawBody = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // 2. Idempotence : si event déjà traité, court-circuit.
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('stripe_events_processed')
    .insert({ event_id: event.id, event_type: event.type })
    .select('event_id')
    .maybeSingle()
  if (insertErr && insertErr.code !== '23505') { // 23505 = unique violation (déjà traité)
    console.error('[stripe-webhook] idempotence insert error', insertErr)
    return new Response('DB error', { status: 500 })
  }
  if (!inserted) {
    console.log(`[stripe-webhook] event ${event.id} already processed, skipping`)
    return new Response('ok', { status: 200 })
  }

  // 3. Dispatch par type d'event.
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`[stripe-webhook] unhandled event type: ${event.type}`)
    }
    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error(`[stripe-webhook] handler error for ${event.type}`, err)
    // On retourne 500 pour que Stripe retry. L'idempotence garantit qu'on n'écrit pas 2x.
    // En revanche, comme on a déjà INSERT dans stripe_events_processed, le retry
    // sera court-circuité. Décision : on supprime l'event de la table pour permettre retry.
    await supabaseAdmin.from('stripe_events_processed').delete().eq('event_id', event.id)
    return new Response('handler error', { status: 500 })
  }
})

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const entityActorId = session.metadata?.entity_actor_id
  if (!entityActorId) {
    console.error('[stripe-webhook] checkout.session.completed without entity_actor_id metadata')
    return
  }
  if (!session.subscription) return // pas un abonnement (one-shot ?), on ignore

  const sub = await stripe.subscriptions.retrieve(session.subscription as string)
  await syncSubscriptionToDB(entityActorId, sub)
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const entityActorId = await lookupEntityIdFromSubscription(sub)
  if (!entityActorId) return
  await syncSubscriptionToDB(entityActorId, sub)
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const entityActorId = await lookupEntityIdFromSubscription(sub)
  if (!entityActorId) return
  await supabaseAdmin
    .from('entities')
    .update({
      subscription_status: 'canceled',
      plan: 'free',
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    })
    .eq('actor_id', entityActorId)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return
  const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const entityActorId = await lookupEntityIdFromSubscription(sub)
  if (!entityActorId) return
  await supabaseAdmin
    .from('entities')
    .update({ subscription_status: 'past_due' /* on garde plan='pro' pendant la grace period */ })
    .eq('actor_id', entityActorId)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return
  const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const entityActorId = await lookupEntityIdFromSubscription(sub)
  if (!entityActorId) return
  await syncSubscriptionToDB(entityActorId, sub)
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function lookupEntityIdFromSubscription(sub: Stripe.Subscription): Promise<string | null> {
  // 1) metadata posée à la création.
  if (sub.metadata?.entity_actor_id) return sub.metadata.entity_actor_id

  // 2) fallback : lookup par subscription_id en DB.
  const { data } = await supabaseAdmin
    .from('entities')
    .select('actor_id')
    .eq('stripe_subscription_id', sub.id)
    .maybeSingle()
  if (data) return data.actor_id

  // 3) fallback ultime : lookup par customer_id.
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const { data: byCustomer } = await supabaseAdmin
    .from('entities')
    .select('actor_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return byCustomer?.actor_id ?? null
}

async function syncSubscriptionToDB(entityActorId: string, sub: Stripe.Subscription) {
  const status = sub.status
  // plan='pro' tant que la sub est active/trialing/past_due (grace), sinon 'free'.
  const plan = ['active', 'trialing', 'past_due'].includes(status) ? 'pro' : 'free'
  const interval = sub.items.data[0]?.price.recurring?.interval ?? null
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString()

  await supabaseAdmin
    .from('entities')
    .update({
      stripe_subscription_id: sub.id,
      subscription_status: status,
      billing_interval: interval,
      trial_end: trialEnd,
      current_period_end: periodEnd,
      plan,
    })
    .eq('actor_id', entityActorId)
}
```

- [ ] **Step 4.2 : Deploy le webhook**

```bash
pnpm supabase functions deploy stripe-webhook --no-verify-jwt
```

(Le flag `--no-verify-jwt` est cohérent avec `verify_jwt = false` dans config.toml.)

- [ ] **Step 4.3 : Récupérer l'URL pour Uriel**

```bash
pnpm supabase functions list
```

Communique l'URL `https://<project>.supabase.co/functions/v1/stripe-webhook` à Uriel pour qu'il la pose dans le dashboard Stripe.

- [ ] **Step 4.4 : Commit**

```bash
git add supabase/functions/stripe-webhook
git commit -m "feat(stripe): edge function stripe-webhook (signature + idempotence + 5 events)"
```

---

## Task 5 : Page Boutique — port de la maquette HTML vers React

**Files:**
- Source : `docs/decisions/assets/boutique-pricing.html` (référence visuelle)
- Create: `src/pages/Boutique.tsx`
- Create: `src/pages/Boutique.css`
- Create: `src/lib/stripe-client.ts`

- [ ] **Step 5.1 : Créer le helper client `src/lib/stripe-client.ts`**

```typescript
import { supabase } from './supabase'

export type BillingInterval = 'month' | 'year'

/** Lance le Checkout Stripe : appelle l'edge function et redirige vers Stripe Checkout. */
export async function startCheckout(entityId: string, billingInterval: BillingInterval): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string; portal?: boolean }>(
    'stripe-checkout-session',
    { body: { entityId, billingInterval } },
  )
  if (error || !data) throw new Error(error?.message ?? 'checkout_failed')
  if (data.error === 'already subscribed' || data.portal) {
    // déjà abonné → redirige plutôt vers le portail
    return openCustomerPortal(entityId)
  }
  if (!data.url) throw new Error(data.error ?? 'checkout_failed')
  window.location.href = data.url
}

/** Ouvre le Customer Portal Stripe pour l'entité. */
export async function openCustomerPortal(entityId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-portal-link',
    { body: { entityId } },
  )
  if (error || !data?.url) throw new Error(data?.error ?? 'portal_failed')
  window.location.href = data.url
}
```

- [ ] **Step 5.2 : Lire la maquette `docs/decisions/assets/boutique-pricing.html` pour les choix de design**

Le port doit reproduire l'esprit visuel de la maquette (DA Nuit de Festival, tokens existants `--copper`, `--lime`, `--status-*`). Si la maquette est trop riche, simplifier au strict nécessaire :
- Hero "Passer en Pro — Pour vivre de ton art"
- 2 cartes côte à côte : Mensuel 11,99 € HT/mois — Annuel 9,99 € HT/mois (facturé 119,88 €/an, économise 17 %)
- Pour chaque carte : prix, bouton CTA, liste de features (le contenu de la matrice gratuit/Pro `0001` §5)
- Footnote : "TVA en sus (calculée au Checkout selon votre pays)" + lien CGV

- [ ] **Step 5.3 : Créer `src/pages/Boutique.tsx`**

```tsx
import { useState } from 'react'
import { Loader2, Check, Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { startCheckout, type BillingInterval } from '@/lib/stripe-client'
import { Link } from 'react-router-dom'
import './Boutique.css'

const FEATURES = [
  'Calendrier saison année complète',
  'Communauté — fil complet du réseau',
  'Tableau de bord (cockpit pilotage)',
  'Avis détaillés sur tes festivals',
  'Embed calendrier sur ton site',
]

export function BoutiquePage() {
  const { currentActor, currentActorRow } = useAuth()
  const [loading, setLoading] = useState<BillingInterval | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isEntity = currentActor?.kind === 'entity'
  const isPro = planForActor(currentActor, currentActorRow) === 'pro'

  const handleClick = async (interval: BillingInterval) => {
    if (!currentActor || !isEntity) return
    setError(null)
    setLoading(interval)
    try {
      await startCheckout(currentActor.id, interval)
    } catch (e) {
      setError("Impossible de démarrer le paiement. Réessaie dans un instant.")
      console.error(e)
      setLoading(null)
    }
  }

  return (
    <div className="boutique-page">
      <header className="boutique-hero">
        <h1>Passer en Pro</h1>
        <p className="boutique-tagline">Pour vivre de ton art.</p>
      </header>

      {!isEntity && (
        <div className="boutique-notice">
          Sélectionne ton entité exposant dans la navbar pour t'abonner.
        </div>
      )}

      {isPro && (
        <div className="boutique-already-pro">
          ✓ Tu es déjà Pro. <Link to="/abonnement">Gérer mon abonnement</Link>
        </div>
      )}

      {error && <div className="boutique-error">{error}</div>}

      <div className="boutique-plans">
        <PlanCard
          title="Mensuel"
          priceHT="11,99 € HT"
          period="par mois"
          subline="Premium flexibilité"
          loading={loading === 'month'}
          disabled={!isEntity || isPro || loading !== null}
          onClick={() => handleClick('month')}
        />
        <PlanCard
          title="Annuel"
          priceHT="9,99 € HT"
          period="par mois"
          subline="Facturé 119,88 € HT/an · économise 17 %"
          highlight
          loading={loading === 'year'}
          disabled={!isEntity || isPro || loading !== null}
          onClick={() => handleClick('year')}
        />
      </div>

      <ul className="boutique-features">
        {FEATURES.map(f => (
          <li key={f}><Check strokeWidth={2} /> {f}</li>
        ))}
      </ul>

      <p className="boutique-footnote">
        Essai gratuit 14 jours · TVA en sus calculée au paiement selon ton pays · résiliable à tout moment.
        Voir nos <Link to="/legal/cgv">CGV</Link>.
      </p>
    </div>
  )
}

interface PlanCardProps {
  title: string; priceHT: string; period: string; subline: string
  highlight?: boolean; loading: boolean; disabled: boolean
  onClick: () => void
}
function PlanCard(p: PlanCardProps) {
  return (
    <div className={`boutique-plan ${p.highlight ? 'highlight' : ''}`}>
      <h2>{p.title}</h2>
      <div className="boutique-price">
        <span className="boutique-price-amount">{p.priceHT}</span>
        <span className="boutique-price-period">{p.period}</span>
      </div>
      <p className="boutique-plan-subline">{p.subline}</p>
      <button
        onClick={p.onClick}
        disabled={p.disabled}
        className="boutique-cta"
        aria-busy={p.loading}
      >
        {p.loading ? <Loader2 className="animate-spin" /> : p.disabled ? <Lock strokeWidth={1.5} /> : null}
        {p.loading ? 'Redirection…' : 'Choisir'}
      </button>
    </div>
  )
}
```

- [ ] **Step 5.4 : Créer `src/pages/Boutique.css`**

Reprend les tokens existants (`--copper`, `--lime`, `--card`, `--foreground`, etc.). Suivre les conventions des autres .css du projet (cf. `Explorer.css`, `MesDates.css`). Une carte highlight = bordure copper, scale léger.

```css
/* src/pages/Boutique.css */
.boutique-page { max-width: 880px; margin: 0 auto; padding: 32px var(--page-padding); }
.boutique-hero { text-align: center; margin-bottom: 28px; }
.boutique-hero h1 { font-family: var(--font-heading); font-size: clamp(2rem, 4vw, 2.6rem); font-weight: 800; margin: 0; }
.boutique-tagline { color: hsl(var(--muted-foreground)); font-size: 1.05rem; margin-top: 6px; }

.boutique-notice, .boutique-already-pro, .boutique-error {
  margin: 0 auto 20px; padding: 14px 18px; border-radius: 12px;
  border: 1px solid hsl(var(--border)); background: hsl(var(--card));
  text-align: center; font-size: 14px;
}
.boutique-already-pro { color: var(--status-inscrit); border-color: color-mix(in srgb, var(--status-inscrit) 30%, transparent); }
.boutique-error { color: var(--status-refuse); border-color: color-mix(in srgb, var(--status-refuse) 30%, transparent); }

.boutique-plans { display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 12px; }
@media (min-width: 720px) { .boutique-plans { grid-template-columns: 1fr 1fr; } }

.boutique-plan {
  border: 1px solid hsl(var(--border)); border-radius: 18px; padding: 28px 24px;
  background: hsl(var(--card)); display: flex; flex-direction: column; gap: 14px;
}
.boutique-plan.highlight {
  border-color: var(--copper);
  background: linear-gradient(180deg, color-mix(in srgb, var(--copper) 8%, hsl(var(--card))), hsl(var(--card)) 60%);
  box-shadow: 0 6px 28px color-mix(in srgb, var(--copper) 18%, transparent);
}
.boutique-plan h2 { margin: 0; font-size: 1.3rem; font-weight: 700; font-family: var(--font-heading); }
.boutique-price { display: flex; align-items: baseline; gap: 8px; }
.boutique-price-amount { font-size: 2.4rem; font-weight: 800; font-family: var(--font-heading); }
.boutique-price-period { color: hsl(var(--muted-foreground)); font-size: 14px; }
.boutique-plan-subline { color: hsl(var(--muted-foreground)); font-size: 14px; margin: 0; }

.boutique-cta {
  margin-top: 6px; padding: 14px 20px; border-radius: 999px; font-weight: 700;
  background: var(--gradient-primary); color: #fff; border: none; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  transition: transform .15s ease, box-shadow .15s ease;
}
.boutique-cta:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px color-mix(in srgb, var(--copper) 35%, transparent); }
.boutique-cta:disabled { opacity: .55; cursor: not-allowed; }
.boutique-cta .animate-spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.boutique-features { list-style: none; padding: 0; margin: 28px 0; display: grid; gap: 10px; }
.boutique-features li { display: flex; align-items: center; gap: 10px; }
.boutique-features svg { color: var(--lime); flex-shrink: 0; width: 18px; height: 18px; }

.boutique-footnote { color: hsl(var(--muted-foreground)); font-size: 12.5px; text-align: center; margin-top: 24px; }
.boutique-footnote a { color: inherit; text-decoration: underline; }

.light .boutique-plan { background: hsl(var(--card)); }
.light .boutique-plan.highlight { background: linear-gradient(180deg, color-mix(in srgb, var(--copper) 12%, hsl(var(--card))), hsl(var(--card)) 60%); }
```

- [ ] **Step 5.5 : Commit Boutique**

```bash
git add src/pages/Boutique.tsx src/pages/Boutique.css src/lib/stripe-client.ts
git commit -m "feat(stripe): page Boutique + helper client (Checkout mensuel/annuel)"
```

---

## Task 6 : Page `/abonnement` (gestion + retour Checkout)

**Files:**
- Create: `src/pages/Abonnement.tsx`
- Create: `src/pages/Abonnement.css`

- [ ] **Step 6.1 : Créer la page `src/pages/Abonnement.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Loader2, ExternalLink, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { openCustomerPortal } from '@/lib/stripe-client'
import type { EntityRow } from '@/types/database'
import './Abonnement.css'

export function AbonnementPage() {
  const { currentActor, currentActorRow, refreshProfile } = useAuth()
  const [params] = useSearchParams()
  const [opening, setOpening] = useState(false)
  const [polling, setPolling] = useState(false)

  // Si retour de Checkout avec status=success, on poll currentActor pour récupérer
  // le plan freshly updated (le webhook est async — peut ne pas avoir fini).
  useEffect(() => {
    if (params.get('status') !== 'success') return
    if (currentActorRow && (currentActorRow as EntityRow).subscription_status) return
    setPolling(true)
    let tries = 0
    const interval = setInterval(async () => {
      tries++
      await refreshProfile()
      if (tries >= 5) {
        clearInterval(interval)
        setPolling(false)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [params, currentActorRow, refreshProfile])

  if (!currentActor || currentActor.kind !== 'entity') {
    return <div className="abo-page"><p>Sélectionne ton entité exposant pour gérer ton abonnement.</p></div>
  }

  const entity = currentActorRow as EntityRow
  const status = entity?.subscription_status as string | null

  const handlePortal = async () => {
    setOpening(true)
    try { await openCustomerPortal(currentActor.id) }
    catch (e) { console.error(e); setOpening(false) }
  }

  // États possibles : NULL/canceled → CTA boutique. trialing/active/past_due → portail.
  if (!status || status === 'canceled') {
    return (
      <div className="abo-page">
        <h1>Mon abonnement</h1>
        {params.get('status') === 'success' && polling && (
          <div className="abo-pending"><Loader2 className="animate-spin" /> Confirmation de ton paiement en cours…</div>
        )}
        {(!polling) && (
          <>
            <p>Pas d'abonnement actif sur cette entité.</p>
            <Link to="/boutique" className="abo-cta">Voir les offres Pro</Link>
          </>
        )}
      </div>
    )
  }

  const trialEnd = entity?.trial_end ? new Date(entity.trial_end as string) : null
  const periodEnd = entity?.current_period_end ? new Date(entity.current_period_end as string) : null
  const interval = entity?.billing_interval

  return (
    <div className="abo-page">
      <h1>Mon abonnement</h1>

      {status === 'past_due' && (
        <div className="abo-warning">
          <AlertTriangle strokeWidth={2} /> Paiement échoué. Mets à jour ton mode de paiement pour ne pas perdre ton accès Pro.
        </div>
      )}

      {status === 'trialing' && (
        <div className="abo-card">
          <h2>Essai gratuit Pro</h2>
          <p>Ton essai se termine le <strong>{trialEnd?.toLocaleDateString('fr-FR')}</strong>.</p>
          <p className="abo-muted">
            Tu seras prélevé de {interval === 'year' ? '119,88 € HT/an' : '11,99 € HT/mois'} à cette date.
            Annule avant pour ne pas être débité.
          </p>
        </div>
      )}

      {status === 'active' && (
        <div className="abo-card">
          <h2>Plan Pro {interval === 'year' ? 'annuel' : 'mensuel'}</h2>
          <p>
            Facturé <strong>{interval === 'year' ? '9,99 € HT/mois (119,88 € HT/an)' : '11,99 € HT/mois'}</strong>.
          </p>
          {periodEnd && <p className="abo-muted">Prochain renouvellement le {periodEnd.toLocaleDateString('fr-FR')}.</p>}
        </div>
      )}

      <button onClick={handlePortal} disabled={opening} className="abo-cta">
        {opening ? <Loader2 className="animate-spin" /> : <ExternalLink strokeWidth={2} />}
        {opening ? 'Redirection…' : 'Gérer mon abonnement (factures, CB, résiliation)'}
      </button>
    </div>
  )
}
```

- [ ] **Step 6.2 : Créer `src/pages/Abonnement.css`**

```css
.abo-page { max-width: 640px; margin: 0 auto; padding: 32px var(--page-padding); }
.abo-page h1 { font-family: var(--font-heading); font-size: 1.8rem; margin: 0 0 22px; }
.abo-card {
  border: 1px solid hsl(var(--border)); border-radius: 16px;
  padding: 22px; background: hsl(var(--card)); margin-bottom: 22px;
}
.abo-card h2 { margin: 0 0 10px; font-family: var(--font-heading); font-size: 1.2rem; }
.abo-muted { color: hsl(var(--muted-foreground)); font-size: 14px; margin-top: 8px; }
.abo-pending { display: flex; align-items: center; gap: 10px; padding: 14px; border-radius: 12px; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); }
.abo-pending .animate-spin { animation: spin 1s linear infinite; }
.abo-warning {
  display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 12px;
  background: color-mix(in srgb, var(--status-refuse) 12%, transparent);
  color: var(--status-refuse); border: 1px solid color-mix(in srgb, var(--status-refuse) 35%, transparent);
  margin-bottom: 18px;
}
.abo-cta {
  display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 999px;
  background: var(--gradient-primary); color: #fff; border: none; font-weight: 700; cursor: pointer;
  text-decoration: none;
}
.abo-cta:disabled { opacity: .6; cursor: not-allowed; }
```

- [ ] **Step 6.3 : Commit page Abonnement**

```bash
git add src/pages/Abonnement.tsx src/pages/Abonnement.css
git commit -m "feat(stripe): page /abonnement (état + portail Customer)"
```

---

## Task 7 : Routes + Navigation + Rebrancher ProTeaser/ProGate

**Files:**
- Modify: `src/App.tsx` (ajout routes /boutique et /abonnement)
- Modify: `src/components/layout/ProTeaser.tsx` (CTA vers /boutique)
- Modify: `src/components/layout/ProGate.tsx` (CTA vers /boutique)
- Modify: `src/components/layout/AppLayout.tsx` (route guard — ajout des nouvelles routes)

- [ ] **Step 7.1 : Ajouter les routes dans `src/App.tsx`**

Localisation : après `/communaute` (vers la ligne 106). Ajouter :

```tsx
import { BoutiquePage } from '@/pages/Boutique'
import { AbonnementPage } from '@/pages/Abonnement'
```

Et dans `<Routes>` :

```tsx
<Route path="/boutique" element={<AuthenticatedApp><BoutiquePage /></AuthenticatedApp>} />
<Route path="/abonnement" element={<AuthenticatedApp><AbonnementPage /></AuthenticatedApp>} />
```

- [ ] **Step 7.2 : Vérifier `AppLayout` route guard**

D'après `reference_applayout_route_guard.md`, AppLayout vire toute route hors nav + SHARED_PREFIXES. Si `/boutique` et `/abonnement` ne sont pas reconnus, l'user sera éjecté.

Lire `src/components/layout/AppLayout.tsx` et ajouter `/boutique` + `/abonnement` à la liste des chemins reconnus (probablement un `SHARED_PREFIXES` ou équivalent).

- [ ] **Step 7.3 : Rebrancher ProTeaser CTA vers /boutique**

Dans `src/components/layout/ProTeaser.tsx:25` :

```tsx
// Avant :
<Link to="/reglages" className="pro-teaser-btn">Passer en Pro — dès 9,99 € HT/mois</Link>
// Après :
<Link to="/boutique" className="pro-teaser-btn">Passer en Pro — dès 9,99 € HT/mois</Link>
```

- [ ] **Step 7.4 : Rebrancher ProGate CTA vers /boutique**

Dans `src/components/layout/ProGate.tsx:18` :

```tsx
// Avant :
<Link to="/reglages" className="mt-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Passer en Pro — dès 9,99 € HT/mois</Link>
// Après :
<Link to="/boutique" className="mt-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Passer en Pro — dès 9,99 € HT/mois</Link>
```

- [ ] **Step 7.5 : Ajouter "Mon abonnement" dans le menu utilisateur**

Trouver le menu profil (probablement dans `AppLayout.tsx` ou `Sidebar.tsx`). Ajouter une entrée "Mon abonnement" → `/abonnement` visible uniquement si `currentActor?.kind === 'entity'`.

Si le menu n'est pas trivial à localiser dans le temps imparti, alternative minimale : ajouter un lien dans `src/pages/Settings.tsx` ("Mon abonnement Fellowship Pro" → `/abonnement`).

- [ ] **Step 7.6 : Commit routes + nav**

```bash
git add src/App.tsx src/components/layout/ProTeaser.tsx src/components/layout/ProGate.tsx src/components/layout/AppLayout.tsx src/pages/Settings.tsx
git commit -m "feat(stripe): routes /boutique + /abonnement, CTAs rebranchés depuis ProTeaser/ProGate"
```

---

## Task 8 : Test intégration bout-en-bout avec Stripe CLI

**Pré-requis :** Stripe CLI installé (`stripe login`) ET secrets Stripe test renseignés dans Supabase (Task 0 → Uriel).

**Files :** aucun fichier modifié, c'est une session de tests manuels.

- [ ] **Step 8.1 : Forward webhooks Stripe vers production Supabase**

```bash
stripe listen --forward-to https://<projet>.supabase.co/functions/v1/stripe-webhook
```

Récupérer le **webhook signing secret** affiché et le poser temporairement dans les secrets Supabase (`pnpm supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`).

- [ ] **Step 8.2 : Test happy-path Checkout mensuel**

1. Ouvrir l'app en local (`pnpm dev`).
2. Se connecter avec un user test ayant une entité.
3. Aller sur `/boutique`.
4. Cliquer "Choisir" sur Mensuel.
5. Stripe Checkout s'ouvre : carte test `4242 4242 4242 4242`, CVC `123`, expiration `12/30`, code postal `75001`.
6. Confirmer.
7. Redirect vers `/abonnement?status=success`.

Vérifications attendues :
- `stripe listen` affiche : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`.
- Webhook répond `200`.
- DB : `SELECT subscription_status, plan, trial_end, billing_interval FROM entities WHERE actor_id = '<entity_id>';`
  - `subscription_status = 'trialing'`
  - `plan = 'pro'`
  - `trial_end ≈ now() + 14 days`
  - `billing_interval = 'month'`
- Page `/abonnement` affiche "Essai gratuit Pro — fin le …" et bouton "Gérer mon abonnement".

- [ ] **Step 8.3 : Test du portail Customer**

1. Sur `/abonnement`, cliquer "Gérer mon abonnement".
2. Stripe Portal s'ouvre.
3. Vérifier : factures (vide pendant trial), mode de paiement (CB ****4242), changement de plan possible, annulation possible.
4. Annuler l'abonnement (cancel at period end).

Vérifications :
- `stripe listen` affiche `customer.subscription.updated` avec `cancel_at_period_end: true`.
- DB : `subscription_status` reste à `'trialing'` (pas immédiatement canceled, l'user a payé pour la période).
- Page `/abonnement` affiche toujours l'essai jusqu'à la fin du trial.

- [ ] **Step 8.4 : Test paiement échoué**

1. Souscrire avec carte de test échec `4000 0000 0000 0341`.
2. Trial démarre normalement (CB validée).
3. Forcer la fin du trial : `stripe trigger invoice.payment_failed --customer <cus_xxx>` ou attendre.

Vérifications :
- Webhook reçoit `invoice.payment_failed`.
- DB : `subscription_status = 'past_due'`, `plan` reste `'pro'` (grace period).
- Page `/abonnement` affiche le bandeau rouge "Paiement échoué".

- [ ] **Step 8.5 : Test idempotence**

Re-déclencher manuellement un event déjà reçu :

```bash
stripe events resend <evt_id>
```

Vérifier que la requête répond `200` rapidement, que les logs `stripe-webhook` affichent `event ... already processed, skipping`, et qu'aucun UPDATE supplémentaire n'a lieu en DB.

- [ ] **Step 8.6 : Test annulation côté Stripe (subscription.deleted)**

Dans Stripe Dashboard test → Customers → la sub → "Cancel immediately".

Vérifications :
- Webhook reçoit `customer.subscription.deleted`.
- DB : `subscription_status = 'canceled'`, `plan = 'free'`.
- Recharger `/abonnement` → "Pas d'abonnement actif" + CTA `/boutique`.

- [ ] **Step 8.7 : Reset l'environnement de test**

```bash
# Stop stripe listen (Ctrl+C).
# Restaurer le STRIPE_WEBHOOK_SECRET prod si on a écrasé.
pnpm supabase secrets set STRIPE_WEBHOOK_SECRET=<prod whsec_...>
```

---

## Task 9 : Build + lint + tests + bump version + commit final

**Files:** `package.json`

- [ ] **Step 9.1 : Bump version**

Éditer `package.json` :

```diff
- "version": "0.7.169",
+ "version": "0.7.170",
```

- [ ] **Step 9.2 : Lancer tsc + build**

```bash
pnpm build 2>&1 | tail -10
```

Expected : `✓ built in …`, aucune erreur TypeScript.

- [ ] **Step 9.3 : Lancer lint**

```bash
pnpm lint 2>&1 | tail -10
```

Expected : sortie vide (aucun warning ni erreur).

- [ ] **Step 9.4 : Lancer tous les tests unitaires**

```bash
pnpm vitest run 2>&1 | tail -10
```

Expected : tous tests passent (≥ 214 d'avant + 0 de nouveaux acceptés).

- [ ] **Step 9.5 : Commit final + push**

```bash
git add package.json
git commit -m "chore(release): bump v0.7.170 (Stripe MVP)"
git push
```

- [ ] **Step 9.6 : Documenter pour Uriel les variables Stripe à configurer en prod**

Créer (ou mettre à jour) `docs/ops/stripe-setup.md` avec la checklist live :

```markdown
# Stripe — bascule test → live

1. Dans Stripe Dashboard, basculer en mode **Live**.
2. Refaire Product + 2 Prices (les Price IDs sont différents entre test et live).
3. Configurer Customer Portal en live (mêmes paramètres qu'en test).
4. Créer un endpoint webhook live → URL identique à l'endpoint test (même edge function), récupérer le nouveau `whsec_...`.
5. Stripe Tax : vérifier que la registration TVA française est bien active en live.
6. Renouveler les secrets Supabase avec les valeurs live :
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (nouveau, live)
   - `STRIPE_PRICE_MONTHLY=price_...` (nouveau, live)
   - `STRIPE_PRICE_YEARLY=price_...` (nouveau, live)
7. Re-deploy les 3 edge functions : `pnpm supabase functions deploy stripe-checkout-session stripe-portal-link stripe-webhook`.
8. Test final en live avec ta propre CB (annuler immédiatement après).
```

```bash
git add docs/ops/stripe-setup.md
git commit -m "docs(stripe): checklist bascule test → live"
git push
```

---

## Self-Review (à exécuter avant de lancer l'implémentation)

**1. Couverture du spec :**
- §2 Décisions de scope → Tasks 0–9 couvrent toutes les décisions (Checkout, Portal, trial 14j, Stripe Tax, schema sur entities, 1 customer par entité, cancel at period end, proration via portail).
- §3.1 Architecture → Tasks 0, 2, 3, 4 (edge functions et leurs interactions).
- §3.2 3 edge functions → Tasks 2, 3, 4 individuellement.
- §3.3 Schema DB → Task 1.
- §3.4 5 events webhook → Task 4 explicitement.
- §3.5 Lookup entité depuis webhook → Task 4 helper `lookupEntityIdFromSubscription`.
- §4 Frontend (Boutique + Abonnement + retour Checkout) → Tasks 5, 6 + Step 6.1 polling sur `status=success`.
- §5 Sécurité → Task 4 signature + idempotence, Tasks 2/3 owner checks (`can_act_as`), Task 0 service-role isolation.
- §6 Setup Stripe par Uriel → Pré-requis explicites + Task 9.6 checklist live.
- §7 Tests → Task 8 intégration Stripe CLI.

**2. Placeholders :** Aucun "TBD" ni "ajouter validation" ni "fill in details" → code complet dans chaque step.

**3. Cohérence des types :**
- `entityId: string` (UUID) cohérent entre Tasks 2, 3, 5, 6.
- `billingInterval: 'month' | 'year'` cohérent Tasks 2 et 5.
- `subscription_status` valeurs cohérentes entre check constraint (Task 1) et utilisations (Tasks 4, 6).
- `EntityRow` importée dans Task 6 depuis `@/types/database` (regénéré en Task 1).

**4. Risques résiduels signalés :**
- `pnpm supabase gen types` peut nécessiter une commande spécifique selon le projet — le plan fournit le fallback (mémoire `reference_supabase_rpc_types.md`).
- `AppLayout` route guard (Step 7.2) : si la nav n'a pas de `SHARED_PREFIXES` exporté, faire un greppage avant de modifier — l'engineer doit lire le fichier d'abord (mémoire `reference_applayout_route_guard.md`).
- Step 7.5 ("Mon abonnement" dans menu) : fallback explicite via Settings si menu utilisateur trop intriqué.

## Execution Handoff

Plan complet et sauvé. **Estimation : 7-8h de code** en ligne droite, parallélisable partiellement (Tasks 5 et 6 peuvent être faits par 2 subagents indépendants une fois Task 4 deployé).
