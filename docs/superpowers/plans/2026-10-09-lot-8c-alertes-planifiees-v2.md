# Lot 8c — Les alertes planifiées — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** le rappel de clôture des candidatures (Pro, interrupteur sur la fiche), « ton ami a ajouté un événement » et le récapitulatif du mardi arrivent dans la cloche de la V2.

**Architecture:** tout se décide en base : un déclencheur sur `events` pour l'ami, deux fonctions SQL appelées par `pg_cron` pour le rappel et le récapitulatif, une colonne `participations.remind_deadline` allumée au repérage. La V2 ne fait que dire ces notifications (`lib/notifications.ts`) et poser l'interrupteur sur la fiche.

**Tech Stack:** Postgres (Supabase, `pg_cron`), React 19, supabase-js 2, Vitest, lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-09-lot-8c-alertes-planifiees-v2-design.md`

## Global Constraints

- La base est la **production** : migrations via `node_modules/supabase/bin/supabase.exe db push --linked` (dry-run d'abord, `echo Y |`), jamais `apply_migration` du MCP ; aucune écriture de test.
- Une valeur d'enum ajoutée vit **seule** dans sa migration.
- Fonctions : `SECURITY DEFINER SET search_path = public` ; en tête de chaque migration, le POURQUOI.
- Les deux fonctions planifiées ne s'appellent **pas** par l'API : `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated`.
- « Aujourd'hui » en SQL : `(now() AT TIME ZONE 'Europe/Paris')::date`. Tâches à `0 7 * * *` et `0 7 * * 2` (UTC).
- CSS en trois couches, aucune valeur brute en couche 3, pas d'ombre ; ESLint strict (pas de `any`, pas de `!`, 400 lignes max) ; en-têtes QUOI/POURQUOI/ATTENTION.
- Textes exacts (maquette) : « Plus que **7 jours** pour candidater à **X** — clôture le 14 octobre. » · « **Dernier jour** pour candidater à **X**. » · « **Gautier** a ajouté **X**, à Lyon du 3 au 5 juillet 2027. » · « **38 nouveaux événements** sur Fellowship cette semaine. » · interrupteur « Me rappeler la clôture des candidatures » + Pro + « 7 jours avant le {jour mois} — par notification ».

## Review Focus

- **Un appel répété des fonctions planifiées** (tâche relancée, double exécution) : jamais deux rappels pour la même enseigne et le même festival, jamais deux récapitulatifs la même semaine.
- **Un festival privé** : ni rappel, ni « ami a ajouté », ni compté dans le récapitulatif.
- **Un Pro qui a expiré** entre le repérage et le matin du rappel : pas de rappel.
- **L'interrupteur sur un festival non repéré**, puis le statut changé depuis le contrôle segmenté : l'écran et la base restent d'accord (le rappel allumé par le repérage se voit).
- **Une donnée manquante** dans une notification (pas de ville, pas de date limite, `count` absent) : la ligne dit ce qu'elle peut, ou ne s'affiche pas — jamais « undefined ».

---

### Task 1: La base

**Files:**
- Create: `supabase/migrations/20261009210000_notification_type_friend_added_event.sql`
- Create: `supabase/migrations/20261009210100_notification_type_weekly_new_events.sql`
- Create: `supabase/migrations/20261009210200_participations_remind_deadline.sql`
- Create: `supabase/migrations/20261009210300_notify_friend_added_event.sql`
- Create: `supabase/migrations/20261009210400_scheduled_alerts.sql`
- Modify: `apps/web-v2/src/types/supabase.ts` (régénéré)

**Interfaces:**
- Produces: `participations.remind_deadline: boolean` ; types `friend_added_event` (data `actor_id, actor_name, event_id, event_name, city, start_date, end_date`), `weekly_new_events` (data `count`), `deadline_reminder` (data `event_id, event_name, deadline, days_left`).

- [ ] **Step 1: Vérifier les déclencheurs live de `participations` et `events`** (lecture seule)

Lire `pg_trigger` (MCP en lecture, ou `pg` en lecture) : `SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid IN ('public.participations'::regclass,'public.events'::regclass) AND NOT tgisinternal;`
Expected : aucun déclencheur `AFTER UPDATE` de `participations` qui écrirait sur un changement de `remind_deadline` (le rattrapage fait un UPDATE). S'il y en a un, il ne doit réagir qu'à un changement de statut ou de paiement ; sinon, Ruling.

- [ ] **Step 2: Écrire les deux migrations d'enum**

```sql
-- 20261009210000_notification_type_friend_added_event.sql
-- POURQUOI : lot 8c (09/10/2026) — « ton ami a ajouté un événement », tout de suite. Seul dans sa
-- migration : une valeur d'enum ajoutée ne s'utilise pas dans la même transaction.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'friend_added_event';
```

```sql
-- 20261009210100_notification_type_weekly_new_events.sql
-- POURQUOI : lot 8c (09/10/2026) — le récapitulatif du mardi, « X nouveaux événements sur
-- Fellowship ». Seul dans sa migration, comme toute valeur d'enum ajoutée.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'weekly_new_events';
```

- [ ] **Step 3: Écrire la colonne du rappel**

```sql
-- 20261009210200_participations_remind_deadline.sql
-- POURQUOI : lot 8c (09/10/2026) — l'interrupteur « Me rappeler la clôture des candidatures »
-- de la fiche (maquette « Points de contact du Pro »). Uriel : il s'allume tout seul quand on
-- repère un festival ; les festivals déjà repérés l'ont allumé aussi (rattrapage).
ALTER TABLE public.participations
  ADD COLUMN IF NOT EXISTS remind_deadline boolean NOT NULL DEFAULT false;

UPDATE public.participations SET remind_deadline = true WHERE status = 'interesse';

CREATE OR REPLACE FUNCTION public.participations_remind_on_mark()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'interesse' THEN NEW.remind_deadline := true; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS participations_remind_on_mark ON public.participations;
CREATE TRIGGER participations_remind_on_mark
  BEFORE INSERT ON public.participations
  FOR EACH ROW EXECUTE FUNCTION public.participations_remind_on_mark();
```

- [ ] **Step 4: Écrire le déclencheur « ami a ajouté »**

```sql
-- 20261009210300_notify_friend_added_event.sql
-- POURQUOI : lot 8c (09/10/2026) — quand un ami (suivi dans les deux sens, vue `friends`) ajoute
-- une date publique, ses amis le savent tout de suite. Pas un broadcast : l'ancien
-- notify_event_created (une notification par utilisateur et par événement) a été retiré le
-- 11/06/2026 pour son volume ; ici, seuls les amis du créateur sont prévenus. Une enseigne dont le
-- créateur est membre ne se prévient pas elle-même (garde de notify_new_edition).
CREATE OR REPLACE FUNCTION public.notify_friend_added_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  creator_name text;
BEGIN
  IF NEW.is_private OR NEW.created_by_actor IS NULL THEN RETURN NEW; END IF;
  SELECT label INTO creator_name FROM actor_public WHERE actor_id = NEW.created_by_actor;
  IF creator_name IS NULL THEN RETURN NEW; END IF;

  INSERT INTO notifications (actor_id, type, data)
  SELECT f.friend_id, 'friend_added_event',
    jsonb_build_object(
      'actor_id', NEW.created_by_actor, 'actor_name', creator_name,
      'event_id', NEW.id, 'event_name', NEW.name, 'city', NEW.city,
      'start_date', NEW.start_date, 'end_date', NEW.end_date
    )
  FROM friends f
  WHERE f.user_id = NEW.created_by_actor
    AND f.friend_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM memberships mb
      WHERE mb.entity_actor_id = f.friend_id
        AND mb.user_actor_id IN (NEW.created_by_actor, NEW.acted_by_user_id)
    );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_event_added_notify_friends ON public.events;
CREATE TRIGGER on_event_added_notify_friends
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.notify_friend_added_event();
```

Avant d'écrire : vérifier la définition live de la vue `friends` (`pg_get_viewdef('public.friends')`) — `user_id` = l'un, `friend_id` = l'autre, suivi mutuel — et les colonnes de `memberships` (`entity_actor_id`, `user_actor_id`, déjà utilisées par `notify_new_edition`).

- [ ] **Step 5: Écrire les tâches planifiées**

```sql
-- 20261009210400_scheduled_alerts.sql
-- POURQUOI : lot 8c (09/10/2026) — deux alertes qu'aucun geste ne déclenche :
--  · le rappel de clôture (Pro), chaque matin : la date limite tombe dans les 7 jours, l'enseigne
--    a laissé l'interrupteur allumé, elle est Pro ce jour-là ; une seule fois par festival et par
--    enseigne (une date limite saisie tard est rappelée le lendemain) ;
--  · le récapitulatif du mardi (Uriel : le lundi, les exposants roulent), toute la France, une
--    notification par personne, rien s'il n'y a aucune date nouvelle.
-- Les deux fonctions sont rejouables sans doublon (gardes « déjà envoyé »), et fermées à l'API.
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.send_deadline_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today date := (now() AT TIME ZONE 'Europe/Paris')::date;
  sent integer;
BEGIN
  INSERT INTO notifications (actor_id, type, data)
  SELECT p.actor_id, 'deadline_reminder',
    jsonb_build_object(
      'event_id', e.id, 'event_name', e.name,
      'deadline', e.registration_deadline,
      'days_left', e.registration_deadline - today
    )
  FROM participations p
  JOIN events e ON e.id = p.event_id
  JOIN entities en ON en.actor_id = p.actor_id
  WHERE p.remind_deadline
    AND NOT e.is_private
    AND e.registration_deadline BETWEEN today AND today + 7
    AND (en.plan = 'pro' OR en.comped_pro_until > now())
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.actor_id = p.actor_id
        AND n.type = 'deadline_reminder'
        AND n.data->>'event_id' = e.id::text
    );
  GET DIAGNOSTICS sent = ROW_COUNT;
  RETURN sent;
END; $$;

CREATE OR REPLACE FUNCTION public.send_weekly_new_events()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  added integer;
  sent integer;
BEGIN
  SELECT count(*) INTO added
    FROM events
    WHERE NOT is_private AND created_at >= now() - interval '7 days';
  IF added = 0 THEN RETURN 0; END IF;

  INSERT INTO notifications (actor_id, type, data)
  SELECT a.id, 'weekly_new_events', jsonb_build_object('count', added)
  FROM actors a
  WHERE a.kind = 'person'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.actor_id = a.id
        AND n.type = 'weekly_new_events'
        AND n.created_at >= now() - interval '6 days'
    );
  GET DIAGNOSTICS sent = ROW_COUNT;
  RETURN sent;
END; $$;

REVOKE EXECUTE ON FUNCTION public.send_deadline_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_weekly_new_events() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('rappels-de-cloture', '0 7 * * *', $$SELECT public.send_deadline_reminders()$$);
SELECT cron.schedule('recapitulatif-du-mardi', '0 7 * * 2', $$SELECT public.send_weekly_new_events()$$);
```

Avant d'écrire : vérifier `entities.plan`, `entities.comped_pro_until`, `entities.actor_id`, `events.registration_deadline` (date) dans `types/supabase.ts`, et que `notifications.created_at` existe.

- [ ] **Step 6: Appliquer**

Run (depuis la racine) : `node_modules/supabase/bin/supabase.exe db push --linked --dry-run`
Expected : les 5 migrations, et elles seules.
Run : `echo Y | node_modules/supabase/bin/supabase.exe db push --linked`
Expected : `Finished supabase db push.`

- [ ] **Step 7: Vérifier en prod** (lecture seule)

- `SELECT jobname, schedule, command FROM cron.job;` → les deux tâches.
- `SELECT count(*) FROM participations WHERE remind_deadline;` = nombre de participations `interesse`.
- À blanc, **sans INSERT** : le `SELECT` du rappel (même WHERE, `today` calculé) → qui le recevrait demain ; le `count(*)` du récapitulatif.
- `has_function_privilege('anon', 'public.send_weekly_new_events()', 'execute')` → `false` (idem `authenticated`).

- [ ] **Step 8: Régénérer les types et committer**

Run : `node_modules/supabase/bin/supabase.exe gen types typescript --linked --schema public > <scratchpad>/supabase.ts` puis copier vers `apps/web-v2/src/types/supabase.ts`.
Expected : `remind_deadline` dans `participations`, les deux valeurs dans `notification_type`.

```bash
git add supabase/migrations/2026100921* apps/web-v2/src/types/supabase.ts
git commit -m "feat(db): rappel de clôture, ami qui ajoute une date, récapitulatif du mardi"
```

---

### Task 2: La cloche sait dire les trois alertes

**Files:**
- Modify: `apps/web-v2/src/lib/notifications.ts`
- Modify: `apps/web-v2/src/lib/notifications.test.ts`
- Modify: `apps/web-v2/src/features/notifications/NotificationPanel.tsx`

**Interfaces:**
- Consumes: les données de la Task 1.
- Produces: `NotificationView.text: TextPart[]` avec `type TextPart = string | { strong: string }` (remplace `lead` + `rest` : le rappel met deux mots en gras au milieu de la phrase) ; `NotificationIcon` gagne `'deadline' | 'explore'`.

- [ ] **Step 1: Réécrire les tests existants sur `text`**

Dans le test, un utilitaire rend la phrase lisible, le gras entre `**` :

```ts
const said = (view: NotificationView | null) =>
  view?.text.map((part) => (typeof part === 'string' ? part : `**${part.strong}**`)).join('')
```

Chaque assertion `view?.lead` / `view?.rest` devient une seule assertion sur `said(view)`, par
exemple : `expect(said(view)).toBe('**Marion** pose une question sur Arbor Pagan Fest : « L’électricité est fournie ? »')`.

- [ ] **Step 2: Ajouter les tests des trois alertes**

```ts
describe('les alertes planifiées', () => {
  it('le rappel de clôture', () => {
    const view = notificationView(
      row('deadline_reminder', { ...event, deadline: '2026-10-14', days_left: 7 }),
    )
    expect(said(view)).toBe(
      'Plus que **7 jours** pour candidater à **Arbor Pagan Fest** — clôture le 14 octobre.',
    )
    expect(view?.href).toBe('/evenement/e1')
    expect(view?.icon).toBe('deadline')
  })
  it('le rappel, la veille', () => {
    const view = notificationView(
      row('deadline_reminder', { ...event, deadline: '2026-10-14', days_left: 1 }),
    )
    expect(said(view)).toBe(
      'Plus que **1 jour** pour candidater à **Arbor Pagan Fest** — clôture le 14 octobre.',
    )
  })
  it('le rappel, le dernier jour', () => {
    const view = notificationView(
      row('deadline_reminder', { ...event, deadline: '2026-10-14', days_left: 0 }),
    )
    expect(said(view)).toBe('**Dernier jour** pour candidater à **Arbor Pagan Fest**.')
  })
  it('un rappel sans date limite ne s’affiche pas', () => {
    expect(notificationView(row('deadline_reminder', { ...event, days_left: 3 }))).toBeNull()
  })
  it('un ami a ajouté une date', () => {
    const view = notificationView(
      row('friend_added_event', {
        ...event,
        actor_name: 'Gautier',
        city: 'Lyon',
        start_date: '2027-07-03',
        end_date: '2027-07-05',
      }),
    )
    expect(said(view)).toBe('**Gautier** a ajouté **Arbor Pagan Fest**, à Lyon du 3 au 5 juillet 2027.')
    expect(view?.href).toBe('/evenement/e1')
    expect(view?.icon).toBe('friend')
  })
  it('un ami a ajouté une date sans ville', () => {
    const view = notificationView(
      row('friend_added_event', {
        ...event,
        actor_name: 'Gautier',
        city: null,
        start_date: '2027-07-03',
        end_date: '2027-07-05',
      }),
    )
    expect(said(view)).toBe('**Gautier** a ajouté **Arbor Pagan Fest**, du 3 au 5 juillet 2027.')
  })
  it('le récapitulatif de la semaine', () => {
    const view = notificationView(row('weekly_new_events', { count: 38 }))
    expect(said(view)).toBe('**38 nouveaux événements** sur Fellowship cette semaine.')
    expect(view?.href).toBe('/explorer')
    expect(view?.icon).toBe('explore')
  })
  it('le récapitulatif au singulier', () => {
    const view = notificationView(row('weekly_new_events', { count: 1 }))
    expect(said(view)).toBe('**1 nouvel événement** sur Fellowship cette semaine.')
  })
  it('un récapitulatif sans nombre ne s’affiche pas', () => {
    expect(notificationView(row('weekly_new_events', {}))).toBeNull()
  })
})
```

Et dans le test de `KNOWN_TYPES`, les trois types en plus.

- [ ] **Step 3: Lancer, voir échouer**

Run (dans `apps/web-v2`) : `pnpm exec vitest run src/lib/notifications.test.ts`
Expected : FAIL — `text` absent, types inconnus.

- [ ] **Step 4: Implémenter**

Dans `lib/notifications.ts` :
- `export type TextPart = string | { strong: string }` ; dans `NotificationView`, `text: TextPart[]` remplace `lead` et `rest` (commentaire : « la phrase, ses mots en gras à part ») ; `Phrase` suit.
- `NotificationIcon` : ajouter `'deadline' | 'explore'`.
- `KNOWN_TYPES` : ajouter `'deadline_reminder'`, `'friend_added_event'`, `'weekly_new_events'`.
- Chaque phrase existante passe de `{ lead: X, rest: Y }` à `{ text: [{ strong: X }, Y] }` (même sens, même texte).
- Nouvelles phrases :

```ts
    case 'deadline_reminder': {
      const deadline = text(data, 'deadline')
      const days = data.days_left
      if (!event || !fiche || !deadline || typeof days !== 'number') return null
      if (days <= 0) {
        return {
          icon: 'deadline',
          text: [{ strong: 'Dernier jour' }, ' pour candidater à ', { strong: event }, '.'],
          href: fiche,
        }
      }
      const left = `${String(days)} ${days === 1 ? 'jour' : 'jours'}`
      const close = formatDayMonth(parseSqlDate(deadline))
      return {
        icon: 'deadline',
        text: ['Plus que ', { strong: left }, ' pour candidater à ', { strong: event }, ` — clôture le ${close}.`],
        href: fiche,
      }
    }
    case 'friend_added_event': {
      const start = text(data, 'start_date')
      const end = text(data, 'end_date')
      const city = text(data, 'city')
      if (!who || !event || !fiche || !start || !end) return null
      const dates = `${formatDateSpan(parseSqlDate(start), parseSqlDate(end))} ${start.slice(0, 4)}`
      const where = city ? `, à ${city} ${dates}.` : `, ${dates}.`
      return { icon: 'friend', text: [{ strong: who }, ' a ajouté ', { strong: event }, where], href: fiche }
    }
    case 'weekly_new_events': {
      const count = data.count
      if (typeof count !== 'number' || count < 1) return null
      const added = count === 1 ? '1 nouvel événement' : `${String(count)} nouveaux événements`
      return { icon: 'explore', text: [{ strong: added }, ' sur Fellowship cette semaine.'], href: '/explorer' }
    }
```

(`formatDayMonth` rend « 14 octobre » ; `formatDateSpan` rend « du 3 au 5 juillet ». Vérifier sur le test, l'année est ajoutée à la main comme pour `new_edition`.)

Dans `NotificationPanel.tsx` :
- `ICONS` : `deadline: Clock`, `explore: Telescope` (import lucide).
- Le bouton rend la phrase :

```tsx
<button type="button" className="notif__open" onClick={open}>
  {view.text.map((part, index) =>
    typeof part === 'string' ? part : <b key={index}>{part.strong}</b>,
  )}
</button>
```

- [ ] **Step 5: Lancer, voir passer ; la suite entière**

Run : `pnpm exec vitest run src/lib/notifications.test.ts` → PASS.
Run : `pnpm --filter web-v2 test` → tout vert. `pnpm --filter web-v2 lint` → propre (une clé d'index dans un `map` : si la règle la refuse, clé `${view.id}-${index}`).

- [ ] **Step 6: Commit**

```bash
git add apps/web-v2/src/lib/notifications.ts apps/web-v2/src/lib/notifications.test.ts apps/web-v2/src/features/notifications/NotificationPanel.tsx
git commit -m "feat(v2): la cloche dit le rappel de clôture, l'ami qui ajoute une date et le récapitulatif"
```

---

### Task 3: L'interrupteur sur la fiche

**Files:**
- Create: `apps/web-v2/src/components/ui/Switch.tsx` (+ ligne dans `components/ui/README.md`)
- Create: `apps/web-v2/src/styles/3-components/switch.css` (+ import dans `styles/index.css`)
- Create: `apps/web-v2/src/features/event/useDeadlineReminder.ts`
- Create: `apps/web-v2/src/features/event/DeadlineReminder.tsx`
- Modify: `apps/web-v2/src/features/event/Applying.tsx` (+ ses props), `EventPage.tsx` (passer `setStatus`)
- Modify: `apps/web-v2/src/styles/2-semantic.css` (jetons de l'interrupteur, clair et sombre), `styles/3-components/event-page.css` (la carte)

**Interfaces:**
- Consumes: `participations.remind_deadline` (Task 1) ; `setStatus(next)` de `useEvent` ; `usePlan().pro` ; `ProBubble`, `ProBadge`.
- Produces: `Switch({ checked, disabled, label, onChange })` ; `useDeadlineReminder(eventId, actorId, status, setStatus) → { on, saving, failed, toggle }`.

- [ ] **Step 1: Prendre les mesures exactes** dans Figma (`2086:61`, carte « Rappel de clôture ») avec `get_design_context` : carte blanche, liseré `#ebe9e5`, rayon 12, marges 14/16, écart 14 ; cloche 16 px encre douce ; titre Inter Medium 14 encre ; pastille Pro ; sous-titre 12 encre douce ; piste 30×18 rayon 9, bouton 14 px. État allumé : piste encre (bouton principal noir de la maquette). Jetons : réutiliser les jetons sémantiques existants (`--surface-card`, `--line-card`, `--ink-title`, `--ink-soft`, `--type-list-meta`) ; ajouter `--switch-track-off`, `--switch-track-on`, `--switch-knob` en couche 2, clair et sombre.

- [ ] **Step 2: `Switch`** — un `<button role="switch" aria-checked>` avec `aria-label`, la piste et le bouton en CSS (`.switch`, `.switch--on`, `.switch:disabled`), transition coupée sous `prefers-reduced-motion`. Pas de logique.

- [ ] **Step 3: `useDeadlineReminder`** (modèle de `useDiscussionMute`)

- Lecture : `participations.remind_deadline` pour `actor_id` + `event_id` (`maybeSingle`), **relue quand `status` change** (repérer depuis le contrôle segmenté allume le rappel en base : l'écran doit le montrer).
- `toggle()` : verrou `saving` ; si `status === null` → `await setStatus('interesse')` (le déclencheur allume le rappel) puis `on = true` ; sinon `update({ remind_deadline: next })` sur la participation, l'écran bouge d'abord et revient en arrière si l'écriture échoue (`failed`).

- [ ] **Step 4: `DeadlineReminder`** — rendu seulement si la date limite est **à venir** (`daysUntil(deadline) >= 0`).

```tsx
<div className="deadline-reminder">
  <Bell size={16} strokeWidth={1.8} />
  <span className="deadline-reminder__text">
    <span className="deadline-reminder__title">
      Me rappeler la clôture des candidatures <ProBadge />
    </span>
    <span className="deadline-reminder__sub">
      7 jours avant le {formatDayMonth(deadline)} — par notification
    </span>
  </span>
  <Switch checked={pro && reminder.on} disabled={reminder.saving} label="Me rappeler la clôture des candidatures" onChange={…} />
</div>
```

En gratuit : interrupteur grisé (classe `switch--locked`, opacité de la maquette), le clic ouvre `ProBubble` (« Ne rate plus une candidature » / « Le Pro te prévient 7 jours avant la clôture des candidatures. »), fermée par Échap ou un clic dehors comme dans `EventStatus`. Si `failed` : une ligne « Le rappel n’a pas pu être enregistré. ».

- [ ] **Step 5: Poser la carte** dans `Applying.tsx`, juste sous la `dossier-card`, avec `setStatus` passé depuis `EventPage`. Vérifier que `EventPage.tsx` reste sous 400 lignes.

- [ ] **Step 6: Vérifier dans le navigateur** (`pnpm dev:v2`), compte Pro puis gratuit (`devOverride`) :
1. Fiche d'un festival repéré avec une date limite à venir → interrupteur allumé.
2. L'éteindre, recharger → éteint. Le rallumer.
3. Festival non repéré → interrupteur éteint ; l'allumer → le statut passe à « Intéressé », l'interrupteur reste allumé.
4. Date limite passée ou absente → pas de carte.
5. Gratuit → grisé, la bulle s'ouvre et se ferme.
6. Thème sombre lisible.

Écrire uniquement sur ses propres enseignes, et remettre l'état d'origine après le test.

- [ ] **Step 7: Lint, tests, build, commit**

Run : `pnpm --filter web-v2 lint && pnpm --filter web-v2 test && pnpm --filter web-v2 build` → propres.

```bash
git add apps/web-v2/src
git commit -m "feat(v2): l'interrupteur « Me rappeler la clôture des candidatures » sur la fiche"
```

---

### Task 4: Livrer

- [ ] **Step 1: Relecture fraîche** (opus) de tout le lot : spec, plan, `git diff <base>..HEAD`, Review Focus ci-dessus. Critique / Important → corrigés (test d'abord) ; mineurs → listés.
- [ ] **Step 2: Version** : `apps/web-v2/package.json` 2.25.0 → 2.26.0.
- [ ] **Step 3: Docs** : plan directeur (`8c ☑`, et l'ordre décidé : revue des Réglages → 8e push → 8d recherches sauvegardées), `docs/v2/maquettes-2027.md` (cadre `2182:2`, l'interrupteur retouché), `_État.md` du vault (décisions du 09/10 : push avant e-mail, mardi, toute la France).
- [ ] **Step 4: Déploiement V2** — **avec le GO d'Uriel** — `.claude/rules/deploiement.md`.
- [ ] **Step 5: Commit, push.**
