# Spec — Stripe MVP (abonnement Pro)

- **Date :** 2026-05-28
- **Cible release :** v0.7.170
- **Statut :** validé Uriel, prêt à plan d'implémentation
- **Décision stratégique de référence :** [`docs/decisions/0001-fondations-vision-packs-da.md`](../../decisions/0001-fondations-vision-packs-da.md) §5 (pricing + parrainage)

## 1. Objectif

Activer le moteur de revenus principal acté dans la fondation : **abonnement Pro par entité**, payé via Stripe. Parcours complet bout-en-bout (souscrire, gérer, résilier en autonomie) pour conformité légale (RGPD, droit de la consommation) et confiance client.

**Non-objectifs (reportés à des spec/release ultérieurs) :**
- Parrainage (1 mois offert par filleul) — reporté à une spec dédiée. Trop d'edge cases (annuel vs mensuel, valeur du crédit, anti-farm) pour un MVP shippable en 1 jour. Le principe reste acté dans `0001`.
- Historique des changements de plan (audit log) — V2.
- Dunning customisé pour paiements échoués — Stripe gère le retry par défaut, suffisant en V1.
- Multi-currency — EUR uniquement.

## 2. Décisions de scope (act ées avec Uriel le 2026-05-28)

| Décision | Choix | Pourquoi |
|---|---|---|
| Périmètre MVP | **Checkout + Customer Portal Stripe** | Parcours complet sans complexité custom. Stripe hébergé = pas de PCI scope. |
| Trial gratuit | **14 jours avec CB requise dès le départ** | Standard industrie (Notion, Linear). CB requise = conversion x2-3 vs sans CB. 14j adapté à un persona artisan-exposant qui se connecte 1-2 fois/semaine. |
| Régime fiscal | **Soumis TVA + Stripe Tax activé** | Société Fellowship assujettie. Stripe Tax calcule la TVA selon pays/statut du client, gère exonérations B2B intra-UE (numéro TVA intracom). |
| Schema DB | **Colonnes ajoutées à `entities`** (pas de table dédiée) | Aligné avec « Pro par entité » : 1 entité = au plus 1 souscription active. Lecture en 1 requête, pas de JOIN. RLS existante couvre. |
| Customer Stripe | **Un Customer par entité** (pas par personne) | L'abonnement vit sur l'entité, donc la facturation aussi. Une personne avec N entités = N Customers Stripe = N abonnements indépendants. |
| Politique d'annulation | **Cancel at period end** (configuré dans le portail) | L'user garde Pro jusqu'à la fin de la période payée. Standard, conforme. |
| Proration upgrade/downgrade | **Stripe défaut** (`create_prorations`) | Géré dans le Customer Portal. Pas de logique custom. |

## 3. Architecture

### 3.1 Diagramme en couches

```
Frontend (React)            Stripe (hosted)         Edge Functions (Supabase Deno)
─────────────────           ────────────────        ──────────────────────────────
[Boutique Pro]    ──POST──> stripe-checkout-session ──► Stripe API
  /boutique                                          ◄── { url, sessionId }
        ◄────────redirect─── Stripe Checkout
                              user paye / annule
                              redirect /abonnement?status=success|cancel

                              ╔══════════════════╗
                              ║  Stripe Webhook  ║─POST signed─► stripe-webhook
                              ╚══════════════════╝                vérif signature
                                                                  vérif idempotence
                                                                  UPDATE entities
                                                                  
[Mon abonnement]  ──POST──> stripe-portal-link ────► Stripe API
  /abonnement                                     ◄── { url }
        ◄────────redirect─── Stripe Customer Portal
                              cancel / factures / CB / changement plan
                              → webhook re-émis si change
```

### 3.2 Edge functions (Deno, Supabase)

Trois fonctions dans `supabase/functions/` :

**`stripe-checkout-session`** — `POST /functions/v1/stripe-checkout-session`
- **Auth :** JWT Supabase (utilisateur logué).
- **Body :** `{ entityId: string, billingInterval: 'month' | 'year' }`.
- **Vérifications :** l'auth user est owner ou admin de l'entité (`can_act_as(entityId)` côté SQL).
- **Logique :**
  1. Récupère ou crée `stripe_customer_id` pour l'entité (si NULL, `stripe.customers.create({ metadata: { entity_actor_id }})` + UPDATE entities).
  2. `stripe.checkout.sessions.create({ mode: 'subscription', customer, line_items: [{ price: STRIPE_PRICE_MONTHLY|YEARLY, quantity: 1 }], subscription_data: { trial_period_days: 14 }, automatic_tax: { enabled: true }, customer_update: { name: 'auto', address: 'auto' }, tax_id_collection: { enabled: true }, success_url, cancel_url, metadata: { entity_actor_id }})`.
  3. **Note Stripe Tax :** `tax_id_collection: { enabled: true }` permet au client B2B de saisir son numéro TVA intracom dans Checkout → Stripe applique l'exonération (reverse charge) automatiquement.
  3. Retourne `{ url }`.
- **Erreurs :** 401 si pas owner, 400 si entity introuvable, 500 si Stripe API down.

**`stripe-portal-link`** — `POST /functions/v1/stripe-portal-link`
- **Auth :** JWT Supabase.
- **Body :** `{ entityId: string }`.
- **Vérifications :** owner check + `stripe_customer_id IS NOT NULL`.
- **Logique :** `stripe.billingPortal.sessions.create({ customer: stripe_customer_id, return_url })` → retourne `{ url }`.

**`stripe-webhook`** — `POST /functions/v1/stripe-webhook` (pas d'auth Supabase, mais signature Stripe vérifiée)
- **Vérif signature :** `Stripe.webhooks.constructEventAsync(rawBody, signature, STRIPE_WEBHOOK_SECRET)`. Rejet 400 si invalide.
- **Idempotence :** `INSERT INTO stripe_events_processed(event_id) ON CONFLICT DO NOTHING`. Si déjà présent, retourne 200 sans rien faire.
- **Events gérés :** voir §3.4.
- **Sync DB :** via client Supabase service-role (bypass RLS pour writes Stripe).

### 3.3 Schema DB — migration `20260528240000_stripe_subscription.sql`

```sql
ALTER TABLE public.entities
  ADD COLUMN stripe_customer_id text,
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN subscription_status text,
  ADD COLUMN billing_interval text,
  ADD COLUMN current_period_end timestamptz,
  ADD COLUMN trial_end timestamptz;

-- subscription_status: NULL | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid'
ALTER TABLE public.entities ADD CONSTRAINT entities_subscription_status_check
  CHECK (subscription_status IS NULL OR subscription_status IN (
    'trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid'
  ));

ALTER TABLE public.entities ADD CONSTRAINT entities_billing_interval_check
  CHECK (billing_interval IS NULL OR billing_interval IN ('month','year'));

-- Lookup par subscription_id (utilisé par le webhook)
CREATE UNIQUE INDEX entities_stripe_subscription_id_key
  ON public.entities (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX entities_stripe_customer_id_key
  ON public.entities (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Idempotence webhook
CREATE TABLE public.stripe_events_processed (
  event_id text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_events_processed ENABLE ROW LEVEL SECURITY;
-- Pas de policies = inaccessible aux clients. Seul service-role écrit/lit.
```

**Sur le trigger `protect_entity_plan`** (déjà en place depuis v0.7.168) : il bloque les écritures de `plan` hors contextes autorisés. Le webhook utilisera la service-role qui contourne RLS et le trigger doit autoriser cette voie. À vérifier dans le plan d'implémentation : ajuster le trigger si nécessaire pour reconnaître le rôle Stripe-sync.

**RLS sur colonnes `stripe_*`** : les colonnes restent dans `entities`, donc la même RLS que la table. Les owners voient leurs propres données, les autres ne voient rien de sensible (le `stripe_customer_id` est un identifiant pas un secret, mais inutile aux non-owners). On peut envisager une vue publique qui n'expose pas les `stripe_*` si besoin V2.

### 3.4 Événements webhook gérés

| Event | Action DB |
|---|---|
| `checkout.session.completed` | Récupère subscription, écrit `stripe_customer_id`, `stripe_subscription_id`, `subscription_status='trialing'`, `trial_end`, `billing_interval`, `current_period_end`, `plan='pro'` |
| `customer.subscription.updated` | Sync `subscription_status`, `current_period_end`, `billing_interval`, `trial_end`. Dérive `plan = (status IN ('trialing','active','past_due')) ? 'pro' : 'free'` |
| `customer.subscription.deleted` | `subscription_status='canceled'`, `plan='free'` |
| `invoice.payment_failed` | `subscription_status='past_due'`, garde `plan='pro'` (grace period — Stripe retry auto) |
| `invoice.payment_succeeded` | `subscription_status='active'`, sync `current_period_end` |

**Pourquoi `past_due` garde Pro :** Stripe retry automatiquement la carte 3 fois sur ~3 semaines. Pendant cette grâce, on n'éjecte pas l'user (UX dure et il peut payer dans la semaine). Si après les retries Stripe abandonne, on reçoit `customer.subscription.deleted` → là on bascule en free.

### 3.5 Lookup entité depuis webhook

Le webhook reçoit `subscription.id` ou `customer.id`. Lookup :
```sql
SELECT actor_id FROM entities WHERE stripe_subscription_id = $1
-- ou en fallback
SELECT actor_id FROM entities WHERE stripe_customer_id = $1
```
Pour `checkout.session.completed` (premier event, pas encore d'`entity.stripe_subscription_id`), utiliser `session.metadata.entity_actor_id` qu'on a posé à la création de la session.

## 4. Frontend

### 4.1 Page `/boutique` (existante)

**État actuel :** maquette `docs/decisions/assets/boutique-pricing.html`. À auditer pour savoir si elle est déjà portée dans `src/pages/`. Sinon, à porter au passage.

**Changements :**
- 2 CTAs principaux : "Passer en Pro — mensuel" et "Passer en Pro — annuel".
- Click → fetch `stripe-checkout-session({ entityId: currentActor.id, billingInterval })` → `window.location.href = url`.
- Gestion d'erreur : toast minimal (`alert()` MVP, système de toast complet à part).
- Si `entity.plan === 'pro'` déjà → afficher "Tu es Pro 💪 " + lien vers `/abonnement`.
- Si `currentActor.kind !== 'entity'` → afficher "Sélectionne ton entité dans la navbar pour passer en Pro" + désactiver CTAs.

### 4.2 Page `/abonnement` (nouvelle)

Routée dans `src/pages/Abonnement.tsx`. Affiche selon l'état :

**`subscription_status === 'trialing'`** :
- Bandeau "Essai gratuit Pro jusqu'au [trial_end]"
- "Tu seras prélevé le [trial_end] de [11,99 € HT mensuel | 119,88 € HT annuel]"
- CTA "Gérer mon abonnement" → `stripe-portal-link` → redirect
- Note : "Annule avant le [trial_end] pour ne pas être débité"

**`subscription_status === 'active'`** :
- "Plan Pro — facturé [11,99 € HT/mois | 119,88 € HT/an]"
- "Prochain renouvellement le [current_period_end]"
- CTA "Gérer mon abonnement" → portal

**`subscription_status === 'past_due'`** :
- Alerte rouge "Paiement échoué — mets à jour ta CB sous 7 jours"
- CTA "Mettre à jour mon mode de paiement" → portal

**`subscription_status === 'canceled' || NULL`** (plan = 'free') :
- Redirect `/boutique` ou affiche "Pas d'abonnement actif" + bouton "Voir les offres".

### 4.3 Retour Checkout — `/abonnement?status=success|cancel`

- `success` : affiche une bannière "Bienvenue dans Pro 🎉" pendant quelques secondes. Force un refresh de `currentActor` (refetch entity) pour récupérer le nouveau plan.
  - **Note importante :** le webhook est asynchrone. Au retour Checkout, le webhook `checkout.session.completed` peut ne pas encore avoir été traité. Stratégie : poll `entity.subscription_status` toutes les 2s pendant max 10s, OU afficher "Confirmation en cours…" puis refresh.
- `cancel` : retour silencieux sur la page boutique avec message discret.

### 4.4 Navigation

Ajouter "Mon abonnement" dans le menu utilisateur (sidebar ou dropdown profil) — visible uniquement pour les entités. Pas dans la nav principale.

## 5. Sécurité

| Risque | Mitigation |
|---|---|
| Spoofing webhook | Vérification `Stripe.webhooks.constructEventAsync` avec `STRIPE_WEBHOOK_SECRET`. Rejet 400 si signature invalide. |
| Replay webhook | Table `stripe_events_processed`, INSERT ON CONFLICT DO NOTHING. |
| User force `entity.plan='pro'` via API | Trigger `protect_entity_plan` (déjà en place depuis v0.7.168). Seule la service-role peut écrire. |
| User crée une session checkout pour une entité qu'il ne possède pas | `stripe-checkout-session` vérifie `can_act_as(entityId)` avant Stripe API call. |
| User accède aux factures d'une autre entité via le portal | `stripe-portal-link` ne génère un lien que pour le `stripe_customer_id` de l'entité spécifiée + vérif owner. |
| Clé `STRIPE_SECRET_KEY` exposée | Stockée dans Supabase secrets (jamais dans le bundle frontend). Edge functions y accèdent via `Deno.env`. |
| Carte mémorisée chez un mauvais user | Stripe Customer dédié par entité = isolation totale. Un user avec N entités a N Customers indépendants. |

## 6. Setup Stripe (à faire par Uriel en parallèle de l'implémentation)

1. Compte Stripe en mode **Test** d'abord (clés test).
2. **Stripe Tax** → Settings → Tax → activer + renseigner numéro TVA + adresse société.
3. **Product** "Fellowship Pro" + 2 **Prices** :
   - `price_monthly` : 11,99 € HT, recurring monthly, tax behavior = exclusive
   - `price_yearly` : 119,88 € HT, recurring yearly, tax behavior = exclusive
4. **Customer Portal** → Settings → Billing → Customer Portal :
   - Cancellation : "At end of billing period"
   - Allow customers to switch plans : oui (monthly ↔ yearly)
   - Allow customers to update payment method : oui
   - Allow customers to view invoices : oui
   - Business info + ToS link
5. **Webhook endpoint** → Developers → Webhooks → Add endpoint :
   - URL : `https://<projet>.supabase.co/functions/v1/stripe-webhook`
   - Events : les 5 listés en §3.4
   - Récupérer le **signing secret** (`whsec_...`)
6. **Secrets Supabase** (via CLI ou dashboard) :
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - `STRIPE_PRICE_MONTHLY=price_...`
   - `STRIPE_PRICE_YEARLY=price_...`
7. **`.env` local** :
   - `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` (pour usages futurs côté client, optionnel V1)

Une fois validé en test, on bascule en **Live** en répétant les étapes 3-6 avec les clés live.

## 7. Tests

### 7.1 Tests unitaires
- `stripe-webhook` : pour chaque event, mock du payload Stripe, vérifier UPDATE entities correct.
- Idempotence : envoyer 2x le même event, vérifier 1 seul UPDATE.
- Signature invalide : rejet 400.

### 7.2 Tests d'intégration (Stripe CLI)
- `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`
- `stripe trigger checkout.session.completed`, `customer.subscription.updated`, etc.
- Vérifier les UPDATE dans la DB locale.

### 7.3 Tests manuels (mode test Stripe)
- Souscrire en mensuel avec carte test `4242 4242 4242 4242`.
- Vérifier `entity.plan='pro'`, `subscription_status='trialing'`, `trial_end` à +14j.
- Aller dans le portail, cancel → vérifier event `customer.subscription.updated` → check rester `'trialing'` jusqu'à fin de période, puis `canceled`.
- Simuler paiement échoué avec carte `4000 0000 0000 0341`.

## 8. Variables d'environnement (récap)

| Variable | Où | Valeur |
|---|---|---|
| `STRIPE_SECRET_KEY` | Supabase secrets | `sk_test_...` puis `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Supabase secrets | `whsec_...` (différent test/live) |
| `STRIPE_PRICE_MONTHLY` | Supabase secrets | `price_...` |
| `STRIPE_PRICE_YEARLY` | Supabase secrets | `price_...` |
| `SUPABASE_URL` | Supabase secrets (auto) | URL projet |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secrets (auto) | service-role JWT |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `.env` local + Netlify | `pk_test_...` puis `pk_live_...` (optionnel V1) |

## 9. Estimation timeline

| Étape | Durée |
|---|---|
| Migration DB + ajustement trigger `protect_entity_plan` | 30 min |
| Edge function `stripe-checkout-session` | 1h |
| Edge function `stripe-portal-link` | 30 min |
| Edge function `stripe-webhook` (5 events + idempotence + tests unitaires) | 1.5h |
| Frontend `/boutique` — relier CTAs (audit + port si pas déjà fait) | 1.5h |
| Frontend `/abonnement` (nouvelle page) | 1.5h |
| Tests intégration avec Stripe CLI | 1h |
| Vérification build/lint/tests + commit + push | 30 min |
| **Total code** | **~7-8h** |

En parallèle, setup Stripe par Uriel (45 min — 1h) — peut prendre plus si Stripe Tax demande une vérification KYC.

## 10. Points ouverts (à valider avant exécution)

- [ ] **Page `/boutique` déjà portée ?** À auditer dans `src/pages/`. Si pas portée, +1.5h pour le port complet.
- [ ] **Adresse de facturation collectée** dans Checkout ? Requis pour Stripe Tax (calcul TVA par pays). Réponse : oui, `customer_update: { address: 'auto' }` dans Checkout config.
- [x] **Numéro TVA intracom** du client collecté pour exonération B2B → activé via `tax_id_collection: { enabled: true }` dans Checkout (cf. §3.2).
- [ ] **Politique de prix en cours d'abonnement** : si on monte les prix dans 6 mois, les souscriptions existantes restent à l'ancien prix (grandfathering) ou suivent ? Stripe gère ça via Price ID — un changement nécessite un re-Price + migration. À documenter quand on changera, pas maintenant.

## 11. Suite (post-MVP, dans l'ordre de priorité)

1. **Parrainage** (cf. `0001` §5) — spec dédiée. Système simple : coupon Stripe -100% sur 1er mois du filleul, code unique par parrain stocké en DB, crédit parrain à confirmer (option : crédit Stripe `customer.balance`).
2. **Toast/notice global** (cf. dette de v0.7.169) — utile pour les erreurs Checkout/Portal.
3. **Historique des changements de plan** (table `subscription_events`) — quand le support en aura besoin.
4. **Multi-currency** (EUR → USD/GBP) — quand on ouvre l'international.
