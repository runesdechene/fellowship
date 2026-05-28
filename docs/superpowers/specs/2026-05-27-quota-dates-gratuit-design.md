# Quota de dates — palier gratuit — Design

> **Statut :** validé (brainstorm 2026-05-27). Remplace le cap d'horizon « 3 mois » de [[project_mes_dates_done]] (abandonné, cf. `docs/superpowers/specs/2026-05-27-mes-dates-design.md` §Mise à jour). S'appuie sur le plan Pro par entité ([[project_pro_per_entity]]) et `participationChip`/statuts unifiés.

## Contexte & problème

« Mes dates » affiche désormais **tout** (plus de cap de visibilité — gater sa propre donnée fait punitif et fait doublon avec le Calendrier). Le palier gratuit doit donc se matérialiser **ailleurs** : par une **limite de capacité**, pas de visibilité.

Décision : un **quota de dates suivies** pour l'**entité gratuite**. Aligne le paywall sur l'usage (les exposants actifs, qui tirent le plus de valeur, paient ; le hobbyiste reste gratuit), sans jamais cacher la donnée déjà saisie. Le mur arrive au **bon moment** : quand l'utilisateur veut suivre une date de plus (pic d'intention).

## Sémantique du quota (décidée)

- **Assiette** : « **dates à venir actives** » = participations de l'acteur dont `events.end_date >= now` **et** `status !== 'refuse'`. Les dates passées sortent du compteur toutes seules ; un dossier refusé ne compte pas (date morte).
- **Compteur live** : retirer un statut **libère** un slot. Le quota = nombre de statuts actifs à l'instant T (pas de comptage d'historique).
- **Conséquence assumée — plafond CONCURRENT, pas allocation annuelle.** Combiner « à venir actives » + « live » donne « jusqu'à N festivals à venir suivis **en même temps** », pas « N nouveaux par an ». Plus doux : on peut faire 30 festivals sur l'année tant qu'on n'a jamais plus de N à venir en file. Les planificateurs de début de saison tapent le mur (→ conversion) ; les suiveurs au fil de l'eau presque jamais. **Pas de fenêtre 12 mois glissants à calculer** : « à venir actif » suffit (l'idée initiale « par an / 12 mois » est dissoute par cette sémantique).
- **Plafond** : `FREE_DATES_QUOTA = 5` (curseur, facile à régler).
- **Périmètre** : **entité gratuite uniquement**. Personne (festivalier) = illimité (pas de plan Pro — le Pro vit sur l'entité). Entité Pro = illimité.

## Architecture logicielle

### 1. Fonctions pures — `src/lib/date-quota.ts`

```ts
import type { ParticipationWithEvent } from '@/types/database'
import type { ActorKind } from '@/lib/explorer'
import type { Plan } from '@/lib/navModel'

export const FREE_DATES_QUOTA = 5

/** Dates à venir actives : end_date >= now, hors statut 'refuse'. */
export function countActiveDates(participations: ParticipationWithEvent[], now: Date): number

/** Peut-on poser un statut de plus ? Pro et personne : toujours. Entité gratuite : sous le quota. */
export function canAddDate(plan: Plan, actorKind: ActorKind, used: number): boolean
// = plan === 'pro' || actorKind === 'person' || used < FREE_DATES_QUOTA
```

Pur, testé en TDD (`src/lib/date-quota.test.ts`).

### 2. Hook — `src/hooks/use-date-quota.ts`

```ts
export interface DateQuota {
  used: number
  limit: number          // FREE_DATES_QUOTA
  remaining: number       // max(0, limit - used)
  atLimit: boolean        // entité gratuite ET used >= limit
  canAdd: boolean         // canAddDate(...)
  isFreeEntity: boolean   // pilote l'affichage du compteur
}
export function useDateQuota(): DateQuota
```

Dérive de `useMyParticipations()` (déjà scopé sur l'acteur actif) + `planForActor(currentActor, currentActorRow)` + `actorKind`. Source unique de vérité consommée par les 3 surfaces. (Coût : une requête participations supplémentaire là où la page ne l'a pas déjà ; acceptable pour le V1. Explorer, qui a déjà `participations`, peut calculer via `countActiveDates`/`canAddDate` directement plutôt que de re-fetch.)

### 3. Enforcement aux 2 points d'ajout (les seuls)

`addParticipation` n'est appelé qu'à deux endroits :
- **`src/pages/Explorer.tsx`** → `toggleSave` (pose `interesse`).
- **`src/pages/EventPage.tsx`** → `handleJoin` (pose un statut choisi).

Dans chacun, **avant** d'ajouter : si `!canAdd` → on **ouvre `DateQuotaModal`** et on **n'ajoute pas**. Le bouton n'est **pas** désactivé (cliquer = pic d'intention → on explique au lieu de bloquer en silence). Le retrait d'un statut n'est jamais gaté.

- Explorer a déjà sa liste `participations` → calcule `used = countActiveDates(participations, now)` et la décision localement (pas de re-fetch).
- EventPage utilise `useDateQuota()` (il n'a pas la liste complète).

**Client-side pour le V1**, cohérent avec le gating plan existant (lu côté client, cf. switch admin Réel/Pro/Gratuit qui force le plan vu). **Non inviolable** — durcissement serveur (RLS/trigger comptant les dates à l'insert) = **follow-up** noté ; enjeu faible (contourner le gating client pour suivre +5 festivals est peu probable et peu grave), à blinder quand on solidifie la monétisation.

### 4. `DateQuotaModal` — `src/components/mes-dates/DateQuotaModal.tsx` (+ CSS si besoin)

Modale légère (pas plein écran comme `ProGate`) : cadenas + titre « Tu suis déjà 5 festivals à venir » + « C'est le maximum en gratuit. Passe Pro pour un nombre illimité — plus le Calendrier, la Communauté et ton Cockpit. » + CTA `Link → /reglages` « Passer en Pro — dès 9,99 € HT/mois » + bouton fermer. Langage DA réutilisé de `ProGate`/`ProTeaser` (cadenas `Lock`, tokens `--primary`, jour/nuit).

### 5. Compteur sur « Mes dates » — `src/pages/MesDates.tsx`

Entité gratuite uniquement (`isFreeEntity`) : pastille discrète dans `.md-head` (à la place de l'ancienne `.md-freepill` retirée) :
> **X / 5 dates à venir** · Pro = illimité  → `Link /reglages`

Formulation « dates à venir » (PAS « par an » — trompeur vu la sémantique concurrente). Invisible pour personne et entité Pro. Quand `atLimit`, accent visuel (couleur `--status-apayer`/primary) pour signaler le plafond atteint.

## Surfaces touchées (récap)

| Fichier | Changement |
|---|---|
| `src/lib/date-quota.ts` *(nouveau)* | `countActiveDates`, `canAddDate`, `FREE_DATES_QUOTA` |
| `src/lib/date-quota.test.ts` *(nouveau)* | TDD des deux fonctions |
| `src/hooks/use-date-quota.ts` *(nouveau)* | `useDateQuota()` |
| `src/components/mes-dates/DateQuotaModal.tsx` *(nouveau)* | modale d'upsell |
| `src/pages/Explorer.tsx` | guard dans `toggleSave` (calcul local) + rendu modale |
| `src/pages/EventPage.tsx` | guard dans `handleJoin` via `useDateQuota` + rendu modale |
| `src/pages/MesDates.tsx` | compteur quota (entité gratuite) |
| `src/pages/MesDates.css` | style du compteur (réutilise l'esprit de l'ancienne `.md-freepill`) |

**Réutilisé sans modif** : `useMyParticipations`, `planForActor`, `participationChip` (indirect), tokens DA.

## Tests & vérification

- **TDD** `date-quota.test.ts` :
  - `countActiveDates` : compte les à-venir actives ; exclut `end_date < now` ; exclut `status === 'refuse'` ; ignore `events` null ; liste vide → 0 ; événement en cours (start passé, end futur) compte.
  - `canAddDate` : `free & used<5` → true ; `free & used===5` → false ; `free & used>5` → false ; `pro` (quel que soit used) → true ; `person` (quel que soit used) → true.
- `pnpm build && pnpm lint && pnpm vitest run` vert.
- **Vérif manuelle** (switch admin) : entité gratuite à 4 dates → ajout OK, compteur 5/5 ; 6e tentative (Explorer + page Événement) → modale, pas d'ajout ; retirer une date → compteur repasse à 4/5, ajout de nouveau possible ; entité Pro & festivalier → aucun mur, aucun compteur ; jour **et** nuit.

## Risques & points d'attention

- **Concurrent vs annuel** : assumé (cf. §Sémantique). Si la conversion est trop faible, on resserrera `FREE_DATES_QUOTA` ou on basculera vers une allocation annuelle (slots consommés) — changement localisé dans `date-quota.ts` + le hook.
- **Contournement client** : V1 client-side, durcissement serveur en follow-up.
- **Double fetch participations** : `useDateQuota` re-fetch là où la page n'a pas la liste (EventPage). Acceptable V1 ; Explorer évite le re-fetch en calculant sur sa liste existante.
- **Cohérence switch admin** : le quota lit `planForActor(currentActor, currentActorRow)` → respecte automatiquement le plan forcé en debug (comme le reste du gating).
- **Curseur 5** : à régler selon les données réelles de conversion.
