# Dossiers refusés — design (#8)

- **Date :** 2026-06-04
- **Auteurs :** Uriel (CEO) · Claude (XO)
- **Statut :** `validé` (design approuvé, prêt pour le plan)
- **Source :** roadmap `docs/decisions/0003-roadmap-retours-cliente-1.md`, retour P1 #8 de la 1ʳᵉ cliente.

## Problème

Le statut `refuse` (dossier refusé) existe en prod et est posable via le stepper de
`EventDashboard` (page event). Mais les dossiers refusés sont **masqués partout** (Sidebar,
calendrier, communauté, quota, cockpit) → la cliente ne peut plus les revoir, ni noter
**pourquoi** un dossier a été refusé. Or c'est exactement le positionnement carnet de bord / CRM :
garder la trace des refus et de leur raison pour décider l'an prochain.

## Objectif

Permettre à un exposant de **revoir ses dossiers refusés** et de **noter la raison** du refus,
sans alourdir les surfaces existantes.

## Décisions de cadrage (validées)

| Sujet | Décision |
|-------|----------|
| Emplacement de la vue | **Section repliable dans le Cockpit**, fermée par défaut, masquée si vide |
| Capture de la raison | **À chaud (optionnelle) + éditable** : champ qui apparaît sous le stepper quand le dossier est « Refusé », ré-éditable ensuite |
| Périmètre de la section | **Voir + note éditable inline + lien vers l'event** (réouverture via le stepper existant, pas dupliquée) |

## Architecture

### 1. Donnée — `participations.refusal_note`

Nouvelle colonne **`refusal_note text`** (nullable) sur `participations`.

- 1:1 avec le dossier, déjà chargée avec les participations (pas de jointure), éditable en place.
- **Alternatives écartées :** réutiliser la table `notes` (mélange sémantique avec les notes
  perso d'event + jointure inutile) ; une table dédiée (surdimensionné pour un texte optionnel).
- Migration `supabase/migrations/<ts>_participation_refusal_note.sql`. Régénérer
  `src/types/supabase.ts` (ou cast ciblé si la régénération est lourde).
- **Pas de RLS nouvelle** : la colonne hérite des policies existantes de `participations`
  (le propriétaire de la participation lit/écrit la sienne).
- La note est **conservée** si le dossier quitte le statut `refuse` (re-toggle) — pas de perte
  d'historique ; elle ne s'affiche que pour les dossiers refusés.

### 2. Capture à chaud — `EventDashboard.tsx`

Quand `participation.status === 'refuse'`, afficher sous le stepper de participation un champ
**« Pourquoi ce refus ? (optionnel) »** (textarea courte). Sauvegarde sur blur via
`updateParticipation(participation.id, { refusal_note })`. C'est le **même** champ logique que
celui édité dans le Cockpit (une seule donnée `refusal_note`).

### 3. Section Cockpit — `DossiersRefuses`

Nouveau composant `src/components/cockpit/DossiersRefuses.tsx`, monté dans `Cockpit.tsx`.

- Liste les participations `status === 'refuse'` de l'acteur actif, via un sélecteur pur
  `selectRefusedDossiers(participations)` (filtre + tri par `end_date` décroissant).
- Chaque ligne : **nom + date + ville** du festival, **note éditable inline** (édite
  `refusal_note`, sauvegarde sur blur + refetch), **lien** vers `eventPath(event)` (`/e/slug`).
- **Repliable, fermée par défaut** ; titre avec compteur (« Dossiers refusés (3) »).
- **Masquée** si aucun dossier refusé.
- Données : réutilise `useMyParticipations` (déjà chargé dans le Cockpit). Vérifier que le
  `select` inclut `refusal_note` (probablement `select('*')` → automatique).

### 4. Logique pure (testable, TDD)

- `selectRefusedDossiers(parts: ParticipationWithEvent[]): ParticipationWithEvent[]` dans
  `src/lib/cockpit.ts` — filtre `status === 'refuse'`, tri `end_date` desc. Tests dans
  `cockpit.test.ts`.
- Le reste (champ note, édition inline, repli) = UI, vérifié au build + visuel.

## Tension assumée (#9)

On ajoute un module au Cockpit alors que le retour stratégique #9 (lisibilité) dit qu'on l'a
surchargé. Mitigations : **replié par défaut + masqué si vide**. À réinterroger lors du chantier
lisibilité #9.

## Vérification

- Tests unitaires verts (sélecteur), lint, build TS+Vite.
- Migration appliquée en prod **avec le GO d'Uriel** (push non-interactif) ; smoke-test
  lecture seule : colonne présente, 0 régression sur les participations existantes.

## Hors périmètre (YAGNI)

- Bouton « Rouvrir » inline (la réouverture passe par le stepper de la page event).
- Regroupement par saison/année.
- Note obligatoire au refus.
- Affichage des refusés sur d'autres surfaces (ils restent masqués ailleurs, par décision).

## Lié à

- `docs/decisions/0003-roadmap-retours-cliente-1.md` (#8)
- Cycle de vie participation (statut `refuse`) — `docs/superpowers/specs/2026-05-26-participation-lifecycle-refonte-design.md`
