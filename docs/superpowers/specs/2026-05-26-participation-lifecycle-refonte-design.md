# Refonte du cycle de vie de participation — Design

> **Statut :** validé (brainstorm 2026-05-26). Socle à implémenter **avant** le restyle DA du calendrier (`docs/superpowers/specs/2026-05-26-calendar-da-integration-design.md`, à venir), qui consommera ce vocabulaire.

## Contexte & problème

Le vocabulaire de statut de participation est aujourd'hui **incohérent et incomplet** :

- L'Explorer affiche « ★ Repéré » ; le dashboard d'événement dit « Intéressé » pour le même état (`interesse`).
- La pastille « Repéré » est **ambre** sur l'Explorer alors que le bouton d'action « Repérer » est **vert tilleul** (`--lime`).
- `participationChip` (source de vérité, `src/lib/explorer.ts`) affiche « ✓ Inscrit » pour un exposant `inscrit + a_payer`, masquant l'info « il reste à payer ».
- Le cycle réel (`interesse → en_cours → inscrit`, paiement `a_payer → en_cours_paiement → paye`) ne reflète pas le parcours métier d'un exposant : **dossier envoyé → accepté/refusé → paiement**.
- Aucun état pour un **dossier refusé** : la donnée se perd.

On unifie le vocabulaire et on aligne le cycle sur le **vrai parcours d'un exposant**, partagé partout (Explorer, page Événement, Calendrier).

## Le cycle de vie cible

### États visibles (acteur **exposant** / `kind === 'entity'`)

| Pastille | Données | Couleur (nuit) | Sens |
|---|---|---|---|
| ★ **Repéré** | `status = interesse` | tilleul `#a8cc7a` | repéré, pas candidaté (= couleur du bouton « Repérer ») |
| 📨 **Dossier envoyé** | `status = en_cours` | bleu `#86bce8` | candidature envoyée, en attente de réponse |
| ✦ **Accepté** | `status = confirme`/`inscrit` + paiement non renseigné (`payment_status` null) | émeraude `#5fd9a0` | dossier validé, paiement débloqué |
| € **À payer** | `status = confirme`/`inscrit` + `payment_status = a_payer` | ambre `#ffce85` | action requise : régler le stand |
| ✓ **Inscrit** | `status = confirme`/`inscrit` + `payment_status = paye` | forêt `#2ea36f` | payé — verrouillé |

> **Note (2026-05-26) :** pour un exposant, le stand est **toujours payant** — il n'y a donc pas de cas « gratuit ». Et il n'existe aucun champ de coût au niveau de l'**événement** (`booth_cost` vit sur `event_reports`, le bilan post-événement). Le cycle est donc piloté uniquement par `payment_status` de la participation.
| ✕ **Refusé** | `status = refuse` | terracotta `#e8897a` | candidature refusée — atténué + bouton « retirer » |
| ✓ **Terminé** | `end_date < aujourd'hui` (override) | gris sépia | date passée — neutre, carte atténuée |

**Progression chromatique voulue :** le vert *mûrit* avec l'engagement (tilleul → émeraude → forêt) ; le bleu = attente ; l'ambre = unique alerte « action » ; terracotta = négatif ; gris = archivé.

### États visibles (acteur **personne** / `kind === 'person'`)

Pas de dossier ni de paiement. Deux états seulement :

| Pastille | Données | Couleur | 
|---|---|---|
| ★ **Repéré** | `status = interesse` | tilleul `#a8cc7a` |
| ✓ **J'y vais** | `status = inscrit`/`confirme` | forêt `#2ea36f` |

Override **Terminé** identique (date passée).

### Règles de dérivation

- **« Accepté »** correspond au passage à `confirme` : c'est ce qui **débloque le bloc Paiement** dans le dashboard.
- **« Inscrit »** n'est plus un statut qu'on pose à la main : c'est le **libellé dérivé** de « Accepté + Payé » (ou « Accepté + gratuit »).
- **`en_cours_paiement` est supprimé** : le paiement n'a que deux états, `a_payer` et `paye`.
- **« Terminé »** est un **override de présentation** appliqué quand la date de fin est passée — quel que soit le statut — et atténue la carte.

## Décision de données (migration)

Objectif : **zéro migration destructive de `status`**. On reste compatible avec les lignes existantes.

1. **Enum `participation_status`** (`interesse | inscrit | confirme | en_cours`) → **ajouter `refuse`** :
   ```sql
   ALTER TYPE participation_status ADD VALUE IF NOT EXISTS 'refuse';
   ```
   (Postgres : `ADD VALUE` ne peut pas tourner dans un bloc transactionnel partagé avec son usage — migration dédiée, voir plan.)

2. **`inscrit` reste le statut « accepté »** (le dashboard pose `inscrit`, comme avant). La distinction Accepté / À payer / Inscrit est **dérivée du `payment_status`** : `inscrit` + paiement non renseigné → Accepté ; `+ a_payer` → À payer ; `+ paye` → Inscrit. **Raison décisive :** la visibilité publique (politique RLS « inscrit is public » + requêtes profil public / embed / participants filtrant `status = 'inscrit'`) est keyée sur `inscrit`. Repurposer vers `confirme` rendrait les exposants acceptés **invisibles** publiquement (régression). On ne touche donc pas à cette mécanique.

3. **`confirme` n'est pas utilisé** : valeur enum laissée inerte. `participationChip` la traite défensivement comme `inscrit` (branche « accepté »), mais aucun chemin de l'app ne la pose. **Aucune migration de lignes** : les `inscrit` existants s'affichent correctement.

4. **Paiement** : migrer les valeurs obsolètes
   ```sql
   UPDATE participations SET payment_status = 'a_payer' WHERE payment_status = 'en_cours_paiement';
   ```
   (`en_cours_paiement` = pas encore réglé → retombe sur `a_payer`.)

5. **Régénérer les types** Supabase (`participation_status` gagne `refuse`).

> Note : `payment_status` (sur `participations`) existe déjà — aucune création de colonne. (`booth_cost` est sur `event_reports`, pas sur `events` : non utilisé ici.)

## Architecture logicielle

### `participationChip` — source de vérité unique (réécriture)

`src/lib/explorer.ts`. Signature étendue avec un contexte optionnel :

```ts
export type StatusVariant =
  | 'repere' | 'dossier' | 'accepte' | 'apayer' | 'inscrit'
  | 'refuse' | 'termine' | 'going'

export interface StatusChip { label: string; variant: StatusVariant }

export interface ChipContext {
  isPast?: boolean           // end_date < now — override « Terminé »
}

export function participationChip(
  status: string | null | undefined,
  payment: string | null | undefined,
  kind: ActorKind,
  ctx?: ChipContext,
): StatusChip | null
```

Logique :
1. Si `!status` → `null`.
2. Si `ctx?.isPast` → `{ '✓ Terminé', 'termine' }` (override, prioritaire).
3. `status === 'interesse'` → `{ '★ Repéré', 'repere' }`.
4. `status === 'refuse'` → `{ '✕ Refusé', 'refuse' }`.
5. **Personne** (`kind === 'person'`) → `{ "✓ J'y vais", 'going' }`.
6. **Exposant**, branche « en cours » : `status === 'en_cours'` → `{ '📨 Dossier envoyé', 'dossier' }`.
7. **Exposant**, branche « accepté » (`status === 'confirme'` **ou** `'inscrit'`) :
   - `payment === 'paye'` → `{ '✓ Inscrit', 'inscrit' }`.
   - `payment === 'a_payer'` → `{ '€ À payer', 'apayer' }`.
   - sinon (paiement non renseigné) → `{ '✦ Accepté', 'accepte' }`.

C'est une **fonction pure**, entièrement testable (étendre `src/lib/explorer.test.ts`).

### Couleurs partagées (dual-thème)

Définir les 7 teintes comme **variables CSS** dans `src/index.css` (nuit `:root` + jour `.light`), pour une **source unique** consommée par toutes les surfaces :

```css
:root {
  --status-repere:  #a8cc7a;  /* tilleul */
  --status-dossier: #86bce8;  /* bleu */
  --status-accepte: #5fd9a0;  /* émeraude */
  --status-apayer:  #ffce85;  /* ambre */
  --status-inscrit: #2ea36f;  /* forêt */
  --status-refuse:  #e8897a;  /* terracotta */
  --status-termine: var(--muted-foreground);
}
.light { /* variantes jour assombries pour contraste sur fond clair — valeurs dans le plan */ }
```

Les pastilles existantes (`.explorer .card-status.*`, `.explorer .eh-status.*`) sont recâblées sur ces variables. Les pastilles du calendrier (spec #2) les réutiliseront. **On ne fusionne pas** les traitements visuels (aplat sur carte Explorer vs translucide ailleurs) — seules les **teintes** sont mutualisées.

### Dashboard exposant (`EventDashboard.tsx` + `EventDashboardMobile.tsx`)

- `PARTICIPATION_STEPS` : `Repéré` (interesse — **renomme l'actuel « Intéressé »**) → `Dossier envoyé` (en_cours) → `Accepté` (**confirme**, plus `inscrit`).
- Ajouter une action **« Refusé »** (pose `status = refuse`).
- **Refusé vs Retirer** — deux actions distinctes :
  - **Refusé** conserve la participation : le statut reste, l'événement est **grisé** (sur le calendrier comme ailleurs). Garde l'historique du refus.
  - **« Retirer »** = le chemin de **désinscription existant** (`onLeave` / « Se désinscrire ») : supprime la participation **et tout statut**, l'événement disparaît. Aucun nouveau code — on réutilise `onLeave`.
  - Refusé reste grisé tant que l'utilisateur ne clique pas « retirer ».
- Le bloc **Paiement** se débloque sur `confirme` (au lieu de `inscrit`) — le stand est toujours payant pour un exposant.
- `PAYMENT_STEPS` : 2 états — `À payer` (a_payer), `Payé` (paye). **Supprimer** `en_cours_paiement`.
- Le badge replié mobile (`EventDashboardMobile`) affiche le libellé dérivé via `participationChip` (plus de `STATUS_LABELS`/`PAYMENT_LABELS` maison divergents).
- `INFO_MESSAGES` : ajuster les libellés (Accepté / Refusé).

### Page Événement (`EventHero.tsx`)

- Recâbler l'affichage de statut/paiement sur `participationChip` + couleurs partagées.
- Supprimer la branche `en_cours_paiement`.

## Surfaces touchées (récap)

| Fichier | Changement |
|---|---|
| `supabase/migrations/<ts>_participation_lifecycle.sql` | `ADD VALUE 'refuse'` + migration paiement |
| `src/types/supabase.ts` / `database.ts` | régénération types (enum `refuse`) |
| `src/lib/explorer.ts` | `participationChip` réécrit (signature + logique) |
| `src/lib/explorer.test.ts` | tests étendus (tous les cas du tableau) |
| `src/index.css` | variables `--status-*` (nuit + jour) |
| `src/pages/Explorer.css` | `.card-status.*` / `.eh-status.*` recâblés + nouvelles variantes |
| `src/components/events/EventDashboard.tsx` | steppers, Accepté/Refusé/retirer, paiement 2 états |
| `src/components/events/EventDashboardMobile.tsx` | badges via `participationChip`, suppr. `en_cours_paiement` |
| `src/components/events/EventHero.tsx` | statut/paiement via chip partagé, suppr. `en_cours_paiement` |

**Hors périmètre (spec #2)** : pastilles & CSS du **calendrier** (`CalendarMonth.tsx`, `Calendar.css`, `MonthBanner`), section « Tes compagnons ce mois-ci », restyle DA complet de la page.

## Tests & vérification

- **TDD** sur `participationChip` : un cas par ligne du tableau (exposant : repéré, dossier envoyé, accepté, à payer, inscrit-payé, inscrit-gratuit, refusé, terminé ; personne : repéré, j'y vais, terminé ; legacy `inscrit`).
- `pnpm build && pnpm lint && pnpm vitest run` vert.
- Vérification visuelle : pastilles Explorer & page Événement en nuit **et** jour (contraste), couleurs conformes au ruban validé.
- Migration : appliquée en local, types régénérés, `grep` confirme **zéro** `en_cours_paiement` restant dans `src/`.

## Risques & points d'attention

- **`ADD VALUE` Postgres** : doit être dans sa propre migration (pas dans la même transaction que des `UPDATE` qui l'utilisent). Voir [[reference_supabase_migration_repair]] si la re-poussée est nécessaire.
- **Types Supabase** : précédent du projet — caster `supabase.rpc as any` si besoin, ou régénérer ([[reference_supabase_rpc_types]]).
- **Lignes `inscrit` legacy** : couvertes par la logique (alias de `confirme`), pas de migration — vérifier qu'aucun code ne pose plus `inscrit` pour un exposant.
- **Audit tokens CSS** : on ajoute des variables, on ne change pas le format des tokens existants ([[feedback_css_token_audit]]).
```
