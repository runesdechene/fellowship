# Lot 7c — L'offre Pro et le paiement — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/pro` devient la page de l'offre de la maquette, branchée sur le paiement Stripe existant, avec retour dans la V2.

**Architecture:** prix et libellés dans `lib/pricing.ts` (pur, testé) ; appels Stripe dans `lib/stripe.ts` (la décision « paiement ou espace de gestion » est pure et testée) ; écran dans `features/pro/` ; deux fonctions serveur reçoivent un `returnTo: 'v2'` optionnel, rétrocompatible.

**Tech Stack:** React 19, React Router 7, supabase-js 2 (`functions.invoke`), Deno (fonctions Supabase), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-08-lot-7c-offre-pro-v2-design.md`.

## Global Constraints

- Prix affichés = prix facturés par Stripe aujourd'hui : **1199 centimes HT / mois, 11988 centimes HT / an**, écrits seulement dans `lib/pricing.ts`.
- FAQ, troisième réponse : « L'abonnement démarre à la fin de l'essai ; tu peux l'annuler en un clic avant. »
- Sans `returnTo`, les fonctions serveur se comportent exactement comme aujourd'hui (V1).
- Le redéploiement des fonctions serveur se fait **avec l'accord explicite d'Uriel**, au moment de le faire.
- Aucun paiement réel pour tester.
- Mêmes règles de dépôt que les lots 7a/7b (lint, en-têtes, jetons, tests par `pnpm exec vitest run <fichier>`).

## Review Focus

1. **Double clic sur « Essayer 14 jours »** : un seul appel part. `startCheckout` est appelé une fois ; le bouton passe à « Ouverture… » et se désactive (tâche 4).
2. **Retour de Stripe avant que le webhook ait mis l'enseigne au Pro** : la page relit au plus 8 fois puis rassure, sans boucle infinie. `nextPoll` testé (tâche 2).
3. **Un compte personnel sur `/pro`** : aucun appel Stripe possible (bouton grisé) (tâche 4).
4. **La fonction répond `portal: true`** (abonnement déjà en cours) : on ouvre l'espace de gestion, pas une erreur. `checkoutOutcome` testé (tâche 2).
5. **`?formule=` invalide dans l'adresse** : retombe sur l'annuel. `formulaFrom` testé (tâche 1).

---

### Task 1 : `lib/pricing.ts` et `formatPrice`

**Files:** Create `apps/web-v2/src/lib/pricing.ts`, `apps/web-v2/src/lib/pricing.test.ts` ; Modify `apps/web-v2/src/lib/money.ts`, `money.test.ts`.

**Interfaces — Produces:**
```ts
export type Formula = 'annuel' | 'mensuel'
export const PRICES = { monthly: 1199, yearly: 11988 } as const   // centimes HT
export function formulaFrom(raw: string | null): Formula            // défaut 'annuel'
export function annualSaving(): number                              // 17
export function proPriceLines(formula: Formula): { big: string; unit: string; note: string }
export function billingInterval(formula: Formula): 'month' | 'year'
// money.ts
export function formatPrice(cents: number): string                  // « 9,99 € », « 119,88 € »
```

- [ ] **Step 1 : tests** (`pricing.test.ts`, et un `describe('formatPrice')` dans `money.test.ts`) :

```ts
describe('formatPrice', () => {
  it('écrit les centimes à la française', () => {
    expect(formatPrice(999)).toBe('9,99 €')
    expect(formatPrice(11988)).toBe('119,88 €')
    expect(formatPrice(1200)).toBe('12,00 €')
  })
})
```

```ts
/**
 * QUOI     — tests de lib/pricing.ts : la formule, l'économie annuelle, les libellés de la carte Pro.
 * POURQUOI — les prix affichés doivent être ceux que Stripe facture.
 */
import { describe, expect, it } from 'vitest'
import { annualSaving, billingInterval, formulaFrom, proPriceLines } from './pricing'

describe('formulaFrom', () => {
  it('annuel par défaut, et pour une valeur inconnue', () => {
    expect(formulaFrom(null)).toBe('annuel')
    expect(formulaFrom('n-importe')).toBe('annuel')
    expect(formulaFrom('mensuel')).toBe('mensuel')
  })
})

describe('annualSaving', () => {
  it('l’annuel coûte 17 % de moins que douze mensualités', () => {
    expect(annualSaving()).toBe(17)
  })
})

describe('proPriceLines', () => {
  it('en annuel : l’équivalent mensuel, et le détail facturé', () => {
    expect(proPriceLines('annuel')).toEqual({
      big: '9,99 €',
      unit: 'HT / mois',
      note: 'Facturé 119,88 € HT par an · ou 11,99 € HT en mensuel',
    })
  })
  it('en mensuel : le prix du mois, et l’annuel en regard', () => {
    expect(proPriceLines('mensuel')).toEqual({
      big: '11,99 €',
      unit: 'HT / mois',
      note: 'ou 9,99 € HT par mois en annuel',
    })
  })
})

describe('billingInterval', () => {
  it('traduit la formule pour Stripe', () => {
    expect(billingInterval('annuel')).toBe('year')
    expect(billingInterval('mensuel')).toBe('month')
  })
})
```

- [ ] **Step 2 :** RED (`Failed to resolve import "./pricing"`, `formatPrice is not a function`).
- [ ] **Step 3 :** implémentation.

```ts
// money.ts
/** « 9,99 € » — un prix en centimes, toujours avec ses deux décimales. */
export function formatPrice(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}
```

```ts
/**
 * QUOI     — les prix du Pro et ce que la page de l'offre en dit.
 * POURQUOI — un seul endroit : le changement de prix (9,99 € HT / 99,90 € HT, après la V2) ne
 *            touchera que ce fichier, en même temps que Stripe.
 * ATTENTION — ces montants DOIVENT être ceux que Stripe facture (prix STRIPE_PRICE_MONTHLY et
 *            STRIPE_PRICE_YEARLY des fonctions serveur) : afficher un prix et en facturer un autre
 *            est le pire des bugs.
 */
import { formatPrice } from './money'

export type Formula = 'annuel' | 'mensuel'

/** En centimes HT. */
export const PRICES = { monthly: 1199, yearly: 11988 } as const

export function formulaFrom(raw: string | null): Formula {
  return raw === 'mensuel' ? 'mensuel' : 'annuel'
}

export function annualSaving(): number {
  return Math.round((1 - PRICES.yearly / (PRICES.monthly * 12)) * 100)
}

export function proPriceLines(formula: Formula) {
  const perMonthYearly = Math.round(PRICES.yearly / 12)
  return formula === 'annuel'
    ? {
        big: formatPrice(perMonthYearly),
        unit: 'HT / mois',
        note: `Facturé ${formatPrice(PRICES.yearly)} HT par an · ou ${formatPrice(PRICES.monthly)} HT en mensuel`,
      }
    : {
        big: formatPrice(PRICES.monthly),
        unit: 'HT / mois',
        note: `ou ${formatPrice(perMonthYearly)} HT par mois en annuel`,
      }
}

export function billingInterval(formula: Formula): 'month' | 'year' {
  return formula === 'annuel' ? 'year' : 'month'
}
```

- [ ] **Step 4 :** GREEN. **Step 5 :** commit `feat(v2): les prix du Pro, à un seul endroit`.

---

### Task 2 : `lib/stripe.ts`, le retour, `reloadIdentity`

**Files:** Create `apps/web-v2/src/lib/stripe.ts`, `apps/web-v2/src/lib/stripe.test.ts` ; Modify `apps/web-v2/src/lib/auth.tsx` (exposer `reloadIdentity`).

**Interfaces — Produces:**
```ts
export type CheckoutOutcome = { kind: 'redirect'; url: string } | { kind: 'portal' } | { kind: 'error' }
export function checkoutOutcome(data: { url?: string; portal?: boolean; error?: string } | null): CheckoutOutcome
export function nextPoll(attempt: number, pro: boolean): 'stop-pro' | 'wait' | 'stop-late'   // 8 essais
export const POLL_EVERY_MS = 2000
export async function startCheckout(entityId: string, interval: 'month' | 'year'): Promise<void>  // lève en cas d'échec
export async function openPortal(entityId: string): Promise<void>
// auth.tsx : reloadIdentity: () => Promise<void> dans AuthContextValue
```

- [ ] **Step 1 : tests** :

```ts
describe('checkoutOutcome', () => {
  it('une adresse : on part vers Stripe', () => {
    expect(checkoutOutcome({ url: 'https://checkout.stripe.com/x' })).toEqual({ kind: 'redirect', url: 'https://checkout.stripe.com/x' })
  })
  it('déjà abonné : l’espace de gestion', () => {
    expect(checkoutOutcome({ portal: true })).toEqual({ kind: 'portal' })
  })
  it('rien d’exploitable : une erreur', () => {
    expect(checkoutOutcome(null)).toEqual({ kind: 'error' })
    expect(checkoutOutcome({ error: 'x' })).toEqual({ kind: 'error' })
  })
})

describe('nextPoll', () => {
  it('s’arrête dès que le Pro est là', () => {
    expect(nextPoll(1, true)).toBe('stop-pro')
  })
  it('relit tant qu’il reste des essais', () => {
    expect(nextPoll(7, false)).toBe('wait')
  })
  it('s’arrête au huitième essai, sans boucler', () => {
    expect(nextPoll(8, false)).toBe('stop-late')
  })
})
```

- [ ] **Step 2 :** RED. **Step 3 :** implémentation : fonctions pures ci-dessus ; `startCheckout` appelle `supabase.functions.invoke('stripe-checkout-session', { body: { entityId, billingInterval: interval, returnTo: 'v2' } })`, applique `checkoutOutcome` : `redirect` → `window.location.assign(url)`, `portal` → `openPortal(entityId)`, `error` → `throw new Error('checkout')`. `openPortal` appelle `stripe-portal-link` avec `{ entityId, returnTo: 'v2' }` et redirige, ou lève. Dans `auth.tsx`, ajouter au contexte `reloadIdentity: () => user ? loadIdentity(user.id) : Promise.resolve()` (mémorisé par `useCallback`).
- [ ] **Step 4 :** GREEN, lint. **Step 5 :** commit `feat(v2): ouvrir le paiement Stripe et revenir dans la V2`.

---

### Task 3 : les fonctions serveur acceptent `returnTo: 'v2'`

**Files:** Modify `supabase/functions/stripe-checkout-session/index.ts`, `supabase/functions/stripe-portal-link/index.ts`.

- [ ] **Step 1 :** dans les deux, le type `Body` gagne `returnTo?: 'v2'`. Checkout :

```ts
const v2 = body.returnTo === 'v2'
// …
success_url: v2
  ? `${appUrl}/v2/pro?statut=succes&session_id={CHECKOUT_SESSION_ID}`
  : `${appUrl}/abonnement?status=success&session_id={CHECKOUT_SESSION_ID}`,
cancel_url: v2 ? `${appUrl}/v2/pro` : `${appUrl}/boutique?status=cancel`,
```

  Portail : `return_url: body.returnTo === 'v2' ? `${appUrl}/v2/pro` : `${appUrl}/abonnement``.
- [ ] **Step 2 :** relire le diff : sans `returnTo`, les chaînes produites sont identiques à avant.
- [ ] **Step 3 :** commit `feat(stripe): retour vers la V2 sur demande, la V1 inchangée`. **Ne pas déployer ici** (tâche 5, avec l'accord d'Uriel).

---

### Task 4 : la page `/pro`

**Files:** Modify `apps/web-v2/src/features/pro/ProPage.tsx` ; Create `features/pro/PlanCard.tsx`, `ProFaq.tsx`, `useCheckoutReturn.ts`, README à jour ; Modify `styles/3-components/pro.css`, jetons « LE PRO » de `2-semantic.css`.

- [ ] **Step 1 :** relever `2092:2` et `2165:2` (`get_design_context`) : en-tête, choix de formule (`Segmented` sans icônes, « Annuel » avec la pastille « −{annualSaving()} % »), cartes, encart « Bientôt », FAQ.
- [ ] **Step 2 : `ProPage`** : `formulaFrom(params.get('formule'))`, écrit `?formule=` en `replace` ; `usePlan()` et `useAuth()` (l'acteur est-il une enseigne ?) ; `useCheckoutReturn()` affiche le bandeau. Carte Pro d'abord sur mobile (ordre CSS).
- [ ] **Step 3 : `PlanCard` Pro** : `proPriceLines(formula)`, les trois groupes d'avantages de la maquette, et le bouton selon le tableau de la spec ; état local `opening` (« Ouverture… », `disabled`) ; une erreur rend « Le paiement n'a pas pu s'ouvrir. Réessaie dans un instant. » sous le bouton. Compte personnel : bouton `disabled` et la phrase de la spec.
- [ ] **Step 4 : `useCheckoutReturn`** : si `?statut=succes`, montre « Bienvenue dans le Pro. Ton essai de 14 jours commence. » et relit `reloadIdentity()` toutes les `POLL_EVERY_MS` selon `nextPoll` ; à `stop-pro` ou `stop-late`, retire `statut` et `session_id` de l'adresse (`replace`). `stop-late` change le texte en « Ton paiement est enregistré ; ton compte passe au Pro dans quelques instants. »
- [ ] **Step 5 :** `pnpm lint && pnpm build`, comparer en dev (`?plan=free`) aux deux cadres. Commit `feat(v2): la page de l'offre Pro`.

---

### Task 5 : relecture, déploiements, coche

- [ ] Relecture finale par un agent neuf ; corrections.
- [ ] **Demander à Uriel** l'accord de redéployer `stripe-checkout-session` et `stripe-portal-link` (`node_modules/supabase/bin/supabase.exe functions deploy <nom>`), puis déployer.
- [ ] Déployer la V2 (version mineure suivante) ; cocher « 7c ☑ » et « Lot 7 ☑ » dans le plan directeur ; push.
- [ ] Demander à Uriel de tester le parcours avec un code promo à 100 % ou en mode test Stripe.
