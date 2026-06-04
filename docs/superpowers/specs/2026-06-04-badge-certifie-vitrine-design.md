# Badge « Certifié » sur la vitrine — design (lot 1)

- **Date :** 2026-06-04
- **Statut :** `validé` (design approuvé ; plan d'implémentation à écrire)
- **Décision source :** [`docs/decisions/0004-badge-certifie-levier-pro.md`](../../decisions/0004-badge-certifie-levier-pro.md)
- **Périmètre :** lot 1 = **vitrine publique uniquement** (+ nudge). Explorer / Communauté / Participants = lot 2 (hors-scope).

## Objectif

Rendre le forfait Pro **visible de l'extérieur** via un badge « Certifié » sur la vitrine, et
créer un **déclencheur d'upgrade** (nudge) pour les comptes gratuits. Le badge est l'argument de
vente de tête : on vend de la crédibilité/statut, pas du gating fonctionnel.

## Modèle d'affichage

Fonction pure, à colocaliser avec `planForActor()` dans `src/lib/navModel.ts` :

```ts
export function isCertified(entity: { plan?: string | null; verified?: boolean | null }): boolean {
  return entity?.plan === 'pro' || entity?.verified === true
}
```

**Pourquoi cette dérivation (et pas une matérialisation de `verified` en base) :**
- **Override manuel gratuit** : `verified = true` force le badge même sans plan Pro → permet de
  certifier un compte officiel non-payant (ex. festival), garde-fou anti-usurpation de la décision 0004.
- **Zéro logique back** : aucune modif de la webhook Stripe ; pas de risque de clobber au churn
  (un `verified` posé à la main n'est jamais écrasé).
- **Comps** (ex. Bilskirnir, `plan = 'pro'` posé à la main le 2026-06-04) → certifiés automatiquement.
- **Essai (trialing)** → suit `plan` (choix KISS validé) : le badge s'affiche dès que `plan = 'pro'`,
  quel que soit le `subscription_status`. On raffinera si on active de vrais essais.

`verified` (colonne `entities.verified`, booléen) est aujourd'hui **inutilisée dans l'app** → terrain vierge.

## Composant `CertifiedBadge`

Fichier : `src/components/ui/CertifiedBadge.tsx`. Présentational pur (aucun accès données).

- **Visuel :** étoile dorée pleine + label « Certifié ». Couleur = token **`--status-repere`**
  (doré, déjà adapté jour/nuit dans `src/index.css`).
- **Props :**
  - `size?: 'sm' | 'md'` (défaut `'sm'`)
  - `showLabel?: boolean` (défaut `true` ; `false` = icône seule, utile pour les listes du lot 2)
  - `className?: string`
- **Contraintes DA jour/nuit** (checklist maison) : SVG en `fill="currentColor"` / `stroke="currentColor"`,
  **aucun `#fff` ni couleur en dur**, la couleur vient du token via `color`. Vérifier le rendu dans les deux modes.
- **Wording :** « Certifié » (pas « Membre de la Guilde »). Ne **jamais** afficher « identité vérifiée »
  ni le `subscription_status` brut.

## Placement (lot 1)

`src/components/vitrine/VitrineHeader.tsx` (~ligne 34), à droite de `entity.brand_name` :

```tsx
<div className="v-brand">
  {entity.brand_name}
  {isCertified(entity) && <CertifiedBadge size="sm" />}
</div>
```

Données déjà disponibles : `src/hooks/use-vitrine.ts` fait `select('*')` → `plan` et `verified`
sont déjà chargés. **Aucune modif de requête.**

## Le nudge (déclencheur d'upgrade)

Sur `src/pages/PublicProfile.tsx`, afficher une carte d'incitation **si et seulement si** :
1. le visiteur est **propriétaire** de l'entité affichée — son `actor_id` figure dans les `entities`
   exposées par `useAuth()` (la vitrine est la sienne) ; **et**
2. `!isCertified(entity)`.

- **Contenu :** titre « Passez Pro pour certifier votre compte » + sous-texte (« signe de sérieux
  pour les organisateurs ») + CTA vers la page Pro (Boutique). Style DA cuivre doux.
- **Invisible** pour les visiteurs externes et pour les comptes déjà certifiés.
- **CTA :** route de l'upsell Pro (Boutique). Cible exacte à confirmer à l'implémentation
  (`src/pages/Boutique.tsx` est la page Pro).

## Tests (TDD)

- **`isCertified`** = fonction pure → tests unitaires (pattern pure-function maison, cf.
  `reference_react_test_infra` : RTL ne flush pas en sync sur cette stack) :
  - `plan: 'pro'` → `true`
  - `verified: true` (plan free/null) → `true`
  - `plan: 'free', verified: false` → `false`
  - `plan: null, verified: null` → `false`
  - `plan: 'free', verified: true` → `true` (override)
- **Composant + nudge** : vérification visuelle dans l'app (jour + nuit), pas de test RTL.

## Hors-scope (→ lot 2)

Badge dans **Explorer / Communauté (Suggestions, Activity) / ParticipantsModal**. Ces surfaces
passent par la vue `actor_public`, qui **n'expose ni `plan` ni `verified`**. Nécessite d'étendre
la vue (changement DB + régénération des types) — traité dans un lot séparé. Le composant
`CertifiedBadge` est conçu dès maintenant pour ce réemploi (`showLabel={false}`).

## Fichiers touchés (lot 1)

| Fichier | Action |
|---|---|
| `src/lib/navModel.ts` | + fonction `isCertified()` |
| `src/lib/navModel.test.ts` (ou équivalent) | + tests unitaires `isCertified` |
| `src/components/ui/CertifiedBadge.tsx` | nouveau composant |
| `src/components/vitrine/VitrineHeader.tsx` | rendu du badge à côté du nom |
| `src/pages/PublicProfile.tsx` | nudge propriétaire + non-certifié |
| `src/index.css` (au besoin) | styles nudge / badge si pas tout en classes utilitaires |
| `version.ts` | bump patch APP_VERSION |
