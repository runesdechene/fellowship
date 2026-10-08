# Lot 7c — L'offre Pro et le paiement dans la V2

> 08/10/2026. Troisième et dernière partie du lot 7 du plan directeur, après 7a (bilans) et 7b
> (statut Pro), livrés. Design validé par Uriel le 08/10/2026.

## Pourquoi

Toutes les invitations du gratuit mènent à `/pro`, qui n'est encore qu'une page d'attente
renvoyant vers la V1. Ce lot en fait la vraie page de l'offre, branchée sur le paiement Stripe
déjà en place, et ramène l'exposant dans la V2 après le paiement.

## Décisions (Uriel, 08/10/2026)

1. **La page affiche les prix que Stripe facture aujourd'hui** (11,99 € HT / mois, 119,88 € HT / an),
   écrits à un seul endroit (`lib/pricing.ts`). Le changement de prix décidé (9,99 € HT / 99,90 € HT)
   vient **après** la V2, et mettra à jour cet endroit en même temps que Stripe. La V2 n'étant
   ouverte qu'aux admins, personne ne voit l'ancien prix d'ici là.
2. **La FAQ ne promet pas de rappel** avant la fin de l'essai : rien ne l'envoie aujourd'hui. Elle dit
   « L'abonnement démarre à la fin de l'essai ; tu peux l'annuler en un clic avant. » (maquette mise à
   jour, ordinateur et mobile).
3. **Mobile** : `2027 mobile — Offre Pro` dessiné le 08/10/2026 — les cartes l'une sous l'autre, le Pro
   d'abord.

## Les maquettes — elles font foi

| Écran | Cadre Figma |
|---|---|
| Offre Pro, ordinateur | `2027 — Offre Pro` (`2092:2`) |
| Offre Pro, mobile | `2027 mobile — Offre Pro` (`2165:2`) |

## Ce que le lot livre

### 1. La page `/pro`

- En-tête : pastille Pro, « Planifie toute ton année. », « Les exposants qui anticipent ne ratent ni
  une clôture de candidature, ni une nouvelle édition. »
- Le choix **Mensuel / Annuel** (« −17 % » sur Annuel), **Annuel par défaut**. Le choix vit dans
  l'adresse (`?formule=mensuel`), le retour arrière du navigateur le suit.
- **Carte Gratuit** : « 0 € pour toujours », « Sans carte bancaire », la liste de la maquette ;
  « Ton offre actuelle » si l'enseigne est gratuite.
- **Carte Pro** : en annuel, le prix mensuel équivalent en grand (« 9,99 € HT / mois ») et « Facturé
  119,88 € HT par an · ou 11,99 € HT en mensuel » ; en mensuel, « 11,99 € HT / mois » et « ou 9,99 € HT
  par mois en annuel ». Les trois groupes d'avantages de la maquette (Anticiper, Tenir le cap, Être
  reconnu). Tous les montants viennent de `lib/pricing.ts`, formatés par `lib/money.ts`.
- **« Le coût de la route · Bientôt »**, tel quel.
- **Questions fréquentes** : les trois de la maquette, la troisième selon la décision 2.

### 2. Les gestes

| Situation | Bouton de la carte Pro | Ce qu'il fait |
|---|---|---|
| Enseigne gratuite | « Essayer 14 jours gratuitement » | ouvre le paiement Stripe (formule choisie) |
| Enseigne déjà Pro | « Gérer mon abonnement » (+ « Ton offre actuelle ») | ouvre l'espace de gestion Stripe |
| Compte personnel | grisé, « Le Pro vit sur une enseigne : passe sur ton compte exposant. » | rien |

- Le paiement passe par la fonction existante `stripe-checkout-session` (`entityId`,
  `billingInterval`). Si elle répond `portal: true` (abonnement déjà en cours), la page ouvre
  l'espace de gestion à la place, comme la V1.
- Pendant l'appel, le bouton dit « Ouverture… » et ne se reclique pas ; une erreur s'affiche sous le
  bouton (« Le paiement n'a pas pu s'ouvrir. Réessaie dans un instant. »).
- Les coordonnées de facturation (raison sociale, SIREN) sont demandées par Stripe lui-même
  (`tax_id_collection`, déjà actif) : la V2 n'a pas de formulaire de facturation.

### 3. Le retour

- `stripe-checkout-session` et `stripe-portal-link` acceptent un champ optionnel
  `returnTo: 'v2'`. Avec lui : succès → `/v2/pro?statut=succes&session_id=…`, annulation →
  `/v2/pro`, retour de l'espace de gestion → `/v2/pro`. **Sans lui, rien ne change** pour la V1.
- Sur `?statut=succes` : un bandeau « Bienvenue dans le Pro. Ton essai de 14 jours commence. » La
  base n'apprend le paiement que par le webhook, quelques secondes plus tard : la V2 relit
  l'identité (`reloadIdentity`, nouveau dans `useAuth`) toutes les 2 secondes, **au plus 8 fois**,
  jusqu'à ce que l'enseigne soit Pro ; puis le paramètre est retiré de l'adresse. Si le Pro n'est
  toujours pas là, le bandeau dit « Ton paiement est enregistré ; ton compte passe au Pro dans
  quelques instants. »

### 4. Les fonctions serveur

Deux changements minimes, rétrocompatibles, redéployés en production avec l'accord d'Uriel au
moment de le faire (`supabase functions deploy`). Le reste des fonctions (essai, parrainage, taxe,
codes promo, webhook) ne bouge pas.

## Comment c'est construit

- `lib/pricing.ts` + test (TDD) : `PRICES` (centimes HT, mensuel et annuel), `monthlyEquivalent`,
  `annualSaving` (le « −17 % »), et les libellés de la carte Pro selon la formule.
- `lib/stripe.ts` : `startCheckout(entityId, interval)` et `openPortal(entityId)`, qui appellent les
  fonctions avec `returnTo: 'v2'` et redirigent. Logique de choix (« déjà abonné ? ») testée à part.
- `features/pro/` : `ProPage` (remplace la page d'attente), `PlanCard`, `ProFaq`, `useCheckoutReturn`
  (le retour et la relecture bornée).
- `lib/auth.tsx` : `reloadIdentity()` exposé (la fonction `loadIdentity` existe déjà).
- Styles : `styles/3-components/pro.css`, jetons uniquement ; la carte Pro porte le liseré terre de
  la maquette.

## Vérification

- Tests de `lib/pricing.ts` (équivalent mensuel, économie arrondie, libellés des deux formules) et de
  la décision de `lib/stripe.ts`.
- `pnpm lint`, tests, build ; écran comparé à `2092:2` et `2165:2`.
- **Aucun paiement réel pour tester.** Le passage par Stripe se vérifie par Uriel : soit en mode test
  Stripe s'il existe, soit avec un code promo à 100 % (déjà en place : `allow_promotion_codes`).

## Hors de ce lot

- Le changement de prix (Stripe, V1, V2, abonnés actuels) : **après la V2**.
- Le rappel avant la fin de l'essai : lot 8 si on le veut un jour.
- Le calcul du coût de la route : « Bientôt ».
