# Lot 10c — Modifier un événement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** une fiche publique se modifie par tout compte connecté (privée : son créateur), chaque enregistrement garde une version, et « L'histoire de la fiche » montre ce que chacun a ajouté ou retiré.

**Architecture:** en base, une table `event_versions` (copie complète par enregistrement) et une seule porte d'écriture `modifier_evenement` (SECURITY DEFINER) ; la mise à jour directe d'`events` est fermée. Côté V2, trois écrans neufs (`/evenement/:id/modifier`, `/evenement/:id/historique`, `/evenement/:id/historique/:version`) bâtis sur des fonctions pures testées (`lib/event-edit.ts`, `lib/event-history.ts`, `lib/rich-text.ts`), et la fiche gagne « Modifier la fiche », la ligne « Tenu à jour » et les infos manquantes.

**Tech Stack:** React 19, React Router 7 (BrowserRouter), supabase-js, Vitest, Postgres (Supabase), `diff` (jsdiff) pour la comparaison mot à mot.

**Spec:** `docs/superpowers/specs/2026-10-12-lot-10c-modifier-un-evenement-v2-design.md`

## Global Constraints

- Maquettes qui font foi : `2117:2` (Modifier l'événement, bascule Fiche / Carte masquée), `2253:2` (L'histoire de la fiche), `2253:299` (une version), `2256:2` (Fiche · modifier et infos manquantes). Fichier Figma `9CmmBD3t5rAk4tD583cdN3`.
- Ce qui n'est pas sur ces maquettes n'existe pas : ni passage en privé, ni édition, horaires, affluence, taille ou prix du stand, ni lien vers l'édition précédente.
- Fiche publique : tout compte connecté ; fiche privée : son seul créateur. « Revenir à cette version » : admins seulement.
- Un mot de modification : 140 caractères au plus.
- Limite : 50 modifications par jour et par personne.
- Textes exacts : « Rien n'a changé. », « {prénom} vient de modifier la fiche — recharge pour voir sa version. », « Il manquait cette info — merci de compléter la fiche pour tous », « Tenu à jour par les exposants », « Pas encore renseigné », « + Ajouter », « Actuelle », « Voir › », « Souligné : ce qui a été ajouté. Barré : ce qui a été retiré. », « Revenir à cette version », « Réservé aux admins. Revenir crée une nouvelle version : rien ne se perd. », « Un mot sur ta modification », « Facultatif. Il s'affiche dans l'histoire de la fiche, à côté de ton nom. », « Tes modifications sont visibles de tous les exposants dès l'enregistrement. ».
- La base est la production : migrations par `node_modules/supabase/bin/supabase.exe db push --linked` seulement ; tout `CREATE OR REPLACE` part de la définition live ; aucune écriture de test sur une vraie fiche publique (compte jetable + fiche privée, effacés).
- V2 : lint strict (pas de `any`, pas de `!`, 400 lignes max par fichier, en-tête QUOI/POURQUOI sur chaque fichier, README par dossier), aucune valeur brute dans `styles/3-components/`, jetons dans `2-semantic.css`, tout changement d'état animé, `prefers-reduced-motion` respecté.
- Après une écriture de fichiers par script : vérifier ce que sert Vite (`curl -s http://localhost:5174/v2/src/<fichier> | grep …`), sinon `touch`.
- Commits en français (Conventional Commits), se terminant par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Une description mise en forme par la V1** (HTML : listes, gras — 45 fiches dont 14 avec listes ou gras) : l'ouvrir pour la modifier puis enregistrer sans toucher à la description ne doit PAS la réécrire (ni version marquée « a changé la description »). Test : `changedFields` sur une fiche HTML non touchée → `{}` (Task 3).
2. **Deux personnes modifient la même fiche** : la seconde à enregistrer est refusée avec le prénom du premier, sa saisie reste à l'écran. Test SQL en Task 1 (version attendue périmée → exception).
3. **Une fiche jamais modifiée** (les 112 actuelles) : l'histoire montre « a ajouté l'événement » sans version écrite, et la première modification écrit l'origine puis la sienne. Test SQL en Task 1.
4. **Un auteur dont le compte est supprimé** : l'histoire affiche « Un compte supprimé », jamais une ligne vide ni « null ». Test `authorName` (Task 4).
5. **Une fiche privée d'un autre** : ni « Modifier la fiche », ni « + Ajouter », ni histoire lisible, et la porte d'écriture refuse. Tests `canEditEvent` (Task 3) et SQL (Task 1).

---

## File Structure

- Create `supabase/migrations/20261012120000_event_versions.sql` — table et fonctions.
- Create `supabase/migrations/20261012130000_events_update_through_versions.sql` — la fermeture de la mise à jour directe (appliquée au déploiement).
- Modify `apps/web-v2/src/types/supabase.ts` — régénéré.
- Modify `apps/web-v2/src/lib/rich-text.ts` (+ test) — `htmlToText`, `textToHtml`.
- Create `apps/web-v2/src/lib/event-edit.ts` (+ test) — fiche ↔ formulaire, champs changés, infos manquantes, droit de modifier.
- Create `apps/web-v2/src/lib/event-history.ts` (+ test) — phrase d'une version, auteur, blocs de comparaison.
- Create `apps/web-v2/src/features/event-history/` — `README.md`, `useEventHistory.ts`, `HistoryPage.tsx`, `VersionPage.tsx`.
- Create `apps/web-v2/src/features/event-edit/` — `README.md`, `useEditEvent.ts`, `EditEvent.tsx`, `EditSections.tsx`, `EditPreview.tsx`, `TagPicker.tsx`.
- Modify `apps/web-v2/src/features/event-create/Steps.tsx` — les champs « Où et quand » et « Pour candidater » sortent en `PlaceFields` / `ApplyFields` (même dossier), réutilisés par la modification.
- Modify `apps/web-v2/src/features/event-create/CreateEvent.tsx` — la description enregistrée en HTML (`textToHtml`).
- Modify `apps/web-v2/src/features/event/EventPage.tsx`, `Applying.tsx`; Create `features/event/KeptUpToDate.tsx`.
- Modify `apps/web-v2/src/App.tsx` — trois routes.
- Create `apps/web-v2/src/styles/3-components/event-edit.css`, `event-history.css`; Modify `styles/index.css`, `styles/2-semantic.css`, `styles/3-components/event-page.css`, `info-rows.css`.
- Modify `docs/v2/purge-back.md` — l'édition en place de la V1 devient du code mort.

---

### Task 1: La base — versions, porte d'écriture, histoire

**Files:**
- Create: `supabase/migrations/20261012120000_event_versions.sql`
- Modify: `apps/web-v2/src/types/supabase.ts`, `docs/v2/purge-back.md`
- Test: script jetable `e2e-10c-db.mjs` dans le dossier temporaire de la session (hors dépôt)

**Interfaces:**
- Produces (RPC) :
  - `modifier_evenement(p_event uuid, p_fields jsonb, p_expected_version bigint, p_note text default null, p_as_entity uuid default null) returns bigint`
  - `revenir_a_version_evenement(p_version bigint) returns bigint`
  - `histoire_evenement(p_event uuid) returns table(id bigint, created_at timestamptz, author_name text, author_brand text, author_avatar text, note text, changed text[], is_origin boolean)` — plus récente d'abord ; si aucune version n'est écrite, une seule ligne d'origine synthétique avec `id = null`.
  - `version_evenement(p_version bigint) returns table(field text, before jsonb, after jsonb)` — les champs changés par rapport à la version précédente.
- Clés acceptées dans `p_fields` (noms de colonnes d'`events`) : `name, address, city, department, latitude, longitude, geo_precision, start_date, end_date, tags, image_url, registration_deadline, registration_note, registration_url, contact_email, external_url, description`.

- [ ] **Step 1: Relire le live** — politiques et fonctions utilisées (déjà relevées le 12/10/2026, à revérifier) :

```bash
cd /c/Users/uriel/Desktop/DEVs/fellowship && export SUPABASE_DB_PASSWORD=$(grep '^SUPABASE_DB_PASSWORD=' .env | cut -d= -f2- | tr -d '"')
node_modules/supabase/bin/supabase.exe db query --linked "select policyname, cmd from pg_policies where tablename='events'" -o csv
```
Expected : `events_write_actor ALL`, `admin_delete_events DELETE`, `anon_read_events SELECT`, `events_select_authenticated SELECT`, `events_update_exposant UPDATE`. Si autre chose : s'arrêter et relire.

- [ ] **Step 2: Écrire la migration**

```sql
-- POURQUOI — lot 10c (Uriel, 12/10/2026) : la fiche d'un événement est partagée ; une fiche
-- publique se modifie par tout compte connecté, une privée par son seul créateur. Chaque
-- enregistrement garde une copie complète (méthode des lieux de Runes de Chêne) pour que « L'histoire
-- de la fiche » montre ce que chacun a ajouté ou retiré, et qu'un admin puisse revenir en arrière.
-- Une seule porte d'écriture (modifier_evenement) ; la mise à jour directe d'events sera fermée par
-- la migration du jour de la bascule (20261012130000). La version d'origine s'écrit au premier
-- changement : les fiches existantes n'ont rien à reprendre.

CREATE TABLE public.event_versions (
  id bigserial PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_user uuid REFERENCES public.users(actor_id) ON DELETE SET NULL,
  author_entity uuid REFERENCES public.entities(actor_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  note text CHECK (char_length(note) <= 140),
  name text NOT NULL,
  address text,
  city text NOT NULL,
  department text NOT NULL,
  latitude double precision,
  longitude double precision,
  geo_precision text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  tags text[],
  image_url text,
  registration_deadline date,
  registration_note text,
  registration_url text,
  contact_email text,
  external_url text,
  description text
);
CREATE INDEX event_versions_event_idx ON public.event_versions (event_id, id DESC);
CREATE INDEX event_versions_author_day_idx ON public.event_versions (author_user, created_at);
ALTER TABLE public.event_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_versions FROM PUBLIC, anon, authenticated;

-- Qui peut voir une fiche dans l'histoire : publique, tous ; privée, son créateur.
CREATE FUNCTION public._evenement_lisible(p_event uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM events e WHERE e.id = p_event
                 AND (NOT e.is_private OR can_act_as(e.created_by_actor)));
$$;

CREATE FUNCTION public.modifier_evenement(
  p_event uuid, p_fields jsonb, p_expected_version bigint,
  p_note text DEFAULT NULL, p_as_entity uuid DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  me uuid := auth.uid();
  e events%ROWTYPE;
  n events%ROWTYPE;
  latest bigint;
  latest_author text;
  entity uuid;
  allowed text[] := ARRAY['name','address','city','department','latitude','longitude',
    'geo_precision','start_date','end_date','tags','image_url','registration_deadline',
    'registration_note','registration_url','contact_email','external_url','description'];
  new_id bigint;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Connecte-toi pour modifier une fiche.'; END IF;
  SELECT * INTO e FROM events WHERE id = p_event FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cette fiche n''existe plus.'; END IF;
  IF e.is_private AND NOT can_act_as(e.created_by_actor) THEN
    RAISE EXCEPTION 'Seul son créateur modifie une fiche privée.';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_fields) k WHERE k <> ALL (allowed)) THEN
    RAISE EXCEPTION 'Ce champ ne se modifie pas ici.';
  END IF;

  SELECT v.id, u.display_name INTO latest, latest_author
    FROM event_versions v LEFT JOIN users u ON u.actor_id = v.author_user
   WHERE v.event_id = p_event ORDER BY v.id DESC LIMIT 1;
  IF latest IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION '% vient de modifier la fiche — recharge pour voir sa version.',
      COALESCE(latest_author, 'Quelqu''un');
  END IF;

  IF (SELECT count(*) FROM event_versions
       WHERE author_user = me AND created_at > now() - interval '1 day') >= 50 THEN
    RAISE EXCEPTION 'Tu as fait beaucoup de modifications aujourd''hui : reviens demain.';
  END IF;

  n := jsonb_populate_record(e, p_fields);
  IF char_length(trim(n.name)) < 3 THEN RAISE EXCEPTION 'Le nom fait au moins trois lettres.'; END IF;
  IF trim(coalesce(n.city, '')) = '' THEN RAISE EXCEPTION 'La ville est nécessaire.'; END IF;
  IF trim(coalesce(n.department, '')) = '' THEN RAISE EXCEPTION 'Le département est nécessaire.'; END IF;
  IF n.end_date < n.start_date THEN RAISE EXCEPTION 'La date de fin tombe avant le début.'; END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 140 THEN
    RAISE EXCEPTION 'Le mot fait 140 caractères au plus.';
  END IF;

  IF ROW(e.name, e.address, e.city, e.department, e.latitude, e.longitude, e.geo_precision,
         e.start_date, e.end_date, e.tags, e.image_url, e.registration_deadline,
         e.registration_note, e.registration_url, e.contact_email, e.external_url, e.description)
     IS NOT DISTINCT FROM
     ROW(n.name, n.address, n.city, n.department, n.latitude, n.longitude, n.geo_precision,
         n.start_date, n.end_date, n.tags, n.image_url, n.registration_deadline,
         n.registration_note, n.registration_url, n.contact_email, n.external_url, n.description)
  THEN
    RAISE EXCEPTION 'Rien n''a changé.';
  END IF;

  -- La fiche d'origine devient la première version, avec son créateur et sa date.
  IF latest IS NULL THEN
    INSERT INTO event_versions (event_id, author_user, author_entity, created_at, name, address,
      city, department, latitude, longitude, geo_precision, start_date, end_date, tags, image_url,
      registration_deadline, registration_note, registration_url, contact_email, external_url,
      description)
    VALUES (e.id,
      (SELECT actor_id FROM users WHERE actor_id IN (e.acted_by_user_id, e.created_by_actor) LIMIT 1),
      (SELECT actor_id FROM entities WHERE actor_id = e.created_by_actor),
      e.created_at, e.name, e.address, e.city, e.department, e.latitude, e.longitude,
      e.geo_precision, e.start_date, e.end_date, e.tags, e.image_url, e.registration_deadline,
      e.registration_note, e.registration_url, e.contact_email, e.external_url, e.description);
  END IF;

  UPDATE events SET name = trim(n.name), address = n.address, city = trim(n.city),
    department = trim(n.department), latitude = n.latitude, longitude = n.longitude,
    geo_precision = n.geo_precision, start_date = n.start_date, end_date = n.end_date,
    tags = n.tags, image_url = n.image_url, registration_deadline = n.registration_deadline,
    registration_note = n.registration_note, registration_url = n.registration_url,
    contact_email = n.contact_email, external_url = n.external_url, description = n.description,
    acted_by_user_id = me
  WHERE id = p_event;

  SELECT actor_id INTO entity FROM entities WHERE actor_id = p_as_entity AND can_act_as(p_as_entity);
  INSERT INTO event_versions (event_id, author_user, author_entity, note, name, address, city,
    department, latitude, longitude, geo_precision, start_date, end_date, tags, image_url,
    registration_deadline, registration_note, registration_url, contact_email, external_url,
    description)
  SELECT id, me, entity, nullif(trim(p_note), ''), name, address, city, department, latitude,
    longitude, geo_precision, start_date, end_date, tags, image_url, registration_deadline,
    registration_note, registration_url, contact_email, external_url, description
  FROM events WHERE id = p_event
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

CREATE FUNCTION public.revenir_a_version_evenement(p_version bigint) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v event_versions%ROWTYPE; latest bigint;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Réservé aux admins.'; END IF;
  SELECT * INTO v FROM event_versions WHERE id = p_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cette version n''existe plus.'; END IF;
  SELECT max(id) INTO latest FROM event_versions WHERE event_id = v.event_id;
  RETURN modifier_evenement(v.event_id,
    to_jsonb(v) - ARRAY['id','event_id','author_user','author_entity','created_at','note'],
    latest, 'Retour à la version du ' || to_char(v.created_at, 'DD/MM/YYYY'), NULL);
END; $$;

CREATE FUNCTION public.histoire_evenement(p_event uuid)
RETURNS TABLE(id bigint, created_at timestamptz, author_name text, author_brand text,
  author_avatar text, note text, changed text[], is_origin boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH snap AS (
    SELECT v.id, v.created_at, v.author_user, v.author_entity, v.note,
           to_jsonb(v) - ARRAY['id','event_id','author_user','author_entity','created_at','note'] AS fields
      FROM event_versions v WHERE v.event_id = p_event AND _evenement_lisible(p_event)
  ), seq AS (
    SELECT s.*, lag(s.fields) OVER (ORDER BY s.id) AS before FROM snap s
  )
  SELECT seq.id, seq.created_at, u.display_name, en.brand_name, u.avatar_url, seq.note,
         CASE WHEN seq.before IS NULL THEN ARRAY[]::text[]
              ELSE ARRAY(SELECT f.key FROM jsonb_each(seq.fields) f
                          WHERE f.value IS DISTINCT FROM seq.before -> f.key ORDER BY f.key) END,
         seq.before IS NULL
    FROM seq
    LEFT JOIN users u ON u.actor_id = seq.author_user
    LEFT JOIN entities en ON en.actor_id = seq.author_entity
  UNION ALL
  -- Jamais modifiée : la fiche d'origine, sans version écrite.
  SELECT NULL::bigint, e.created_at, u.display_name, en.brand_name, u.avatar_url, NULL,
         ARRAY[]::text[], true
    FROM events e
    LEFT JOIN users u ON u.actor_id IN (e.acted_by_user_id, e.created_by_actor)
    LEFT JOIN entities en ON en.actor_id = e.created_by_actor
   WHERE e.id = p_event AND _evenement_lisible(p_event)
     AND NOT EXISTS (SELECT 1 FROM event_versions v WHERE v.event_id = p_event)
  ORDER BY 1 DESC NULLS LAST;
$$;

CREATE FUNCTION public.version_evenement(p_version bigint)
RETURNS TABLE(field text, before jsonb, after jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH cur AS (
    SELECT v.event_id, v.id,
           to_jsonb(v) - ARRAY['id','event_id','author_user','author_entity','created_at','note'] AS fields
      FROM event_versions v WHERE v.id = p_version AND _evenement_lisible(v.event_id)
  ), prev AS (
    SELECT to_jsonb(p) - ARRAY['id','event_id','author_user','author_entity','created_at','note'] AS fields
      FROM event_versions p, cur WHERE p.event_id = cur.event_id AND p.id < cur.id
     ORDER BY p.id DESC LIMIT 1
  )
  SELECT f.key, (SELECT prev.fields -> f.key FROM prev), f.value
    FROM cur, jsonb_each(cur.fields) f
   WHERE f.value IS DISTINCT FROM (SELECT prev.fields -> f.key FROM prev)
   ORDER BY f.key;
$$;

REVOKE ALL ON FUNCTION public._evenement_lisible(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.modifier_evenement(uuid, jsonb, bigint, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revenir_a_version_evenement(bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.histoire_evenement(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.version_evenement(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.modifier_evenement(uuid, jsonb, bigint, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revenir_a_version_evenement(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.histoire_evenement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.version_evenement(bigint) TO authenticated;
```

La fermeture de la mise à jour directe n'est PAS dans cette migration : elle couperait l'édition de
la V1 dès aujourd'hui. Elle a sa propre migration, appliquée le jour du déploiement (Task 10).

Note : la version d'origine synthétique (fiche jamais modifiée) n'a pas d'id : elle n'ouvre pas de page de version.

- [ ] **Step 3: Appliquer et régénérer les types**

```bash
cd /c/Users/uriel/Desktop/DEVs/fellowship && export SUPABASE_DB_PASSWORD=$(grep '^SUPABASE_DB_PASSWORD=' .env | cut -d= -f2- | tr -d '"')
echo y | node_modules/supabase/bin/supabase.exe db push --linked
node_modules/supabase/bin/supabase.exe gen types typescript --linked --schema public > "$TEMP/types.ts"
cp "$TEMP/types.ts" apps/web-v2/src/types/supabase.ts && cd apps/web-v2 && pnpm exec prettier --ignore-path=nonexistent --write src/types/supabase.ts && git diff --stat src/types/supabase.ts
```
Expected : `Finished supabase db push.` ; le diff des types n'ajoute que `event_versions` et les quatre fonctions (`_evenement_lisible` comprise).

- [ ] **Step 4: Essayer la porte d'écriture en base** — script jetable (compte festivalier sans enseigne + compte exposant, une fiche **privée** créée par l'exposant, plus une fiche publique créée puis effacée par le même compte, jamais une vraie fiche). Sur le modèle de `e2e-10b.mjs` (clés lues dans `.env`, jamais affichées) ; il vérifie, et affiche une ligne `ok`/`ÉCHEC` par cas :
  1. `histoire_evenement` d'une fiche jamais modifiée → une ligne, `id` null, `is_origin` true, `author_name` = prénom du créateur ;
  2. le festivalier modifie la fiche **publique** de test (`{description: '<p>Un</p>'}`, version attendue null) → un id ; l'histoire a 2 lignes (origine puis la sienne), `changed` = `{description}` ;
  3. même appel avec la version attendue null → exception « … vient de modifier la fiche » ;
  4. même valeur avec la bonne version → « Rien n'a changé. » ;
  5. le festivalier sur la fiche **privée** → « Seul son créateur modifie une fiche privée. » ; `histoire_evenement` de la privée par le festivalier → 0 ligne ;
  7. `revenir_a_version_evenement` par le festivalier → « Réservé aux admins. » ;
  8. `version_evenement(id du cas 2)` → une ligne `description`, `before` = l'ancienne, `after` = `"<p>Un</p>"` ;
  9. `{nom_inconnu: 1}` → « Ce champ ne se modifie pas ici. ».
  (Le cas « mise à jour directe refusée » se vérifie en Task 10, avec sa migration.)
  Puis efface les deux fiches de test (service role) et les deux comptes (`delete-account`), et vérifie qu'il ne reste rien.
Expected : 8 `ok`, nettoyage complet.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261012120000_event_versions.sql apps/web-v2/src/types/supabase.ts
git commit -m "feat(db): l'histoire d'une fiche — versions et porte d'écriture unique"
```

---

### Task 2: Le texte d'une description — HTML ↔ texte

**Files:**
- Modify: `apps/web-v2/src/lib/rich-text.ts`, `apps/web-v2/src/features/event-create/CreateEvent.tsx`
- Test: `apps/web-v2/src/lib/rich-text.test.ts` (créer s'il n'existe pas)

**Interfaces:**
- Produces: `htmlToText(html: string | null): string` ; `textToHtml(text: string): string | null`.

Pourquoi : la fiche rend la description en HTML (`RichText`) ; un texte brut tapé dans la création (10b) perdait ses retours à la ligne. La modification édite du texte : paragraphes séparés par une ligne vide, puces « • ». Le gras se perd seulement si on modifie la description.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest'
import { htmlToText, textToHtml } from './rich-text'

describe('htmlToText', () => {
  test('les paragraphes deviennent des lignes vides, les puces des « • »', () => {
    expect(htmlToText('<p>Un <strong>village</strong> pirate.</p><ul><li>Viking</li><li>Médiéval</li></ul><p>Fin</p>')).toBe(
      'Un village pirate.\n\n• Viking\n• Médiéval\n\nFin',
    )
  })
  test('un retour à la ligne et les entités', () => {
    expect(htmlToText('<p>Ligne 1<br>Ligne 2 &amp; co</p>')).toBe('Ligne 1\nLigne 2 & co')
  })
  test('un texte brut reste tel quel ; rien donne rien', () => {
    expect(htmlToText('Déjà du texte')).toBe('Déjà du texte')
    expect(htmlToText(null)).toBe('')
  })
})

describe('textToHtml', () => {
  test('un paragraphe par bloc, un retour à la ligne par ligne, le HTML échappé', () => {
    expect(textToHtml('Un <b>\nDeux\n\nTrois')).toBe('<p>Un &lt;b&gt;<br>Deux</p><p>Trois</p>')
  })
  test('vide donne null', () => {
    expect(textToHtml('  \n ')).toBeNull()
  })
  test('aller-retour stable', () => {
    const text = 'Un\n\n• Viking\n• Médiéval'
    expect(htmlToText(textToHtml(text))).toBe(text)
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — `cd apps/web-v2 && pnpm exec vitest run src/lib/rich-text.test.ts` → FAIL (`htmlToText` n'existe pas).

- [ ] **Step 3: Implement** (dans `rich-text.ts`, sous `isRichTextEmpty`) :

```ts
/** Le texte d'une description, pour la modifier : paragraphes séparés d'une ligne vide, puces « • ». */
export function htmlToText(html: string | null): string {
  if (!html) return ''
  if (!/<[a-z]/i.test(html)) return html.trim()
  const doc = new DOMParser().parseFromString(cleanRichText(html), 'text/html')
  const blocks: string[] = []
  for (const node of Array.from(doc.body.childNodes)) {
    if (node instanceof HTMLUListElement || node instanceof HTMLOListElement) {
      blocks.push(Array.from(node.children).map((item) => `• ${item.textContent.trim()}`).join('\n'))
    } else if (node instanceof HTMLElement) {
      node.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
      blocks.push(node.textContent.trim())
    } else if (node.textContent?.trim()) {
      blocks.push(node.textContent.trim())
    }
  }
  return blocks.filter(Boolean).join('\n\n')
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Un texte tapé, rendu en HTML pour la fiche : un paragraphe par bloc, un retour par ligne. */
export function textToHtml(text: string): string | null {
  const blocks = text.trim().split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)
  if (blocks.length === 0) return null
  return blocks.map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`).join('')
}
```
(Si TypeScript rend `textContent` nullable selon la lib DOM, écrire `(item.textContent ?? '')`.)

- [ ] **Step 4: Run test** → PASS.
- [ ] **Step 5: La création aussi** — `CreateEvent.tsx`, dans l'insertion : `description: textToHtml(draft.description),` à la place de `draft.description.trim() || null` (import depuis `@/lib/rich-text`).
- [ ] **Step 6: Lint, test, commit** — `pnpm --filter web-v2 lint && pnpm --filter web-v2 exec vitest run` ; `git commit -m "feat(v2): la description d'une fiche, du HTML au texte et retour"`.

---

### Task 3: La fiche ↔ le formulaire (pur)

**Files:**
- Create: `apps/web-v2/src/lib/event-edit.ts`, `apps/web-v2/src/lib/event-edit.test.ts`

**Interfaces:**
- Consumes: `EventDraft` (`features/event-create/useEventDraft.ts`), `htmlToText`, `textToHtml` (Task 2), `EventRow` (`@/types/database`).
- Produces:
  - `type EditableField = 'name' | 'address' | 'city' | 'department' | 'latitude' | 'longitude' | 'geo_precision' | 'start_date' | 'end_date' | 'tags' | 'image_url' | 'registration_deadline' | 'registration_note' | 'registration_url' | 'contact_email' | 'external_url' | 'description'`
  - `eventToDraft(event: EventRow): EventDraft`
  - `changedFields(event: EventRow, draft: EventDraft): Partial<Record<EditableField, unknown>>` — seulement ce qui change ; chaînes vides → `null` ; description comparée en texte, envoyée en HTML.
  - `type MissingField = 'registration_deadline' | 'registration_note' | 'registration_url' | 'contact_email' | 'external_url' | 'description'`
  - `missingFields(event: EventRow): MissingField[]` (dans cet ordre)
  - `MISSING_LABELS: Record<MissingField, string>` — `Date limite`, `Comment candidater`, `Lien d'inscription`, `E-mail de contact`, `Site de l'événement`, `Description`.
  - `canEditEvent(event: Pick<EventRow, 'is_private' | 'created_by_actor'>, myActorIds: string[]): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest'
import type { EventRow } from '@/types/database'
import { canEditEvent, changedFields, eventToDraft, missingFields } from './event-edit'

const row = {
  id: 'e1', name: 'Les Aventuriales', address: 'Salle polyvalente', city: 'Ménétrol', department: '63',
  latitude: 45.86, longitude: 3.12, geo_precision: 'precise', start_date: '2026-09-25',
  end_date: '2026-09-27', tags: ['Fantastique', 'Marché'], image_url: 'https://x/a.webp',
  registration_deadline: null, registration_note: 'Dossier par e-mail', registration_url: null,
  contact_email: 'a@b.fr', external_url: null,
  description: '<p>Un <strong>village</strong> pirate.</p><ul><li>Viking</li></ul>',
  is_private: false, created_by_actor: 'u1',
} as unknown as EventRow
```
(Ce `as unknown as` est réservé au test, sur une ligne commentée `// eslint-disable-next-line -- une fiche partielle suffit au test` ; si le lint le refuse, construire l'objet complet avec toutes les colonnes de `EventRow` à `null`.)

```ts
describe('eventToDraft', () => {
  test('la fiche devient le formulaire, la description en texte', () => {
    const draft = eventToDraft(row)
    expect(draft.name).toBe('Les Aventuriales')
    expect(draft.registrationDeadline).toBe('')
    expect(draft.description).toBe('Un village pirate.\n\n• Viking')
    expect(draft.geoPrecision).toBe('precise')
  })
})

describe('changedFields', () => {
  test('une fiche ouverte puis enregistrée sans rien toucher ne change rien (description HTML comprise)', () => {
    expect(changedFields(row, eventToDraft(row))).toEqual({})
  })
  test('seulement ce qui change, vide devient null, la description repart en HTML', () => {
    const draft = { ...eventToDraft(row), registrationDeadline: '2026-08-15', contactEmail: '  ', description: 'Neuf' }
    expect(changedFields(row, draft)).toEqual({
      registration_deadline: '2026-08-15',
      contact_email: null,
      description: '<p>Neuf</p>',
    })
  })
  test('une adresse changée envoie aussi sa position', () => {
    const draft = { ...eventToDraft(row), address: 'Place de Jaude', latitude: null, longitude: null, geoPrecision: '' as const }
    expect(changedFields(row, draft)).toEqual({ address: 'Place de Jaude', latitude: null, longitude: null, geo_precision: null })
  })
  test('les catégories comparées dans l’ordre (la première est la principale)', () => {
    const draft = { ...eventToDraft(row), tags: ['Marché', 'Fantastique'] }
    expect(changedFields(row, draft)).toEqual({ tags: ['Marché', 'Fantastique'] })
  })
})

describe('missingFields', () => {
  test('ce qui manque, dans l’ordre de la fiche', () => {
    expect(missingFields(row)).toEqual(['registration_deadline', 'registration_url', 'external_url'])
  })
  test('une description vide compte comme manquante', () => {
    expect(missingFields({ ...row, description: '<p> </p>' })).toContain('description')
  })
})

describe('canEditEvent', () => {
  test('publique : tout compte connecté ; privée : son créateur ; personne sans compte', () => {
    expect(canEditEvent({ is_private: false, created_by_actor: 'u1' }, ['u9'])).toBe(true)
    expect(canEditEvent({ is_private: true, created_by_actor: 'u1' }, ['u9', 'ent9'])).toBe(false)
    expect(canEditEvent({ is_private: true, created_by_actor: 'ent1' }, ['u1', 'ent1'])).toBe(true)
    expect(canEditEvent({ is_private: false, created_by_actor: 'u1' }, [])).toBe(false)
  })
})
```

- [ ] **Step 2: Run** → FAIL (module absent).
- [ ] **Step 3: Implement** `lib/event-edit.ts` (en-tête QUOI/POURQUOI) :

```ts
import type { EventDraft } from '@/features/event-create/useEventDraft'
import { htmlToText, isRichTextEmpty, textToHtml } from '@/lib/rich-text'
import type { EventRow } from '@/types/database'

export type EditableField = 'name' | 'address' | 'city' | 'department' | 'latitude' | 'longitude'
  | 'geo_precision' | 'start_date' | 'end_date' | 'tags' | 'image_url' | 'registration_deadline'
  | 'registration_note' | 'registration_url' | 'contact_email' | 'external_url' | 'description'

export function eventToDraft(event: EventRow): EventDraft {
  return {
    name: event.name, isPrivate: event.is_private, address: event.address ?? '', city: event.city,
    department: event.department, startDate: event.start_date, endDate: event.end_date,
    tags: event.tags ?? [], description: htmlToText(event.description),
    registrationDeadline: event.registration_deadline ?? '', registrationUrl: event.registration_url ?? '',
    externalUrl: event.external_url ?? '', contactEmail: event.contact_email ?? '',
    registrationNote: event.registration_note ?? '', previousEditionId: '',
    latitude: event.latitude, longitude: event.longitude,
    geoPrecision: event.geo_precision === 'precise' || event.geo_precision === 'city' ? event.geo_precision : '',
  }
}

const text = (value: string) => value.trim() || null

/** Ce que le formulaire envoie pour chaque champ, comparable à la fiche. */
function sent(draft: EventDraft): Record<Exclude<EditableField, 'image_url' | 'description'>, unknown> {
  return {
    name: draft.name.trim(), address: text(draft.address), city: draft.city.trim(),
    department: draft.department.trim(), latitude: draft.latitude, longitude: draft.longitude,
    geo_precision: draft.geoPrecision || null, start_date: draft.startDate,
    end_date: draft.endDate || draft.startDate, tags: draft.tags,
    registration_deadline: draft.registrationDeadline || null,
    registration_note: text(draft.registrationNote), registration_url: text(draft.registrationUrl),
    contact_email: text(draft.contactEmail), external_url: text(draft.externalUrl),
  }
}

export function changedFields(event: EventRow, draft: EventDraft): Partial<Record<EditableField, unknown>> {
  const before = sent(eventToDraft(event))
  const after = sent(draft)
  const changes: Partial<Record<EditableField, unknown>> = {}
  for (const key of Object.keys(after) as (keyof typeof after)[]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changes[key] = after[key]
  }
  if (draft.description.trim() !== htmlToText(event.description)) {
    changes.description = textToHtml(draft.description)
  }
  return changes
}
```
Puis `MissingField`, `MISSING_LABELS`, `missingFields` (vide = `null`/`''` ; description par `isRichTextEmpty`) et :

```ts
export function canEditEvent(event: Pick<EventRow, 'is_private' | 'created_by_actor'>, myActorIds: string[]): boolean {
  if (myActorIds.length === 0) return false
  return !event.is_private || (event.created_by_actor !== null && myActorIds.includes(event.created_by_actor))
}
```
- [ ] **Step 4: Run** → PASS (les 8 tests).
- [ ] **Step 5: Commit** — lint, `git commit -m "feat(v2): la fiche et son formulaire de modification"`.

---

### Task 4: L'histoire, en pur

**Files:**
- Create: `apps/web-v2/src/lib/event-history.ts`, `apps/web-v2/src/lib/event-history.test.ts`
- Modify: `apps/web-v2/package.json` (`pnpm --filter web-v2 add diff`)

**Interfaces:**
- Consumes: `htmlToText` (Task 2), `formatFullDate`, `parseSqlDate`, `formatDayMonth` (`lib/dates.ts`).
- Produces:
  - `versionSentence(changed: string[], isOrigin: boolean): string`
  - `authorName(name: string | null, brand: string | null): string` — « Lina de L'Atelier Sauvage », « Lina », « Un compte supprimé ».
  - `versionTitle(createdAt: Date): string` — « La version du 9 octobre ».
  - `type ChangeBlock = { field: string; label: string; kind: 'short'; before: string | null; after: string | null } | { field: string; label: string; kind: 'text'; parts: { text: string; added: boolean; removed: boolean }[] }`
  - `changeBlocks(rows: { field: string; before: unknown; after: unknown }[]): ChangeBlock[]`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest'
import { authorName, changeBlocks, versionSentence, versionTitle } from './event-history'

describe('versionSentence', () => {
  test('origine, un champ, deux, plusieurs ; les dates comptent une fois ; la position ne se dit pas', () => {
    expect(versionSentence([], true)).toBe('a ajouté l’événement')
    expect(versionSentence(['image_url'], false)).toBe('a changé l’affiche')
    expect(versionSentence(['registration_deadline', 'registration_note'], false)).toBe('a changé la date limite et « Comment candidater »')
    expect(versionSentence(['address', 'end_date', 'latitude', 'start_date'], false)).toBe('a changé l’adresse et les dates')
    expect(versionSentence(['name', 'city', 'tags'], false)).toBe('a changé le nom, la ville et les catégories')
    expect(versionSentence(['latitude', 'longitude'], false)).toBe('a modifié la fiche')
  })
})

describe('authorName', () => {
  test('prénom et enseigne, prénom seul, compte supprimé', () => {
    expect(authorName('Lina', 'L’Atelier Sauvage')).toBe('Lina de L’Atelier Sauvage')
    expect(authorName('Lina', null)).toBe('Lina')
    expect(authorName(null, null)).toBe('Un compte supprimé')
  })
})

test('versionTitle', () => {
  expect(versionTitle(new Date(2026, 9, 9, 14))).toBe('La version du 9 octobre')
})

describe('changeBlocks', () => {
  test('un champ court : avant → après, une date en toutes lettres', () => {
    expect(changeBlocks([{ field: 'registration_deadline', before: null, after: '2026-08-15' }])).toEqual([
      { field: 'registration_deadline', label: 'Date limite d’inscription', kind: 'short', before: null, after: '15 août 2026' },
    ])
  })
  test('les catégories en liste, la position cachée', () => {
    const blocks = changeBlocks([
      { field: 'tags', before: ['Marché'], after: ['Marché', 'Musique'] },
      { field: 'latitude', before: 1, after: 2 },
    ])
    expect(blocks).toEqual([{ field: 'tags', label: 'Catégories', kind: 'short', before: 'Marché', after: 'Marché, Musique' }])
  })
  test('la description mot à mot, du HTML lu en texte', () => {
    const [block] = changeBlocks([{ field: 'description', before: '<p>Un village viking</p>', after: '<p>Un village pirate</p>' }])
    expect(block).toMatchObject({ kind: 'text', label: 'Description' })
    if (block?.kind !== 'text') throw new Error('attendu : un texte')
    expect(block.parts.filter((p) => p.removed).map((p) => p.text.trim())).toEqual(['viking'])
    expect(block.parts.filter((p) => p.added).map((p) => p.text.trim())).toEqual(['pirate'])
  })
})
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `lib/event-history.ts` :
  - libellés de phrase : `name` le nom, `address` l'adresse, `city` la ville, `department` le département, `start_date`/`end_date` les dates (une fois), `tags` les catégories, `image_url` l'affiche, `registration_deadline` la date limite, `registration_note` « Comment candidater », `registration_url` le lien d'inscription, `contact_email` l'e-mail de contact, `external_url` le site, `description` la description ; `latitude`, `longitude`, `geo_precision` ignorés ; ordre = l'ordre de la fiche (celui de cette liste), jointure « a, b et c » ;
  - libellés de bloc : Nom, Adresse ou lieu, Ville, Département, Début, Fin, Catégories, Affiche, Date limite d'inscription, Comment candidater, Lien d'inscription, E-mail de contact, Site de l'événement, Description ;
  - valeurs courtes : dates par `formatFullDate(parseSqlDate(v))`, tableaux joints par « , », affiche → « une affiche » / null, chaîne vide → null ;
  - `description` et `registration_note` en `kind: 'text'` : `diffWords(htmlToText(before ?? ''), htmlToText(after ?? ''))` de `diff`, chaque partie `{ text: value, added: Boolean(added), removed: Boolean(removed) }` ;
  - `versionTitle` : `La version du ${formatDayMonth(date)}` (vérifier que `formatDayMonth` rend « 9 octobre » ; sinon `date.getDate()` + `monthName(date)`).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — lint, `git commit -m "feat(v2): la phrase et la comparaison d'une version de fiche"`.

---

### Task 5: Les champs partagés entre création et modification

**Files:**
- Create: `apps/web-v2/src/features/event-create/PlaceFields.tsx`, `ApplyFields.tsx`
- Modify: `apps/web-v2/src/features/event-create/Steps.tsx`, `README.md`

**Interfaces:**
- Produces:
  - `PlaceFields({ draft, update, patch, highlight? }: { draft: EventDraft; update: UpdateFn; patch: (fields: Partial<EventDraft>) => void; highlight?: string })` — Adresse ou lieu (`AddressField`), Ville, Département, Début, Fin, `BeyondHorizon` reste dans `StepPlace`.
  - `ApplyFields({ draft, update, highlight? })` — Date limite d'inscription, Comment candidater, Lien d'inscription, E-mail de contact, Site de l'événement, dans l'ordre de la maquette `2117:2`.
  - `type UpdateFn` exporté de `Steps.tsx` vers `PlaceFields.tsx` (déplacé là, ré-exporté).
  - `highlight` : la clé `MissingField` (Task 3) ; le champ concerné est enveloppé dans `<div className="field-missing" ref=…>` avec l'icône `Sparkles` et « Il manquait cette info — merci de compléter la fiche pour tous », défile dans la vue et prend le focus au montage.

- [ ] **Step 1:** Déplacer sans changer le rendu : `StepPlace` = titre + `PlaceFields` + `BeyondHorizon` ; `StepDetails` = titre + affiche + Description + `ApplyFields`. Mettre à jour le README du dossier (« `PlaceFields`, `ApplyFields` : aussi utilisés par `features/event-edit/` »).
- [ ] **Step 2:** `pnpm --filter web-v2 lint && pnpm --filter web-v2 exec tsc -b && pnpm --filter web-v2 exec vitest run` → tout vert, aucune régression.
- [ ] **Step 3: Commit** — `git commit -m "refactor(v2): les champs du lieu et de la candidature, partagés"`.

---

### Task 6: La page de modification

**Files:**
- Create: `apps/web-v2/src/features/event-edit/README.md`, `useEditEvent.ts`, `EditEvent.tsx`, `EditSections.tsx`, `EditPreview.tsx`, `TagPicker.tsx`
- Create: `apps/web-v2/src/styles/3-components/event-edit.css`; Modify `styles/index.css`, `styles/2-semantic.css`
- Modify: `apps/web-v2/src/App.tsx`

**Interfaces:**
- Consumes: `eventToDraft`, `changedFields`, `canEditEvent`, `MissingField` (Task 3) ; `PlaceFields`, `ApplyFields` (Task 5) ; `placeTyped`, `addressTyped`, `placePicked` (`useEventDraft.ts`) ; `resizeImage`, `imageProblem` (`lib/image-resize.ts`) ; `locateCity` (`lib/geocode.ts`) ; `useTags` (`features/event-create/useTags.ts`) ; RPC `histoire_evenement`, `modifier_evenement` (Task 1).
- Produces:
  - route `/evenement/:id/modifier` (`ProtectedRoute` + `AppShell bare`) ; `?champ=<MissingField>`.
  - `useEditEvent(id: string)` → `{ event: EventRow | null; draft: EventDraft; update; patch; toggleTag; poster: File | null | 'removed'; setPoster; note: string; setNote; save: () => Promise<boolean>; saving: boolean; error: string | null; loading: boolean; latestVersion: number | null; canEdit: boolean }`.

- [ ] **Step 1: Le chargement** — `useEditEvent` suit le patron des hooks de données (`v2.md` : une fonction async rend l'état, l'effet l'applique une fois, `must()` sur les erreurs) : `events.select('*').eq('id', id).maybeSingle()` puis `rpc('histoire_evenement', { p_event: id })` ; `latestVersion` = `id` de la première ligne (null pour l'origine synthétique) ; `canEdit` = `canEditEvent(event, [person.actor_id, ...entities.map(e => e.actor_id)])`. Le brouillon est en état local (`useState(eventToDraft(event))` une fois chargé), jamais dans le navigateur.
- [ ] **Step 2: L'enregistrement** — `save()` :
  1. `blocked = firstBlockedStep(draft)` hors étape catégories pour une fiche privée (même règle que la création) → `error` = la raison, `false` ;
  2. affiche : `File` → `imageProblem` puis `resizeImage(file, 1200)` puis envoi dans `event-images` (`${crypto.randomUUID()}.webp|jpg`) ; `'removed'` → `image_url: null` ;
  3. position : si `draft.geoPrecision === ''` et que l'adresse, la ville ou le département ont changé → `locateCity` ; trouvée → `latitude/longitude/geoPrecision: 'city'` ;
  4. `fields = changedFields(event, draft)` (+ `image_url`) ; vide → `error` « Rien n'a changé. », `false` ;
  5. `rpc('modifier_evenement', { p_event, p_fields: fields, p_expected_version: latestVersion, p_note: note.trim() || null, p_as_entity: actor.kind === 'entity' ? actor.id : null })` ; erreur → `error` = `error.message` (le message de la base est déjà en français), `false` ; sinon `true`.
- [ ] **Step 3: L'écran** (`EditEvent.tsx`, maquette `2117:2`) : barre d'actions en haut à droite (« Annuler » → `navigate(-1)` ou la fiche ; « Enregistrer les modifications » → `save()` puis `go('/evenement/{id}')`) ; « ‹ {nom} », titre serif « Modifier l'événement », la ligne `KeptUpToDate` (Task 8 — en attendant, la ligne texte « Tenu à jour par les exposants ») ; `EditSections` : L'événement (Nom), Où et quand (`PlaceFields`), Catégories (`TagPicker` : pastilles « × », « + Ajouter » qui déroule la liste de `useTags`, la première = principale), Affiche (vignette 72×100, nom du fichier, « Remplacer », « Retirer »), Pour candidater (`ApplyFields`), À propos (Description, `Textarea`), « Un mot sur ta modification » (`Input`, `maxLength={140}`, la phrase « Facultatif… ») ; l'erreur au-dessus du bouton ; `?champ=` passé en `highlight`. Une fiche que l'on ne peut pas modifier → « Seul son créateur modifie une fiche privée. » et le lien vers la fiche.
- [ ] **Step 4: L'aperçu** (`EditPreview.tsx`) : « ● Aperçu en direct », la fiche en miniature (affiche 210 de haut, nom serif, dates · lieu, catégories en couleurs, deux cartes Date / Lieu, « Pour candidater » avec ses lignes, « À propos » en trois lignes), « Tes modifications sont visibles de tous les exposants dès l'enregistrement. » Relever la maquette (`get_design_context` sur `2119:2` et `2117:201`) avant d'écrire le CSS ; jetons dans `2-semantic.css`.
- [ ] **Step 5: Route** — `App.tsx` : `/evenement/:id/modifier` avant `/evenement/:id` n'est pas nécessaire (segments fixes), mais garder les routes de la fiche groupées.
- [ ] **Step 6: Lint, tsc, test, build, commit** — `git commit -m "feat(v2): la page de modification d'une fiche"`.

---

### Task 7: L'histoire de la fiche

**Files:**
- Create: `apps/web-v2/src/features/event-history/README.md`, `useEventHistory.ts`, `HistoryPage.tsx`, `VersionPage.tsx`
- Create: `apps/web-v2/src/styles/3-components/event-history.css`; Modify `styles/index.css`, `2-semantic.css`
- Modify: `apps/web-v2/src/App.tsx`

**Interfaces:**
- Consumes: `versionSentence`, `authorName`, `versionTitle`, `changeBlocks` (Task 4) ; RPC `histoire_evenement`, `version_evenement`, `revenir_a_version_evenement` (Task 1) ; `Avatar` (`components/ui/Avatar` s'il existe, sinon le composant d'avatar déjà utilisé par `Companions`).
- Produces:
  - `type HistoryEntry = { id: number | null; createdAt: Date; author: string; avatarUrl: string | null; note: string | null; sentence: string }`
  - `useEventHistory(eventId: string)` → `{ entries: HistoryEntry[]; eventName: string; loading: boolean; error: string | null }` (réutilisé par la fiche en Task 8).
  - routes `/evenement/:id/historique` et `/evenement/:id/historique/:version`.

- [ ] **Step 1:** `useEventHistory` — `rpc('histoire_evenement')` + le nom de la fiche ; erreur ≠ liste vide (`v2.md`).
- [ ] **Step 2:** `HistoryPage` (maquette `2253:2`) : « ‹ {nom} » vers la fiche, titre, « Tenue à jour par les exposants. Chaque version est gardée : rien ne se perd. », la carte des versions (photo 36, « **{auteur}** {phrase} », date — `timeAgo` sous 7 jours, sinon `formatDayMonth` — et « « {mot} » »), « Actuelle » en vert validé (`--status-validated-*`) sur la première, « Voir › » sur les autres qui ont un id ; la phrase de pied.
- [ ] **Step 3:** `VersionPage` (maquette `2253:299`) : « ‹ L'histoire de la fiche », `versionTitle`, l'auteur avec sa photo et la date, le mot dans sa pastille, la carte des blocs (`short` : « vide » si null → la valeur soulignée en vert ; `text` : `<ins>` souligné vert pour l'ajouté, `<del>` barré pâle pour le retiré), la légende ; pour un admin (`person.role === 'admin'`) et une version qui n'est pas la plus récente : « Revenir à cette version » → `rpc('revenir_a_version_evenement')` puis retour à l'histoire, avec « Réservé aux admins. Revenir crée une nouvelle version : rien ne se perd. ». Relever les deux maquettes (`get_design_context`) avant le CSS.
- [ ] **Step 4:** Routes (`ProtectedRoute` + `AppShell`), lint, tsc, test, build, commit — `git commit -m "feat(v2): l'histoire d'une fiche, version après version"`.

---

### Task 8: La fiche — « Modifier la fiche », « Tenu à jour », les infos manquantes

**Files:**
- Create: `apps/web-v2/src/features/event/KeptUpToDate.tsx`
- Modify: `apps/web-v2/src/features/event/EventPage.tsx`, `Applying.tsx`, `apps/web-v2/src/components/ui/InfoRows.tsx`, `styles/3-components/event-page.css`, `info-rows.css`, `2-semantic.css`

**Interfaces:**
- Consumes: `useEventHistory` (Task 7), `canEditEvent`, `missingFields`, `MISSING_LABELS` (Task 3).
- Produces: `InfoRow` gagne `action?: ReactNode` (posé à droite de la ligne) ; `KeptUpToDate({ eventId }: { eventId: string })`.

- [ ] **Step 1:** `KeptUpToDate` — icône `History`, « Tenu à jour par les exposants · modifié par **{prénom}**, il y a {…} » (la plus récente ; « ajouté par » si c'est l'origine), lien vers `/evenement/:id/historique` ; rien tant que l'histoire charge. Le prénom seul (`authorName` coupé avant « de » n'est pas fiable) : renvoyer aussi `authorFirstName` depuis `useEventHistory` (`author_name ?? 'un compte supprimé'`).
- [ ] **Step 2:** `EventPage` : le titre et le bouton « Modifier la fiche » (crayon `Pencil`, bouton blanc bordé, maquette `2256:2`) dans une rangée, seulement si `canEdit` ; `KeptUpToDate` sous `Companions`. Garder `EventPage.tsx` sous 400 lignes (extraire l'en-tête dans `EventHeader.tsx` s'il le faut).
- [ ] **Step 3:** `Applying` reçoit `canEdit` et `onAdd(field: MissingField)` : pour chaque champ manquant parmi date limite, comment, lien, contact, site — une `InfoRow` grise « Pas encore renseigné » avec `action` = pastille pointillée « + Ajouter » → `go('/evenement/{id}/modifier?champ={field}')` ; le bloc s'affiche aussi quand rien n'est renseigné mais que `canEdit`. « À propos » vide : la phrase actuelle + « + Ajouter » (champ `description`) si `canEdit`. Le « Site de l'événement » manquant se range dans « Pour candidater » (maquette `2256:2`).
- [ ] **Step 4:** Lint, tsc, test, build, commit — `git commit -m "feat(v2): la fiche s'ouvre à la modification et dit ce qui lui manque"`.

---

### Task 9: L'essai de bout en bout (au GO d'Uriel)

**Files:** aucun dans le dépôt (script jetable dans le dossier temporaire de la session).

- [ ] **Step 1** — un compte jetable (admin le temps de l'essai, pour voir « Revenir »), connecté sur `localhost` par un jeton à usage unique, une enseigne ; une fiche **privée** « Test 10c — à effacer » créée par lui.
- [ ] **Step 2** — dans le navigateur : la fiche (bouton, ligne « ajouté par », infos manquantes) ; « + Ajouter » sur la date limite → la page s'ouvre sur le champ encadré ; modifier la date limite, la description (sur deux paragraphes) et une catégorie, un mot ; enregistrer → la fiche, la ligne « modifié par » ; l'histoire (deux lignes, « Actuelle ») ; la version (avant → après, mot à mot) ; « Revenir à cette version » sur l'origine → une troisième version ; ouvrir la page dans deux onglets, enregistrer dans l'un puis l'autre → le second refusé avec le prénom.
- [ ] **Step 3: En base** — les versions, `acted_by_user_id`, la description en `<p>`.
- [ ] **Step 4: Effacer** — la fiche (service role), son affiche si ajoutée, puis le compte (`delete-account`) ; vérifier qu'il ne reste rien (`event_versions` part avec la fiche).

---

### Task 10: Fermer la mise à jour directe — le jour du déploiement (au GO d'Uriel)

**Files:**
- Create: `supabase/migrations/20261012130000_events_update_through_versions.sql`
- Modify: `docs/v2/purge-back.md`

- [ ] **Step 1: Écrire** (relire d'abord les policies live, comme en Task 1 Step 1) :

```sql
-- POURQUOI — lot 10c : toute modification d'une fiche passe par modifier_evenement, qui garde sa
-- version (« L'histoire de la fiche »). La mise à jour directe d'events est fermée, sinon une
-- modification échapperait à l'histoire. Appliquée le jour où la V2 devient la version de tous :
-- l'édition en place de la V1 cesse de marcher, c'est assumé (Uriel, 12/10/2026).
DROP POLICY events_update_exposant ON public.events;
DROP POLICY events_write_actor ON public.events;
CREATE POLICY events_insert_actor ON public.events FOR INSERT TO authenticated
  WITH CHECK (can_act_as(created_by_actor));
CREATE POLICY events_delete_actor ON public.events FOR DELETE TO authenticated
  USING (can_act_as(created_by_actor));
```
- [ ] **Step 2: Appliquer** juste avant le déploiement de la V2 ; vérifier : `select policyname, cmd from pg_policies where tablename='events'` → `events_insert_actor INSERT`, `events_delete_actor DELETE`, `admin_delete_events`, les deux SELECT ; et, avec un compte jetable propriétaire d'une fiche privée de test, `update events set name=…` → 0 ligne, `modifier_evenement` → une version. Effacer fiche et compte.
- [ ] **Step 3: Purge et commit** — `docs/v2/purge-back.md` : « `apps/web/src/pages/EventPage.tsx` — l'édition en place (`startEditing`, `handleSaveEdit`, l'ajout d'affiche) et `updateEvent` (`hooks/use-events.ts`), `Explorer.tsx:207` (`image_url`) : morts depuis la migration 20261012130000. À retirer avec la V1. » `git commit -m "feat(db): une fiche ne se modifie plus que par sa porte d'écriture"`.

## Après les tâches

Relecture fraîche de toute la branche (modèle le plus capable), corrections Critiques et Importantes en TDD, puis, au GO d'Uriel : Task 10 (la fermeture, qui coupe l'édition de la V1) et le déploiement 2.34.0, ensemble ; docs (plan directeur : 10c ☑ ; `maquettes-2027.md` : `2117:2`, `2253:2`, `2253:299`, `2256:2` intégrés ; `_État.md`), push.
