# Lot 8b — Les éditions d'un festival — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** relier les éditions d'un festival, prévenir les Pro d'une nouvelle édition, afficher le bilan de l'an passé sur la fiche.

**Architecture:** une colonne `previous_edition_id` et un déclencheur sur insertion ; la phrase et l'action dans `lib/notifications.ts` ; le choix de l'édition dans la création ; une carte sur la fiche.

**Tech Stack:** Postgres (Supabase), React 19, supabase-js 2, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-lot-8b-editions-v2-design.md`.

## Global Constraints

- Migrations par le canal unique, dry-run d'abord ; la base est la production ; aucun test qui écrit.
- Le déclencheur ne réagit qu'à l'INSERT (le rattrapage ne prévient personne).
- Pro = `plan = 'pro'` ou `comped_pro_until > now()` (même règle que `lib/plan.ts`).
- Rien n'est relié par le rattrapage sans la validation d'Uriel.

## Review Focus

1. **Le créateur de la nouvelle édition était inscrit à la précédente** : il ne se prévient pas (ni sous une autre casquette : garde `memberships`, comme le 8a).
2. **Une enseigne gratuite inscrite l'an passé** : aucune alerte.
3. **« Repérer » depuis la cloche alors qu'une autre enseigne est active** : la participation va à l'enseigne destinataire.
4. **Édition précédente sans bilan rempli** (place seule) : pas de carte.
5. **Une notification `new_edition` sans dates** : n'est pas affichée (`null`).

---

### Task 1 : migrations
`20261009170000_events_previous_edition.sql` (colonne + index), `20261009170100_notification_type_new_edition.sql`, `20261009170200_notify_new_edition.sql` (déclencheur AFTER INSERT, `WHEN (NEW.previous_edition_id IS NOT NULL)`, destinataires : participations `inscrit`/`confirme` de l'édition précédente, enseignes Pro, hors créateur et hors enseignes du créateur). Dry-run, push, types régénérés, commit.

### Task 2 : `new_edition` dans `lib/notifications.ts`
Tests d'abord : phrase « **{event_name}** revient du {dates}. Tu y étais en {previous_year}. », surtitre « Nouvelle édition », `action: { kind: 'mark', eventId }` ; dates manquantes → `null` ; `KNOWN_TYPES` l'inclut. La vue gagne `eyebrow?: string` et `action?: { kind: 'mark'; eventId: string }`, et la ligne lue gagne `actor_id`.

### Task 3 : « Repérer » dans la cloche
`useNotifications` lit `actor_id` ; `NotificationPanel` affiche le bouton d'action ; `markInterested(view)` : upsert `participations` `{ actor_id: view.ownerId, event_id, status: 'interesse' }` (`onConflict: 'actor_id,event_id'`, `ignoreDuplicates`), état « Repérée ».

### Task 4 : la création relie l'édition
Fonction pure testée `isPastEdition(similar, today)` ; `DuplicateWarning` reçoit `previousEditionId` et `onPick` ; le brouillon porte `previousEditionId` ; l'insertion envoie `previous_edition_id`.

### Task 5 : la carte sur la fiche
`useLastEditionReport(event, actorId)` : si `previous_edition_id`, charge l'édition précédente (nom, dates), ses lignes de registre (`source`, montants), son `event_reports` (étiquettes) et l'objectif ; rend `null` si `!isFilled`. `LastEditionReport` d'après `2177:2`, voilée en gratuit. Posée sous `EventStatus`.

### Task 6 : rattrapage (lecture), relecture, déploiement
Liste des paires candidates en lecture seule, présentée à Uriel ; relecture finale ; déploiement V2 ; coche.
