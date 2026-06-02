# Plan 4 — Retrait des colonnes legacy (phase *contract* du modèle acteur)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans pour exécuter ce plan phase par phase, avec un checkpoint de revue humaine OBLIGATOIRE avant chaque migration destructive (DROP). Steps en `- [ ]`.

**Goal:** Terminer la migration expand/contract du modèle acteur en retirant les colonnes/table legacy (`events.created_by`, `*.user_id`, `follows.follower_id/following_id`, table `profiles`), une fois tous les triggers, policies RLS et lectures applicatives rebranchés sur le modèle acteur.

**Architecture:** Migration expand/contract. L'*expand* (colonnes `*_actor` ajoutées + backfillées) et le recâblage des **writers** applicatifs sont faits. Reste le **contract** : rebrancher les **triggers DB**, les **policies RLS** et les dernières **lectures applicatives** sur les colonnes acteur, PUIS dropper le legacy. Chaque phase est livrable et testable seule, et laisse l'app fonctionnelle.

**Tech Stack:** Supabase (Postgres + RLS + triggers plpgsql), React/TS frontend, migrations SQL versionnées dans `supabase/migrations/`.

**⚠️ Contexte prod :** `main = prod`. Chaque DROP est irréversible. Backup/point-in-time AVANT toute phase destructive. CLI Supabase sur Windows : chemin binaire direct (cf. `reference_supabase_cli`). En cas de divergence de migration : procédure `migration repair` (cf. `reference_supabase_db_diverge_recovery`).

---

## État des lieux (audit du 2026-06-02)

Carte des dépendances legacy restantes (lecteurs app / triggers / RLS / FK) :

| Cible legacy | Lecteurs APP | Triggers DB | RLS (sécurité) | FK | Drop direct ? |
|---|---|---|---|---|---|
| `events.created_by` | 0 (corrigé v0.7.198) | `notify_event_created` lit `NEW.created_by` + résout via `profiles` | aucune (l'ancienne `events_update_creator` a été DROP en `…120001`) | → profiles | ❌ trigger + FK |
| `notifications.user_id` | **2** (`use-notifications` feed) | **6 triggers** y INSERT | `notifications_owner_only` (`user_id = auth.uid()`) | → profiles | ❌ tout |
| `participations.user_id` | 0 | triggers de notif lisent `NEW.user_id` | 3 policies `user_id`/`are_friends` | → profiles | ❌ RLS + triggers |
| `notes.user_id` | 0 | `notify_friend_note` lit `NEW.user_id` | policies `user_id` | → profiles | ❌ RLS + trigger |
| `reviews.user_id` | 0 | — | policies `user_id` | → profiles | ❌ RLS |
| `event_reports.user_id` | 0 | — | policy `user_id` (ALL) | → profiles | ❌ RLS |
| `follows.follower_id` / `following_id` | 0 | triggers lisent `NEW.follower_id` | policies select/insert/delete `follower_id`/`following_id` | → profiles | ❌ RLS + triggers |
| TABLE `profiles` | **5** (`auth.tsx`, `SearchBar`, `use-admin` ×2, `AdminUsers` write) | `handle_new_user` INSERT à l'inscription ; `notify_new_exposant` ON profiles ; triggers lisent `profiles` | `events_insert/update_exposant`, admin role checks, tags policies | 9 FK | ❌ tout |

**Conclusion :** aucune colonne n'est un drop gratuit. Ordre imposé par les dépendances : **notifications/triggers d'abord** (ils écrivent le legacy), **RLS ensuite**, **profiles en dernier**.

---

## Phase 0 — Filet de sécurité (OBLIGATOIRE avant toute phase destructive)

- [ ] **Step 1 : Backup / point-in-time recovery**

Vérifier que le projet Supabase a le PITR actif (ou faire un dump logique). Sans ça, aucun DROP.
Run (dump logique de secours) :
```
supabase db dump --db-url "$env:SUPABASE_DB_URL" -f backup-pre-plan4-2026-06-02.sql
```
Expected : fichier SQL non vide.

- [ ] **Step 2 : Confirmer l'absence de divergence migrations**

Run :
```
supabase migration list
```
Expected : local et remote alignés. Sinon → `reference_supabase_db_diverge_recovery` avant de continuer.

---

## Phase 1 — `events.created_by` (slice tied to today's bug)

**Files:**
- Create: `supabase/migrations/20260602120000_drop_events_created_by.sql`
- Référence (à réécrire dans la migration) : trigger `notify_event_created()` défini en `supabase/migrations/20260406110000_add_avatar_to_notifications.sql:78-110`

**Bloqueurs précis :** (1) `notify_event_created()` lit `NEW.created_by` et résout `creator_name/avatar` via `profiles` ; (2) FK `events.created_by → profiles`. Aucune RLS ne bloque (l'ancienne policy a été supprimée).

- [ ] **Step 1 : Écrire la migration — réécrire le trigger sur le modèle acteur, puis dropper la colonne**

`supabase/migrations/20260602120000_drop_events_created_by.sql` :
```sql
-- Plan 4 / Phase 1 : retrait de events.created_by (legacy → profiles).
-- Le seul writer/reader restant est notify_event_created() ; on le rebranche sur
-- created_by_actor + actor_public, puis on drop la colonne (la FK part avec).

CREATE OR REPLACE FUNCTION notify_event_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_name text;
  creator_avatar text;
  user_record RECORD;
BEGIN
  SELECT COALESCE(label, 'Quelqu''un'), avatar_url
    INTO creator_name, creator_avatar
    FROM actor_public WHERE actor_id = NEW.created_by_actor;

  -- Broadcast inchangé : tous les destinataires sauf le créateur.
  -- On notifie au niveau acteur (actor_id), comme les triggers déjà migrés.
  FOR user_record IN
    SELECT actor_id FROM actor_public WHERE actor_id <> NEW.created_by_actor
  LOOP
    INSERT INTO notifications (user_id, actor_id, type, data)
    VALUES (
      user_record.actor_id,
      user_record.actor_id,
      'event_created',
      jsonb_build_object(
        'actor_id', NEW.created_by_actor,
        'actor_name', creator_name,
        'actor_avatar_url', creator_avatar,
        'event_id', NEW.id,
        'event_name', NEW.name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

ALTER TABLE events DROP COLUMN created_by;
```
> NB : `notifications.user_id` reste rempli ici (NOT NULL pas encore garanti côté actor) — cohérent avec Phase 2 qui migrera le feed. On écrit les DEUX (`user_id` + `actor_id`) pour ne rien casser.

- [ ] **Step 2 : Appliquer la migration**

Run :
```
supabase db push
```
Expected : `20260602120000_drop_events_created_by` appliquée sans erreur. (Si skippée → `reference_supabase_migration_repair`.)

- [ ] **Step 3 : Régénérer les types**

Run :
```
supabase gen types typescript --linked > src/types/supabase.ts
```
Expected : `events.created_by` disparaît du type `events.Row` ; `events_created_by_fkey` disparaît.

- [ ] **Step 4 : Vérifier le build + nettoyer la dernière référence de type**

`src/lib/festival.test.ts:11` contient un littéral `created_by: null` → le retirer.
Run :
```
pnpm build
```
Expected : tsc PASS (plus aucune référence à `events.created_by`).

- [ ] **Step 5 : Test fumée — créer un événement + vérifier la notif**

Créer un événement de test depuis l'app, vérifier qu'il s'enregistre ET qu'une notification `event_created` apparaît pour un autre compte. Confirme que le trigger réécrit marche.

- [ ] **Step 6 : Commit + bump + push**

```
git add supabase/migrations/20260602120000_drop_events_created_by.sql src/types/supabase.ts src/lib/festival.test.ts package.json
git commit -m "refactor(db): drop events.created_by legacy, notify via actor (Plan 4 ph.1)"
git push
```

---

## Phase 2 — Sous-système notifications (`notifications.user_id`)

**Pourquoi en 2e :** c'est le plus enchevêtré (6 triggers writers + feed app + RLS) et il débloque tout le reste.

**Files (à détailler en sous-plan avant exécution) :**
- Modify (DB) : les 6 triggers de `20260406110000_add_avatar_to_notifications.sql` + `20260406120001` + `20260407100000` → écrire `actor_id` (en plus de `user_id` pendant la transition).
- Modify (RLS) : `notifications_owner_only` → `can_act_as(actor_id)`.
- Modify (app) : `src/hooks/use-notifications.ts:34,58` → filtrer sur `actor_id` (acteur actif) au lieu de `user_id`.
- Migration finale : backfill `actor_id` des notifs existantes, `SET NOT NULL`, `DROP COLUMN user_id`.

**Blocage connu :** le feed doit afficher les notifs de l'**acteur actif** (personne *ou* entité). Décider : une notif par acteur, ou agrégation multi-entités ? → à trancher en brainstorm avant le sous-plan.

**Estimation : ~1 jour.** Risque : moyen-haut (touche les notifs en prod). **→ Sous-plan dédié requis.**

---

## Phase 3 — `follows.follower_id` / `following_id`

**Files (sous-plan) :**
- Les vues/fonctions `friends`, `are_friends()`, `get_friends_with_dates()` sont **déjà** rebranchées sur les colonnes acteur (`20260525120006`). Restent les **anciennes policies RLS** `follows_select/insert/delete_own` (`20260404120001:100-110`) qui filtrent sur `follower_id`/`following_id`, et les triggers de notif qui lisent `NEW.follower_id`.
- Migration : DROP des vieilles policies + recréation sur `follower_actor`/`following_actor` (la policy additive `follows_write_actor` existe déjà), rebrancher les triggers concernés, puis `DROP COLUMN follower_id, following_id`.

**Estimation : ~½ jour.** Risque : moyen (RLS social). **→ Sous-plan dédié.**

---

## Phase 4 — `participations` / `reviews` / `notes` / `event_reports` (`*.user_id`)

**Files (sous-plan) :**
- 0 lecteur app direct (déjà migrés vers `actor_id`). Bloqueurs = policies RLS legacy (`user_id = auth.uid()`, `are_friends(...)`) + triggers de notif lisant `NEW.user_id`.
- Migration par table : DROP vieilles policies → recréer sur `actor_id` + `can_act_as` (additives déjà posées en `…120002`), rebrancher triggers, backfill NULL résiduels, `SET NOT NULL actor_id`, `DROP COLUMN user_id`.

**Estimation : ~½–1 jour** (4 tables, même patron répété). Risque : moyen. **→ Sous-plan dédié.**

---

## Phase 5 — Retrait de la table `profiles`

**Files (sous-plan) — la plus sensible (auth) :**
- `handle_new_user()` (`20260525120003`) insère encore dans `profiles` à l'inscription → migrer pour n'écrire que `users`/`entities`.
- `src/lib/auth.tsx:74-78,108` → supprimer `fetchProfile` ; le rôle admin (`auth.tsx:170` fallback `profile?.role`) doit vivre sur `users.role`.
- `src/components/admin/AdminUsers.tsx:21` (write role), `src/hooks/use-admin.ts:29-34,110` (stats/list), `src/components/layout/SearchBar.tsx:104` (recherche) → rebrancher sur `users`/`entities`/`actor_public`.
- Policies `events_insert/update_exposant`, admin role checks, tags policies → réécrire sans `profiles`.
- `notify_new_exposant` (ON profiles) → repenser sur `entities`.
- Enfin : DROP des 9 FK → profiles, puis `DROP TABLE profiles`.

**Estimation : ~1–1,5 jour.** Risque : **haut** (chemin d'auth/login en prod). **→ Sous-plan dédié + test login complet.**

---

## Récap chiffrage honnête

| Phase | Estimation | Risque |
|---|---|---|
| 0 — filet | 0,5 h | — |
| 1 — events.created_by | ~½ j | faible-moyen (1 trigger) |
| 2 — notifications | ~1 j | moyen-haut |
| 3 — follows | ~½ j | moyen |
| 4 — participations/reviews/notes/reports | ~½–1 j | moyen |
| 5 — profiles | ~1–1,5 j | **haut** (auth) |
| **Total** | **~3,5–4,5 j** | étalé, étagé |

Chaque phase ≥ 2 doit être éclatée en sous-plan détaillé (no-placeholder) avant exécution. Phase 1 est prête ci-dessus.
