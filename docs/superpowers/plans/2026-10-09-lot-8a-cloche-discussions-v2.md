# Lot 8a — La cloche et les discussions — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** une nouvelle question prévient les exposants engagés ; la cloche de la V2 montre les notifications ; la fiche permet de mettre une discussion en sourdine.

**Architecture:** trois migrations (table de sourdine, valeur d'enum, déclencheur) ; une logique pure `lib/notifications.ts` testée ; `features/notifications/` pour la cloche et son panneau ; la sourdine dans `features/event/`.

**Tech Stack:** Postgres (Supabase, plpgsql), React 19, supabase-js 2, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-lot-8a-cloche-discussions-v2-design.md`.

## Global Constraints

- Migrations horodatées, en tête le POURQUOI, appliquées par `node_modules/supabase/bin/supabase.exe db push --linked` (dry-run d'abord, `--dry-run`). Jamais `apply_migration` du MCP. La base est la production.
- Le déclencheur copie le modèle de `notify_thread_reply` (`SECURITY DEFINER`, `SET search_path = public`, garde `is_private`, nom par `actor_public`).
- Statuts engagés : `en_cours`, `inscrit`, `confirme` (`PROGRAMMED_STATUSES`).
- Aucune ligne créée en production pour tester.
- Règles du dépôt (lint, en-têtes, jetons, tests par `pnpm exec vitest run <fichier>`).

## Review Focus

1. **L'auteur d'une question est lui-même inscrit** : il ne reçoit pas sa propre notification (déclencheur, `actor_id <> NEW.actor_id`).
2. **Un exposant a mis le festival en sourdine** : rien ne lui arrive, mais les réponses à ses propres questions arrivent toujours (`notify_thread_reply` intouché).
3. **Événement privé** : personne n'est prévenu.
4. **Type de notification inconnu** (une valeur de la V1 non gérée) : non affiché, sans planter. `notificationView` → `null` (tâche 2).
5. **Une notification d'hier à 23 h vue après minuit** : rangée dans « Cette semaine », pas « Aujourd'hui ». `groupByDay` (tâche 2).

---

### Task 1 : les migrations

**Files:** Create `supabase/migrations/20261009120000_discussion_mutes.sql`, `20261009120100_notification_type_thread_question.sql`, `20261009120200_notify_thread_question.sql`.

- [ ] **Step 1 :** écrire les trois fichiers :

```sql
-- POURQUOI : retour client du 08/10/2026 — pouvoir couper les notifications des nouvelles
-- questions d'un festival (« mute la conv »). Une ligne = la discussion de ce festival est en
-- sourdine pour cet acteur. Lot 8a de la V2.
CREATE TABLE public.discussion_mutes (
  actor_id   uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, event_id)
);
ALTER TABLE public.discussion_mutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY discussion_mutes_owner ON public.discussion_mutes
  FOR ALL TO authenticated
  USING (can_act_as(actor_id))
  WITH CHECK (can_act_as(actor_id));
```

```sql
-- POURQUOI : un nouveau type de notification, « une question sur un festival où tu vas ». Seul
-- dans sa migration : une valeur d'enum ajoutée ne s'utilise pas dans la même transaction.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'thread_question';
```

```sql
-- POURQUOI : retour client du 08/10/2026 — une nouvelle question dans la discussion d'un
-- festival prévient les exposants ENGAGÉS sur la date (dossier envoyé, inscrit, confirmé), sauf
-- l'auteur et ceux qui l'ont mise en sourdine (discussion_mutes). Modèle : notify_thread_reply.
CREATE OR REPLACE FUNCTION public.notify_thread_question()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ev_name text; ev_private boolean;
  asker_name text; asker_avatar text;
BEGIN
  SELECT e.name, e.is_private INTO ev_name, ev_private FROM events e WHERE e.id = NEW.event_id;
  IF ev_name IS NULL OR ev_private THEN RETURN NEW; END IF;

  SELECT COALESCE(label, 'Quelqu''un'), avatar_url INTO asker_name, asker_avatar
    FROM actor_public WHERE actor_id = NEW.actor_id;

  INSERT INTO notifications (actor_id, type, data)
  SELECT p.actor_id, 'thread_question',
    jsonb_build_object(
      'actor_id', NEW.actor_id, 'actor_name', asker_name, 'actor_avatar_url', asker_avatar,
      'event_id', NEW.event_id, 'event_name', ev_name,
      'thread_id', NEW.id, 'thread_title', NEW.title
    )
  FROM participations p
  JOIN entities en ON en.actor_id = p.actor_id AND en.type = 'exposant'
  WHERE p.event_id = NEW.event_id
    AND p.status IN ('en_cours', 'inscrit', 'confirme')
    AND p.actor_id <> NEW.actor_id
    AND NOT EXISTS (
      SELECT 1 FROM discussion_mutes m
      WHERE m.actor_id = p.actor_id AND m.event_id = NEW.event_id
    );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_thread_question ON event_threads;
CREATE TRIGGER on_thread_question
  AFTER INSERT ON event_threads
  FOR EACH ROW EXECUTE FUNCTION notify_thread_question();
```

- [ ] **Step 2 :** `node_modules/supabase/bin/supabase.exe db push --linked --dry-run` → les trois migrations, et elles seules.
- [ ] **Step 3 :** `db push --linked` ; vérifier en lecture seule (`information_schema.tables`, `pg_policies`, `pg_trigger`, valeur de l'enum).
- [ ] **Step 4 :** régénérer `apps/web-v2/src/types/supabase.ts` (procédure de `.claude/rules/supabase.md`) ; commit `feat(db): une question prévient les exposants engagés ; la sourdine d'une discussion`.

### Task 2 : `lib/notifications.ts`

**Interfaces — Produces:**
```ts
export interface NotificationRow { id: string; type: string; data: Record<string, unknown>; read: boolean; created_at: string }
export interface NotificationView { id: string; read: boolean; at: Date; avatarUrl: string | null; icon: 'question' | 'reply' | 'star' | 'friend' | 'follow' | 'update'; lead: string; rest: string; href: string }
export function notificationView(row: NotificationRow): NotificationView | null
export function groupByDay(views: NotificationView[], now: Date): { label: 'Aujourd’hui' | 'Cette semaine' | 'Plus tôt'; items: NotificationView[] }[]
```

- [ ] Tests d'abord : un cas par type (phrase et lien), type inconnu → `null`, champ manquant → `null`, groupement (aujourd'hui, hier 23 h → « Cette semaine », il y a 10 jours → « Plus tôt »), groupes vides omis. Puis l'implémentation. Phrases (gras = `lead`) :
  - `thread_question` : « **{actor_name}** pose une question sur {event_name} : « {thread_title} » » → `/evenement/{event_id}#discussions`
  - `thread_reply` : « **{actor_name}** a répondu à ta question sur {event_name} » → idem
  - `best_reply` : « Ta réponse a été choisie sur **{event_name}** » → idem
  - `review_reply` : « **{actor_name}** a répondu à ton avis sur {event_name} » → `/evenement/{event_id}`
  - `friend_going` : « **{actor_name}** s'est inscrit à {event_name}, où tu vas aussi. » → `/evenement/{event_id}`
  - `new_follower` : « **{actor_name}** suit maintenant ta vitrine. » → `/` (pas de lien de vitrine dans `data`)
  - `event_updated` : « **{event_name}** a été mis à jour. » → `/evenement/{event_id}`
- [ ] Commit `feat(v2): les notifications, en phrases et par jour`.

### Task 3 : la cloche et son panneau

**Files:** Create `features/notifications/useNotifications.ts`, `NotificationBell.tsx`, `NotificationPanel.tsx`, `README.md`, `styles/3-components/notifications.css` ; Modify `components/layout/Topbar.tsx`.

- [ ] `useNotifications` : `actorIds` = les `actor_id` de `entities` + celui de `person` ; lecture `notifications` `.in('actor_id', actorIds).order('created_at', { ascending: false }).limit(50)` au montage et à `refresh()` ; `markRead(id)` et `markAllRead()` (mise à jour optimiste, rechargement en cas d'échec).
- [ ] `NotificationBell` remplace le bouton vide de `Topbar` : point si non-lu, clic ouvre `NotificationPanel` (et appelle `refresh`) ; clic dehors et Échap referment.
- [ ] `NotificationPanel` d'après `2088:6` (relever avec `get_design_context`) ; un clic : `markRead` puis navigation vers `href`.
- [ ] Lint, build ; commit `feat(v2): la cloche et son panneau`.

### Task 4 : la sourdine sur la fiche

**Files:** Create `features/event/useDiscussionMute.ts` ; Modify `features/event/EventDiscussion.tsx`, `EventPage.tsx`, `styles/3-components/discussion.css`.

- [ ] `useDiscussionMute(eventId, actorId)` : lit la ligne (`maybeSingle`), `toggle()` insère ou supprime ; échec → état d'avant + message.
- [ ] Le bouton d'après `2173:2`, affiché seulement si l'acteur actif a une participation engagée (`PROGRAMMED_STATUSES` contient `status`).
- [ ] Lint, build ; commit `feat(v2): mettre en sourdine la discussion d'un festival`.

### Task 5 : relecture, déploiement, coche

- [ ] Relecture finale (agent neuf), corrections ; déploiement V2 ; cocher « 8a ☑ » ; push ; demander à Uriel le test à deux comptes.
