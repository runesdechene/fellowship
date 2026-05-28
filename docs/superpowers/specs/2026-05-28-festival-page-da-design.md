# Spec — Page Festival (DA « Nuit de Festival »)

**Date :** 2026-05-28
**Branche :** `feat/da-nuit-festival-socle`
**Statut :** validé (design), à relire avant plan d'implémentation
**Jalon :** 13ᵉ et dernière page de l'intégration DA « Nuit de Festival ».

---

## 1. Contexte & intention

`EventPage.tsx` (route `/event/:id`) est la dernière page qui n'a pas reçu la DA
« Nuit de Festival ». La maquette gelée (`.superpowers/brainstorm/1220-1779655239/content/festival-exposant.html`)
décrit une **page cible** ambitieuse qui empile plusieurs sous-systèmes. Cette spec ne
livre **que la page DA livrable** : le restyle complet + une petite migration de champs
descriptifs. Les sous-systèmes lourds sont volontairement **hors périmètre** et affichés
en placeholders à leur place dans la page (voir §7).

**Objectif :** fermer le jalon « 13 pages DA » sans s'attacher une refonte data
(éditions récurrentes, discussion persistante, corrections communautaires) sur le chemin
critique.

### Ce qui existe déjà (à restyler, pas à recréer)
- Lifecycle participation complet : `EventDashboard.tsx` (statuts `interesse` / `en_cours` /
  `inscrit` / `refuse` + stepper paiement). Labels actuels : **Repéré / Dossier envoyé / Accepté**.
- Avis multi-critères : `reviews` avec `avg_affluence`, `avg_organisation`, `avg_rentabilite`,
  et gating Pro via `canSeeDetails` (`useEventReviews`).
- Amis présents : `useFriendsOnEvent`.
- Organisateur : `useEventCreator`.
- Liens : `contact_email`, `registration_url`, `external_url`, `registration_note`, `registration_deadline`.
- Quota dates gratuit : `useDateQuota` + `DateQuotaModal` (déjà câblé sur `handleJoin`).

### Décisions de cadrage (validées)
- **Périmètre** = DA complet + petite migration champs ; les 4 gros blocs 🔴 = placeholders.
- **Type/catégorie** (eyebrow) = **1er tag de l'event**, aucune colonne dédiée.
- **« Comment candidater »** = **version lite maintenant**, câblée sur la data existante.
- **N° d'édition** = champ simple optionnel, cosmétique, sans logique de récurrence.

---

## 2. Architecture & fichiers

Refonte **in-place** — pas de nouvelle route, mêmes classes `event-*` re-stylées DA jour/nuit.

| Fichier | Action |
|---|---|
| `src/pages/EventPage.tsx` | Restructuration du rendu (hero, ambient, colonnes) ; câblage des nouveaux sous-composants. |
| `src/pages/EventPage.css` | Réécriture DA (tokens `--foreground/--card/--muted/--border/--copper/--amber/--green`, override `.light`). |
| `src/components/events/FestivalCockpit.tsx` | **Nouveau.** Colonne droite sticky : J-X, deadline, stepper, rows (Emplacement / Candidature / Carte), CTA. Wrappe `EventDashboard` restylé. |
| `src/components/events/FestivalFacts.tsx` | **Nouveau.** Grille « Infos pratiques », cellules conditionnelles. |
| `src/components/events/HowToApplyModal.tsx` | **Nouveau.** Modale « Comment candidater » lite. |
| `src/components/events/DiscussionTeaser.tsx` | **Nouveau.** Carte placeholder « bientôt » (visuel 2 onglets non-interactif via `ComingSoon`). |
| `src/components/events/EventDashboard.tsx` | Restyle visuel du stepper (labels inchangés). |
| `supabase/migrations/2026XXXX_festival_fields.sql` | **Nouveau.** 5 colonnes optionnelles. |
| `src/types/supabase.ts`, `src/types/database.ts` | Régénérer / étendre `Event` avec les 5 champs. |

**Découpage en unités** (chaque composant testable/lisible isolément) :
- `FestivalCockpit` : reçoit `event`, `participation`, callbacks ; ne connaît pas le fetch.
- `FestivalFacts` : pur présentationnel, reçoit l'`event`, n'affiche que les cellules remplies.
- `HowToApplyModal` : reçoit `event` + `onMarkApplied`, gère copie/lien/mailto.
- `DiscussionTeaser` : purement statique.

---

## 3. Migration — `events` (5 colonnes, toutes nullable, freeform)

```sql
alter table public.events
  add column edition integer,                 -- n° d'édition, ex. 21 → "21ᵉ édition"
  add column opening_hours text,              -- ex. "10h – 19h"
  add column expected_attendance text,        -- ex. "~40 000 visiteurs" (freeform, pas un nombre)
  add column stand_size text,                 -- ex. "3×3 m"
  add column stand_price text;                -- ex. "120 € le week-end"
```

- Toutes optionnelles : affichées **uniquement si remplies**.
- **Pas** de colonne catégorie : l'eyebrow utilise `event.tags?.[0]`.
- RLS : aucune nouvelle policy (colonnes sur table existante, héritent des policies `events`).
- Le formulaire d'édition exposant (`EventPage` mode `editing`) reçoit ces 5 champs (inputs
  texte, `edition` en `number`), section « Infos pratiques » du formulaire.

---

## 4. Inventaire des sections

### 4.1 Hero (haut de la colonne main)
- **Ambient** : `event.image_url` floutée en fond de la zone haute (`.stage-amb` : `blur(60px) brightness(.4)`, dégradé vers `--background`). Si pas d'image → pas d'ambient (fond DA nu).
- **statpill** (état candidatures) — dérivé, voir §5.
- **eyebrow** : `event.tags?.[0]` + (si `edition`) « · {edition}ᵉ édition ». Masqué si ni tag ni édition.
- **titre** : `event.name`.
- **hmeta** : dates (`start_date`–`end_date`), lieu (`city` (`department`)) **sans distance**, 1er tag.
- **hactions** : ★ Repéré (état participation), bouton Partager, bouton Site web (si `external_url`),
  bloc « Organisé par {organisateur} » (lien vers la vitrine).

### 4.2 Bande « Tes compagnons sur cette date »
- `useFriendsOnEvent` : avatars empilés + « N utilisateurs de Fellowship y vont » + noms d'abonnés.
- Rally : « Vous serez N exposants réunis à {ville} » + bouton **Partager** (groupes = V1.5,
  pas de création de groupe). Masquée si 0 compagnon.

### 4.3 À propos
- `event.description` (HTML sanitizé via `DOMPurify`, comme aujourd'hui).

### 4.4 Infos pratiques (`FestivalFacts`)
Grille 2 colonnes, **cellules conditionnelles** (n'affiche que les remplies) :
| Cellule | Source |
|---|---|
| Dates | `start_date` / `end_date` |
| Horaires | `opening_hours` |
| Lieu | `city` (`department`) — **sans distance** |
| Affluence attendue | `expected_attendance` |
| Candidatures jusqu'au | `registration_deadline` |
| Emplacement | `stand_size` + `stand_price` |

Si aucune cellule optionnelle remplie → la carte ne montre que Dates + Lieu (toujours présents).

### 4.5 Discussion du festival → **placeholder** (§7)

### 4.6 Avis des exposants
- Restyle de `ReviewSummary` : note globale + 3 métriques (Affluence / Organisation / Rentabilité).
- **Lock Pro** : si `!canSeeDetails`, bloc cadenas « Passe en Exposant Pro… » (réutilise
  `ProTeaser`/`ProGate`). Comportement gating inchangé.
- Masquée si 0 avis **et** `!canSeeDetails`.

### 4.7 Cockpit (colonne droite sticky — `FestivalCockpit`)
- **Affiche** (poster) en haut de la colonne droite.
- **ckhead** : J-X (jours avant `start_date`) + deadline candidatures (si `registration_deadline`).
- **Stepper participation** : restyle visuel de `EventDashboard`. Labels **inchangés**
  (Repéré / Dossier envoyé / Accepté + refus + stepper paiement). Le quota gratuit
  (`useDateQuota` → `DateQuotaModal`) reste branché sur l'ajout d'une nouvelle date.
- **Rows** :
  - Emplacement → `stand_price` (si présent).
  - Candidature → ouvre la modale « Comment candidater » (si data dispo, sinon masqué).
  - Carte → lien « Voir sur la carte » (§5).
- **CTA** : Candidater (ouvre la modale) ; secondaires neutralisés/masqués selon dispo
  (« Poser une question » → masqué, fait partie du bloc Discussion placeholder).

### 4.8 Modale « Comment candidater » lite (`HowToApplyModal`)
Câblée **uniquement** sur la data existante :
- Email (`contact_email`) → bouton Copier + `mailto:`.
- Lien inscription (`registration_url`) → bouton Ouvrir.
- Note d'inscription (`registration_note`) → texte.
- Footer : « Tu as envoyé ta candidature ? » + **« ✓ Marquer comme candidaté »**
  → passe la participation en `en_cours` (réutilise `handleJoin`/`onUpdate`).
- **Pas** de téléphone, contact nominatif, ni « suggérer une correction » (→ spec dédiée 🔴).
- Si aucune des 3 sources n'est renseignée → la modale et la row/CTA Candidature ne s'affichent pas.

---

## 5. Comportements dérivés (zéro nouvelle data)

- **statpill / état candidatures** :
  - `registration_deadline` dans le futur → « Candidatures ouvertes » (vert `--green`).
  - `registration_deadline` passée → « Candidatures clôturées » (neutre).
  - pas de deadline → masquée (on n'invente pas un état).
  - event passé (`end_date` < now) → masquée (la page bascule en mode rétro : avis mis en avant).
- **Itinéraire / carte** : l'event n'a **pas** de lat/long. On **abandonne** la distance
  (« à 38 km ») et l'estimation de coût. Remplacé par un lien **« Voir sur la carte »** =
  `https://www.google.com/maps/search/?api=1&query=` + `encodeURIComponent("{name} {city} {department}")`.
- **Partager** : `navigator.share({ url })` si dispo, sinon `navigator.clipboard.writeText(url)`
  + toast « Lien copié ». Utilisé par l'icône hero et le bouton rally.
- **J-X** : `Math.ceil((start_date - now)/jour)` ; si passé → on n'affiche pas le compteur.

---

## 6. États & cas limites

- **Chargement** : spinner (comportement actuel conservé).
- **Event introuvable** : message + lien retour (conservé).
- **Pas d'affiche** : pas d'ambient flou, placeholder poster (icône) dans la colonne droite.
- **Event passé** : statpill masquée, J-X masqué, deadline masquée ; les Avis remontent
  visuellement (mode mémoire). Le bouton « Donner mon avis » (existant, `isPast`) reste.
- **Visiteur non-exposant / non connecté** : pas de stepper d'édition d'event ; cockpit en
  lecture ; CTA participation selon règles `EventDashboard` actuelles.
- **Exposant propriétaire** (`isExposant`) : bouton Modifier (formulaire avec les 5 champs neufs).
- **0 compagnon** : bande « Tes compagnons » masquée.
- **Aucune info pratique optionnelle** : grille réduite à Dates + Lieu.

---

## 7. Hors périmètre — placeholders (specs dédiées ultérieures)

| Sous-système | Traitement dans cette page |
|---|---|
| **Discussion du festival** (Questions inter-éditions + Rencontres covoit/RDV) | Carte `DiscussionTeaser` : visuel 2 onglets **non-interactif** (`inert`), libellé « La mémoire du festival arrive bientôt ». |
| **Contacts structurés + corrections communautaires** (tél, personne, « suggérer une correction ») | Non affiché. La modale lite couvre email/lien/note seulement. |
| **Distance / itinéraire réel** (géoloc, coût trajet) | Remplacé par lien « Voir sur la carte ». |
| **Éditions récurrentes** (festival = série annuelle, persistance Q&R) | Seul le champ `edition` cosmétique existe ; aucune logique de récurrence. |
| **Groupes** | Rally = bouton « Partager », pas de création de groupe (V1.5). |

Chacun fera l'objet de sa propre spec → plan → implémentation.

---

## 8. Jour/nuit, mobile, a11y

- **Tokens DA** : utiliser les variables CSS (`--foreground`, `--card`, `--muted-foreground`,
  `--border`, `--copper`, `--amber`, `--green`) et l'override `.light`. **Checklist DA** :
  `svg { fill: none }`, **aucun `#fff` en dur**, ombres douces en `.light`, boutons colorés en
  jour = `box-shadow` douce (cf. mémoire `feedback_light_button_shadow`).
- **Mobile** (`max-width: 1080px`) : sidebar gérée par le shell ; `grid` → 1 colonne ;
  colonne droite `order: -1` (affiche + cockpit au-dessus) ; cockpit `position: static` ;
  affiche réduite (`max-width`).
- **a11y** : blocs placeholder floutés en `inert` (sortis du tab order) ; libellés `title`/`aria`
  sur les boutons icône ; contraste vérifié jour **et** nuit.

---

## 9. Tests (TDD — fonctions pures d'abord)

Suivre `reference_react_test_infra` (RTL ne flush pas en sync sur cette stack → tester les
fonctions pures, pas le rendu).

- `festival.ts` (nouveau) — fonctions pures :
  - `candidatureState(event, now)` → `'open' | 'closed' | null`.
  - `mapsSearchUrl(event)` → URL Google Maps encodée.
  - `daysUntil(date, now)` → nombre | null (passé).
  - `hasPracticalInfo(event)` → bool (au moins une cellule optionnelle).
  - `hasApplyInfo(event)` → bool (email/url/note présents).
- Tests des labels eyebrow (`tag + édition`) et des cellules conditionnelles `FestivalFacts`
  via fonctions de sélection pures.

---

## 10. Vérification avant « fait »

- `pnpm build` (tsc + vite) vert.
- `pnpm lint` vert (attention pièges `react-hooks`, cf. `project_react_hooks_lint_gotchas`).
- Vérif visuelle **jour ET nuit** (checklist `reference_da_daynight_gotchas`).
- Vérif mobile (cockpit static, ordre des colonnes).
- code-review + (si besoin) security-review avant merge — `main` = prod, branche non mergée.
