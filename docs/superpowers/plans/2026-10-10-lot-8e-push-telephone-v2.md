# Lot 8e — Les notifications sur le téléphone — plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chaque notification de la cloche sonne aussi sur le téléphone des personnes concernées, ligne par ligne, avec la page Réglages pour activer et choisir.

**Architecture:** un déclencheur après chaque insertion dans `notifications` appelle (pg_net) la fonction en ligne `send-push`, qui trouve les personnes et leurs téléphones et envoie la phrase de la cloche (web-push, VAPID). Côté V2 : un service worker sous `/v2/`, un manifeste, une logique pure testée (ce que permet le téléphone, les six lignes, le message), un hook d'abonnement partagé par les trois portes (Réglages, cloche, tableau de bord).

**Tech Stack:** Postgres (pg_net, Vault), Supabase Edge Functions (Deno, `npm:web-push`), React 19, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-lot-8e-push-telephone-v2-design.md`

## Global Constraints

- La base est la production : migrations par `node_modules/supabase/bin/supabase.exe db push --linked` (dry-run d'abord), aucune écriture de test.
- Les secrets ne vont jamais dans une migration ni dans git : `.env` racine, secrets de la fonction, Vault.
- Déployer la fonction et la V2 : GO d'Uriel.
- Lint V2 : 400 lignes max, en-tête QUOI/POURQUOI, aucune valeur brute en couche 3, pas de style inline.
- Lignes et valeurs : `deadline`, `new_edition`, `friends`, `discussions`, `new_followers`, `weekly` ; d'office coupée : `new_followers`.
- Titre du push : « Fellowship ». Corps : la phrase de la cloche sans gras. `tag` = le lien.
- La demande de permission ne part qu'au clic « Activer ».
- « Plus tard » : 30 jours, sur ce téléphone.

## Review Focus

1. Une notification dont l'envoi échoue (fonction absente, Vault vide, réseau) ne doit **jamais** empêcher l'insertion dans `notifications` — le déclencheur avale l'erreur.
2. Une notification d'enseigne prévient chaque membre, une seule fois chacun, même s'il a deux téléphones ou est membre de deux enseignes destinataires (même `tag`).
3. iPhone hors écran d'accueil, permission refusée, navigateur sans push : aucun bouton qui ne mène à rien.
4. Activer dans la cloche fait disparaître l'invitation du tableau de bord sans recharger.
5. La copie des phrases dans la fonction ne dérive pas de la source (test).

---

### Task 1: La base — pg_net, abonnements, lignes coupées, déclencheur

**Files:**
- Create: `supabase/migrations/20261010090000_pg_net.sql`
- Create: `supabase/migrations/20261010090100_push_subscriptions_register.sql`
- Create: `supabase/migrations/20261010090200_users_push_muted.sql`
- Create: `supabase/migrations/20261010090300_notifications_send_push.sql`
- Modify: `apps/web-v2/src/types/supabase.ts` (régénéré)

- [ ] Vérifier qu'aucun doublon d'`endpoint` n'existe (table vide : 0 ligne, vérifié le 09/10).
- [ ] `pg_net` : `CREATE EXTENSION IF NOT EXISTS pg_net;`
- [ ] Abonnements : `ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);` puis :

```sql
CREATE OR REPLACE FUNCTION public.register_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  INSERT INTO push_subscriptions (user_id, endpoint, keys)
  VALUES (auth.uid(), p_endpoint, jsonb_build_object('p256dh', p_p256dh, 'auth', p_auth))
  ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, keys = EXCLUDED.keys;
END; $$;
REVOKE EXECUTE ON FUNCTION public.register_push_subscription(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(text, text, text) TO authenticated;
```

- [ ] Lignes coupées :

```sql
ALTER TABLE users ADD COLUMN push_muted text[] NOT NULL DEFAULT '{new_followers}'
  CHECK (push_muted <@ ARRAY['deadline','new_edition','friends','discussions','new_followers','weekly']);
```

  (La politique `users_update_self` laisse la personne écrire sa ligne.)
- [ ] Déclencheur : lit `send_push_url` et `push_trigger_secret` dans `vault.decrypted_secrets` ; s'il en manque un, rien ; `net.http_post` avec `{"notification_id": NEW.id}` et l'en-tête `X-Push-Secret` ; **tout dans un bloc `EXCEPTION WHEN OTHERS THEN RETURN NEW`** (Review Focus 1). `SECURITY DEFINER`, `SET search_path = public`.
- [ ] Dry-run, puis `echo Y | … db push --linked`. Vérifier : la contrainte, la colonne (défaut), le déclencheur (`pg_trigger`), les droits de la RPC.
- [ ] Régénérer les types (scratchpad → copie), `pnpm --filter web-v2 exec tsc -b`.
- [ ] Commit `feat(db): push sur le téléphone — abonnements, lignes coupées, déclencheur`.

### Task 2: Les six lignes et le message (logique pure, partagée avec la fonction)

**Files:**
- Modify: `apps/web-v2/src/lib/notifications.ts` (exporter `notificationPhrase(type, data)`)
- Create: `apps/web-v2/src/lib/push-lines.ts`, `push-lines.test.ts`

**Interfaces — Produces:**
- `type PushLine = 'deadline' | 'new_edition' | 'friends' | 'discussions' | 'new_followers' | 'weekly'`
- `PUSH_LINES: { key: PushLine; title: string; detail: string; pro: boolean }[]` (ordre de la maquette)
- `lineOf(type: string): PushLine | null`
- `pushMessage(type: string, data: Record<string, unknown>): { title: string; body: string; url: string; tag: string } | null`

- [ ] Tests d'abord : `lineOf` de chacun des 12 types (dont `event_updated` → null, `inconnu` → null) ; `pushMessage('weekly_new_events', {count: 3})` → `{title:'Fellowship', body:'3 nouveaux événements sur Fellowship cette semaine.', url:'/explorer', tag:'/explorer'}` ; un `deadline_reminder` sans `event_id` → null ; un type sans ligne → null.
- [ ] Les voir échouer, écrire, les voir passer ; suite complète.
- [ ] Commit `feat(v2): les six lignes du téléphone et le message envoyé`.

### Task 3: La fonction `send-push`

**Files:**
- Create: `apps/web-v2/scripts/sync-push-phrases.mjs` (recopie `dates.ts`, `notifications.ts`, `push-lines.ts` dans `supabase/functions/send-push/phrases/`, ajoute `.ts` aux imports relatifs et une ligne « copie — ne pas modifier »)
- Create: `apps/web-v2/src/lib/push-copy.test.ts` (la copie égale la source transformée)
- Create: `supabase/functions/send-push/index.ts`, `deno.json`
- Modify: `supabase/config.toml` (`[functions.send-push] verify_jwt = false`)

- [ ] Test de copie d'abord (échoue : pas de copie), lancer le script, le voir passer.
- [ ] `index.ts` : secret d'en-tête (401) → relit la notification par id (service role) → `lineOf` → personnes (`actor_id` si `actors.kind='person'`, sinon `memberships.user_actor_id`) → sans la ligne dans `push_muted` → leurs `push_subscriptions` (sans doublon d'endpoint) → `pushMessage` → `webpush.sendNotification` (TTL 1 jour) ; 404/410 → ligne effacée. Clés : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_TRIGGER_SECRET` (secrets de la fonction).
- [ ] Commit `feat(push): la fonction send-push`.

### Task 4: Le téléphone — service worker, manifeste, ce qu'il permet

**Files:**
- Create: `apps/web-v2/public/sw.js`, `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png` (le logo carré de Fellowship, depuis les icônes PWA existantes du dépôt)
- Modify: `apps/web-v2/index.html` (`<link rel="manifest">`), `src/main.tsx` (inscription du service worker)
- Create: `apps/web-v2/src/lib/push-device.ts`, `push-device.test.ts`

**Interfaces — Produces:**
- `type PhonePush = 'possible' | 'installer-d-abord' | 'refuse' | 'impossible'`
- `phonePush(t: { userAgent: string; hasPush: boolean; standalone: boolean; permission: NotificationPermission | null }): PhonePush`
- `inviteHidden(dismissedAt: string | null, now: Date): boolean` (30 jours)
- `vapidKeyBytes(base64url: string): Uint8Array<ArrayBuffer>`

- [ ] Tests d'abord : iPhone non installé → `installer-d-abord` (même avec push) ; iPhone installé + push → `possible` ; permission `denied` → `refuse` ; sans push → `impossible` ; invitation cachée à J+29, visible à J+30, visible si date illisible ou nulle ; clé base64url → octets.
- [ ] `sw.js` : `push` → `showNotification(title, {body, icon, badge, tag, data:{url}})` ; `notificationclick` → l'URL sous `registration.scope`, fenêtre de la portée amenée devant et menée, sinon `openWindow`. `skipWaiting` + `clients.claim`.
- [ ] Commit `feat(v2): le service worker et le manifeste du téléphone`.

### Task 5: S'abonner, couper, et les lignes coupées (hooks)

**Files:**
- Create: `apps/web-v2/src/lib/usePhonePush.ts` — `{ state: PhonePush | 'active' | 'loading', busy, failed, activate, cut }` ; prévient les autres instances (événement de fenêtre `flw-push`) pour Review Focus 4.
- Create: `apps/web-v2/src/lib/usePushMuted.ts` — `{ muted: Set<PushLine>, saving, failed, toggle(line) }` sur `users.push_muted` de la personne (`person` de `useAuth`), modèle `useDiscussionMute`.

- [ ] Commit `feat(v2): s'abonner sur ce téléphone et couper une ligne`.

### Task 6: La page Réglages et sa section Notifications

**Files:**
- Create: `apps/web-v2/src/features/settings/` (`README.md`, `SettingsPage.tsx`, `PhoneCard.tsx`, `NotificationSettings.tsx`)
- Create: `apps/web-v2/src/styles/3-components/settings.css` ; jetons dans `2-semantic.css` si besoin
- Modify: `apps/web-v2/src/App.tsx` (route `/reglages`)

- [ ] D'après `2189:302` / `2189:982` relevés au MCP : titre 32 px, colonne des sections (196 px, « Notifications » active), colonne 760 px ; carte du téléphone (cinq états : activer, activé/couper, iPhone, refusé, impossible) ; liste des six lignes avec l'interrupteur « Téléphone » (jetons `--toggle-*`), grisée tant que le téléphone n'est pas `active` ; lignes Pro grisées + bulle du Pro si aucune enseigne Pro.
- [ ] Commit `feat(v2): la page Réglages et ses notifications`.

### Task 7: Les deux autres portes

**Files:**
- Modify: `apps/web-v2/src/features/notifications/NotificationPanel.tsx` (pied : « Régler mes notifications » → `/reglages`, puis la ligne du téléphone si `possible`)
- Create: `apps/web-v2/src/features/dashboard/PhoneInvite.tsx` ; Modify `Dashboard.tsx`
- Modify: `notifications.css`, `dashboard.css` (ou un fichier `phone-invite.css`)

- [ ] Commit `feat(v2): la cloche et le tableau de bord invitent à activer le téléphone`.

### Task 8: Les clés, la mise en ligne, la vérification

- [ ] Générer les clés VAPID (`npx web-push generate-vapid-keys`) et le secret d'en-tête ; les écrire dans `.env` (`VITE_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_TRIGGER_SECRET`).
- [ ] GO d'Uriel → `supabase secrets set …`, `supabase functions deploy send-push`, puis les deux secrets du Vault (`vault.create_secret`) ; appel sans secret → 401.
- [ ] `pnpm --filter web-v2 lint`, `test`, `build` ; version 2.27.0 ; GO → déploiement de la V2 ; `curl` de `/v2/sw.js` et `/v2/manifest.webmanifest`.
- [ ] Relecture par un relecteur neuf (opus), correction des Critique/Important.
- [ ] Docs : plan directeur (8e ☑), `docs/v2/maquettes-2027.md`, `_État.md` ; push.
