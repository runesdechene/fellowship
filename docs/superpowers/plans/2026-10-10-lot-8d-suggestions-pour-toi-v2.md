# Lot 8d — Les suggestions « Pour toi » — plan d'exécution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fellowship propose tout seul, au Pro, des festivals proches de ceux qu'il fait — un bloc
« Pour toi » sur le tableau de bord et une notification au plus deux fois par semaine ; le gratuit
voit seulement le nombre trouvé.

**Architecture:** Une fonction SQL interne note les festivals candidats d'un acteur (univers,
zone, amis) ; `suggestions_for` la lit pour le bloc (gardée, vide pour le gratuit) et
`send_suggestions` (pg_cron, lundi et jeudi) pour la notification. Le front ajoute une logique
pure (`lib/suggestions.ts`), une phrase de cloche, une ligne de téléphone et la section du tableau
de bord.

**Tech Stack:** Postgres (Supabase, pg_cron), React 19, React Router 7, supabase-js, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-lot-8d-suggestions-pour-toi-v2-design.md`

## Global Constraints

- La base est la **production** : migrations par `node_modules/supabase/bin/supabase.exe db push --linked` (dry-run d'abord), jamais `apply_migration` ; aucune écriture de test.
- Une valeur d'énumération ajoutée vit **seule dans sa migration**.
- Toute fonction `SECURITY DEFINER` porte `SET search_path = public` ; les fonctions internes sont révoquées de `PUBLIC, anon, authenticated`.
- « Aujourd'hui » = `(now() AT TIME ZONE 'Europe/Paris')::date`.
- Pro ce jour-là = `plan = 'pro' OR comped_pro_until > now()` (entités).
- Un ami = vue `friends` (`user_id`, `friend_id`), suivi dans les deux sens ; une participation d'ami compte seulement si `visibility IN ('amis','public')`.
- Lint V2 strict (`pnpm --filter web-v2 lint`) : 400 lignes max, en-têtes QUOI/POURQUOI, README par dossier, aucune valeur brute en couche 3 du CSS, pas de style dans les `.tsx`.
- Dates par `lib/dates.ts` ; textes en français, apostrophe typographique `’`.
- Après tout changement de `dates.ts`, `notifications.ts`, `push-lines.ts` ou `suggestions.ts` (prettier compris) : `node apps/web-v2/scripts/sync-push-phrases.mjs`.
- Copie de la maquette : titre « Pour toi » ; sous-titre « Des festivals proches de ceux que tu fais, trouvés par Fellowship » ; « Pas pour moi » ; « J’ai trouvé {n} festivals faits pour toi » / « J’ai trouvé 1 festival fait pour toi » ; « Proches de ceux que tu fais, dans ta zone. Le Pro te les montre, et te prévient quand il en trouve un nouveau. » ; « Découvrir le Pro ».
- Déploiements (fonction `send-push`, V2) : seulement avec le GO d'Uriel.

## Review Focus

- **Un acteur étranger** : `suggestions_for` appelée avec l'id d'une enseigne dont on n'est pas membre doit lever une erreur, jamais rendre de données (Task 1, vérification à blanc).
- **Le gratuit qui lit le réseau** : la réponse ne contient aucun nom de festival (`items` vide) (Task 1, vérification).
- **Une participation privée d'un ami** ne doit ni créer de suggestion, ni nommer l'ami (Task 1, vérification).
- **Un nom de festival commençant par « Les », « Le », « La », « L’ » ou une voyelle** : la raison reste du bon français (Task 2, tests de `withDe`).
- **Une réponse mal formée** (raison inconnue, champ manquant) : la carte est ignorée, le bloc ne casse pas (Task 2, tests de `readSuggestions`).

---

### Task 1: La base — table, type, calcul, notification planifiée

**Files:**
- Create: `supabase/migrations/20261010150000_notification_type_suggestion.sql`
- Create: `supabase/migrations/20261010150100_suggestions.sql`
- Modify: `apps/web-v2/src/types/supabase.ts` (régénéré)

**Interfaces:**
- Produces: RPC `suggestions_for(p_actor uuid) → jsonb` `{ count: int, items: [{ event_id, name, city, start_date, end_date, image_url, reason }] }` ; `reason` ∈ `{kind:'friends', friend_name, others}` · `{kind:'similar', ref_name}` · `{kind:'near'}`. Table `suggestion_dismissals(actor_id, event_id, created_at)`. Notification `type = 'suggestion'`, `data = { event_id, event_name, city, start_date, end_date, reason }`. Valeur `suggestions` acceptée dans `users.push_muted`.

- [ ] **Step 1: La migration du type**

```sql
-- POURQUOI : lot 8d (10/10/2026). Les suggestions « Pour toi » prennent leur propre type de
-- notification. Seule dans sa migration : une valeur d'énumération ajoutée ne s'utilise pas
-- dans la transaction qui l'ajoute.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'suggestion';
```

- [ ] **Step 2: La migration des suggestions**

```sql
-- POURQUOI : lot 8d (10/10/2026). Uriel remplace les recherches sauvegardées par des suggestions
-- automatiques : Fellowship apprend des festivals qu'un exposant a repérés, faits ou bilantés, et
-- lui propose des festivals proches — même univers (tags), dans sa zone habituelle, ou là où vont
-- ses amis. Un seul calcul (suggestion_candidates) sert au bloc du tableau de bord
-- (suggestions_for) et à la notification du lundi et du jeudi (send_suggestions).
-- Le gratuit ne reçoit que le nombre trouvé, jamais un nom.

CREATE TABLE public.suggestion_dismissals (
  actor_id uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, event_id)
);
ALTER TABLE public.suggestion_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY suggestion_dismissals_own ON public.suggestion_dismissals
  FOR ALL USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));

-- La ligne du téléphone (Réglages) : allumée par défaut, donc pas de rattrapage.
ALTER TABLE public.users DROP CONSTRAINT users_push_muted_lines;
ALTER TABLE public.users ADD CONSTRAINT users_push_muted_lines CHECK (
  push_muted <@ ARRAY['deadline', 'new_edition', 'suggestions', 'friends', 'discussions', 'new_followers', 'weekly']
);

-- Distance à vol d'oiseau, en km (haversine).
CREATE OR REPLACE FUNCTION public.km_between(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
RETURNS float8 LANGUAGE sql IMMUTABLE AS $$
  SELECT 12742 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2
    + cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ^ 2
  ))
$$;

-- events.department est saisi librement (« 63 », « 04100 », « Puy-de-Dôme (63) ») : on compare
-- le code à deux chiffres, entre parenthèses d'abord, sinon en tête.
CREATE OR REPLACE FUNCTION public.department_code(raw text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(substring(raw FROM '\((\d{2})\d*\)'), substring(raw FROM '^\s*(\d{2})'))
$$;

CREATE OR REPLACE FUNCTION public.suggestion_candidates(p_actor uuid)
RETURNS TABLE (event_id uuid, score integer, strong boolean, reason jsonb, start_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH refs AS (
    SELECT e.id, e.name, e.tags, e.latitude AS lat, e.longitude AS lng, bool_or(r.reported) AS reported
    FROM (
      SELECT p.event_id, false AS reported FROM participations p
        WHERE p.actor_id = p_actor AND p.status IN ('interesse', 'inscrit', 'confirme', 'en_cours')
      UNION ALL
      SELECT er.event_id, true FROM event_reports er WHERE er.actor_id = p_actor
    ) r
    JOIN events e ON e.id = r.event_id
    GROUP BY e.id
  ),
  center AS (
    SELECT avg(lat) AS lat, avg(lng) AS lng FROM refs WHERE lat IS NOT NULL AND lng IS NOT NULL
  ),
  zone AS (
    SELECT c.lat, c.lng, greatest(100, coalesce(
      percentile_cont(0.8) WITHIN GROUP (ORDER BY km_between(c.lat, c.lng, r.lat, r.lng)), 0
    )) AS radius
    FROM center c LEFT JOIN refs r ON r.lat IS NOT NULL AND r.lng IS NOT NULL
    GROUP BY c.lat, c.lng
  ),
  home AS (
    SELECT department_code(coalesce(en.department, u.department)) AS code
    FROM actors a
    LEFT JOIN entities en ON en.actor_id = a.id
    LEFT JOIN users u ON u.actor_id = a.id
    WHERE a.id = p_actor
  ),
  candidates AS (
    SELECT e.* FROM events e
    WHERE NOT e.is_private
      AND e.start_date BETWEEN (now() AT TIME ZONE 'Europe/Paris')::date
                           AND (now() AT TIME ZONE 'Europe/Paris')::date + interval '12 months'
      AND NOT EXISTS (SELECT 1 FROM participations p WHERE p.actor_id = p_actor AND p.event_id = e.id)
      AND NOT EXISTS (SELECT 1 FROM event_reports er WHERE er.actor_id = p_actor AND er.event_id = e.id)
      AND NOT EXISTS (SELECT 1 FROM suggestion_dismissals s WHERE s.actor_id = p_actor AND s.event_id = e.id)
  ),
  similar AS (
    SELECT DISTINCT ON (c.id) c.id, r.name AS ref_name,
      cardinality(ARRAY(SELECT unnest(c.tags) INTERSECT SELECT unnest(r.tags)))
        * CASE WHEN r.reported THEN 2 ELSE 1 END AS points
    FROM candidates c JOIN refs r ON c.tags && r.tags
    ORDER BY c.id, points DESC, r.name
  ),
  reported_match AS (
    SELECT DISTINCT c.id FROM candidates c JOIN refs r ON r.reported AND c.tags && r.tags
  ),
  friendly AS (
    SELECT p.event_id AS id, count(DISTINCT p.actor_id)::integer AS n,
      (array_agg(ap.label ORDER BY ap.label))[1] AS first_name
    FROM friends f
    JOIN participations p ON p.actor_id = f.friend_id
    JOIN actor_public ap ON ap.actor_id = f.friend_id
    WHERE f.user_id = p_actor
      AND p.status IN ('inscrit', 'confirme', 'en_cours')
      AND p.visibility IN ('amis', 'public')
      AND ap.label IS NOT NULL
    GROUP BY p.event_id
  ),
  scored AS (
    SELECT c.id, c.start_date,
      coalesce(s.points, 0) AS universe,
      coalesce(fr.n, 0) AS friends,
      (z.lat IS NOT NULL AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
        AND km_between(z.lat, z.lng, c.latitude, c.longitude) <= z.radius) AS in_zone,
      (h.code IS NOT NULL AND department_code(c.department) = h.code) AS in_home,
      s.ref_name, fr.first_name, rm.id IS NOT NULL AS reported_match
    FROM candidates c
    CROSS JOIN zone z
    CROSS JOIN home h
    LEFT JOIN similar s ON s.id = c.id
    LEFT JOIN friendly fr ON fr.id = c.id
    LEFT JOIN reported_match rm ON rm.id = c.id
  )
  SELECT id,
    universe * 10 + friends * 25 + CASE WHEN in_home THEN 1 ELSE 0 END,
    universe > 0 AND in_zone AND (friends > 0 OR reported_match),
    CASE
      WHEN friends > 0 THEN jsonb_build_object('kind', 'friends', 'friend_name', first_name, 'others', friends - 1)
      WHEN universe > 0 THEN jsonb_build_object('kind', 'similar', 'ref_name', ref_name)
      ELSE jsonb_build_object('kind', 'near')
    END,
    start_date
  FROM scored
  WHERE friends > 0
     OR (universe > 0 AND in_zone)
     OR (NOT EXISTS (SELECT 1 FROM refs) AND in_home)
$$;
REVOKE EXECUTE ON FUNCTION public.suggestion_candidates(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.suggestions_for(p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  found integer;
  is_pro boolean;
  items jsonb;
BEGIN
  IF NOT can_act_as(p_actor) THEN
    RAISE EXCEPTION 'suggestions_for: acteur non autorisé' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO found FROM suggestion_candidates(p_actor);
  SELECT coalesce(bool_or(en.plan = 'pro' OR en.comped_pro_until > now()), false) INTO is_pro
    FROM entities en WHERE en.actor_id = p_actor;
  IF NOT is_pro THEN
    RETURN jsonb_build_object('count', found, 'items', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'event_id', e.id, 'name', e.name, 'city', e.city,
      'start_date', e.start_date, 'end_date', e.end_date,
      'image_url', e.image_url, 'reason', best.reason
    ) ORDER BY best.score DESC, best.start_date, e.id), '[]'::jsonb)
  INTO items
  FROM (
    SELECT * FROM suggestion_candidates(p_actor)
    ORDER BY score DESC, start_date, event_id
    LIMIT 3
  ) best
  JOIN events e ON e.id = best.event_id;

  RETURN jsonb_build_object('count', found, 'items', items);
END; $$;
REVOKE EXECUTE ON FUNCTION public.suggestions_for(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suggestions_for(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.send_suggestions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sent integer;
BEGIN
  INSERT INTO notifications (actor_id, type, data)
  SELECT en.actor_id, 'suggestion', jsonb_build_object(
      'event_id', e.id, 'event_name', e.name, 'city', e.city,
      'start_date', e.start_date, 'end_date', e.end_date, 'reason', best.reason
    )
  FROM entities en
  CROSS JOIN LATERAL (
    SELECT c.event_id, c.reason FROM suggestion_candidates(en.actor_id) c
    WHERE c.strong
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.actor_id = en.actor_id AND n.type = 'suggestion'
          AND n.data->>'event_id' = c.event_id::text
      )
    ORDER BY c.score DESC, c.start_date, c.event_id
    LIMIT 1
  ) best
  JOIN events e ON e.id = best.event_id
  WHERE (en.plan = 'pro' OR en.comped_pro_until > now())
    -- Une relance le même jour ne double pas l'envoi : deux par semaine, pas plus.
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.actor_id = en.actor_id AND n.type = 'suggestion'
        AND n.created_at >= now() - interval '2 days'
    );
  GET DIAGNOSTICS sent = ROW_COUNT;
  RETURN sent;
END; $$;
REVOKE EXECUTE ON FUNCTION public.send_suggestions() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('suggestions-pour-toi', '0 7 * * 1,4', $$SELECT public.send_suggestions()$$);
```

- [ ] **Step 3: Dry-run, puis application**

Run: `node_modules/supabase/bin/supabase.exe db push --linked --dry-run`
Expected: les deux migrations listées, rien d'autre.
Run: `echo Y | node_modules/supabase/bin/supabase.exe db push --linked`
Expected: `Finished supabase db push.`

- [ ] **Step 4: Vérifier en lecture seule**

Run (chaque requête par `db query --linked`) :
- `select enum_range(null::notification_type)::text like '%suggestion%'` → `true`
- `select jobname, schedule from cron.job where jobname = 'suggestions-pour-toi'` → `0 7 * * 1,4`
- `select a.id, (select count(*) from suggestion_candidates(a.id)) n, (select count(*) from suggestion_candidates(a.id) where strong) strong from actors a join entities en on en.actor_id = a.id order by n desc limit 8` → des nombres plausibles (au moins un acteur > 0).
- Pour Runes de Chêne (`select actor_id from entities where brand_name = 'Runes de Chêne'`) : `select c.*, e.name, e.city from suggestion_candidates('<id>') c join events e on e.id = c.event_id order by score desc, c.start_date limit 5` → les raisons ont du sens.
- Garde : `select suggestions_for('<id>')` en tant que `postgres` (sans `auth.uid()`) → erreur `acteur non autorisé`.
- Amis privés : `select count(*) from suggestion_candidates('<id>') c where c.reason->>'kind' = 'friends' and not exists (select 1 from friends f join participations p on p.actor_id = f.friend_id where f.user_id = '<id>' and p.event_id = c.event_id and p.visibility in ('amis','public'))` → `0`.
- Ce que le cron enverrait, sans écrire : la requête du `SELECT` de `send_suggestions` exécutée seule (sans `INSERT`) → au plus une ligne par enseigne Pro.

- [ ] **Step 5: Régénérer les types et committer**

Run: `node_modules/supabase/bin/supabase.exe gen types typescript --linked --schema public > "$SCRATCH/supabase.ts"` puis copier dans `apps/web-v2/src/types/supabase.ts`.

```bash
git add supabase/migrations/20261010150000_notification_type_suggestion.sql supabase/migrations/20261010150100_suggestions.sql apps/web-v2/src/types/supabase.ts
git commit -m "feat(db): les suggestions « Pour toi » — calcul, refus, notification du lundi et du jeudi"
```

### Task 2: `lib/suggestions.ts` — lire la réponse, dire la raison

**Files:**
- Create: `apps/web-v2/src/lib/suggestions.ts`
- Test: `apps/web-v2/src/lib/suggestions.test.ts`
- Modify: `apps/web-v2/src/lib/README.md` (une ligne)

**Interfaces:**
- Produces:
  - `type SuggestionReason = { kind: 'friends'; friendName: string; others: number } | { kind: 'similar'; refName: string } | { kind: 'near' }`
  - `interface Suggestion { eventId: string; name: string; city: string | null; startDate: string; endDate: string; imageUrl: string | null; reason: SuggestionReason }`
  - `interface Suggestions { count: number; items: Suggestion[] }`
  - `readReason(raw: unknown): SuggestionReason | null`
  - `readSuggestions(raw: unknown): Suggestions`
  - `withDe(name: string): string`
  - `reasonText(reason: SuggestionReason): string` (en début de phrase)
  - `reasonInSentence(reason: SuggestionReason): string` (après « : »)
  - `foundLabel(count: number): string`

- [ ] **Step 1: Les tests**

```ts
/**
 * QUOI     — tests de la lecture des suggestions et de leurs phrases.
 * POURQUOI — la raison s'affiche sur le tableau de bord ET part sur le téléphone (send-push en
 *            recopie le fichier) : une faute de français y serait partout.
 */
import { describe, expect, test } from 'vitest'
import { foundLabel, readSuggestions, reasonInSentence, reasonText, withDe } from './suggestions'

describe('withDe', () => {
  test.each([
    ['Les Médiévales de Provins', 'des Médiévales de Provins'],
    ['Le Grand Marché', 'du Grand Marché'],
    ['La Foire aux Sorcières', 'de la Foire aux Sorcières'],
    ['L’Isle sur la Sorgue', 'de l’Isle sur la Sorgue'],
    ['Arbor Pagan Fest', 'd’Arbor Pagan Fest'],
    ['Élixir Fest', 'd’Élixir Fest'],
    ['Sylak', 'de Sylak'],
  ])('%s → %s', (name, expected) => {
    expect(withDe(name)).toBe(expected)
  })
})

describe('reasonText', () => {
  test('un ami seul', () => {
    expect(reasonText({ kind: 'friends', friendName: 'Gautier', others: 0 })).toBe('Gautier y va')
  })
  test('un ami et d’autres', () => {
    expect(reasonText({ kind: 'friends', friendName: 'Gautier', others: 2 })).toBe(
      'Gautier et 2 amis y vont',
    )
    expect(reasonText({ kind: 'friends', friendName: 'Gautier', others: 1 })).toBe(
      'Gautier et 1 ami y vont',
    )
  })
  test('proche d’un festival', () => {
    expect(reasonText({ kind: 'similar', refName: 'Les Aventuriales' })).toBe(
      'Proche des Aventuriales',
    )
  })
  test('près de chez toi', () => {
    expect(reasonText({ kind: 'near' })).toBe('Près de chez toi')
  })
})

test('dans une phrase, seul un prénom garde sa majuscule', () => {
  expect(reasonInSentence({ kind: 'similar', refName: 'Sylak' })).toBe('proche de Sylak')
  expect(reasonInSentence({ kind: 'near' })).toBe('près de chez toi')
  expect(reasonInSentence({ kind: 'friends', friendName: 'Lina', others: 0 })).toBe('Lina y va')
})

test('foundLabel', () => {
  expect(foundLabel(1)).toBe('J’ai trouvé 1 festival fait pour toi')
  expect(foundLabel(7)).toBe('J’ai trouvé 7 festivals faits pour toi')
})

describe('readSuggestions', () => {
  const item = {
    event_id: 'e1',
    name: 'Fête des Remparts',
    city: 'Dinan',
    start_date: '2027-07-12',
    end_date: '2027-07-13',
    image_url: null,
    reason: { kind: 'similar', ref_name: 'Les Médiévales de Provins' },
  }

  test('lit le nombre et les cartes', () => {
    expect(readSuggestions({ count: 4, items: [item] })).toEqual({
      count: 4,
      items: [
        {
          eventId: 'e1',
          name: 'Fête des Remparts',
          city: 'Dinan',
          startDate: '2027-07-12',
          endDate: '2027-07-13',
          imageUrl: null,
          reason: { kind: 'similar', refName: 'Les Médiévales de Provins' },
        },
      ],
    })
  })

  test('une carte mal formée est ignorée, pas le bloc', () => {
    const broken = { ...item, event_id: 'e2', reason: { kind: 'inconnu' } }
    const nameless = { ...item, event_id: 'e3', name: '' }
    expect(readSuggestions({ count: 3, items: [item, broken, nameless] }).items).toHaveLength(1)
  })

  test('une réponse vide ou absurde ne propose rien', () => {
    expect(readSuggestions(null)).toEqual({ count: 0, items: [] })
    expect(readSuggestions({ count: 'x', items: 'y' })).toEqual({ count: 0, items: [] })
  })
})
```

- [ ] **Step 2: Les voir échouer**

Run: `pnpm --filter web-v2 exec vitest run src/lib/suggestions.test.ts`
Expected: FAIL — `Failed to resolve import "./suggestions"`.

- [ ] **Step 3: Le code**

```ts
/**
 * QUOI     — les suggestions « Pour toi » : lire la réponse de suggestions_for, et dire la raison
 *            d'une suggestion (« Gautier y va », « Proche des Aventuriales »).
 * POURQUOI — lot 8d. Le tableau de bord et la notification disent la même raison ; la fonction
 *            send-push recopie ce fichier (scripts/sync-push-phrases.mjs) : il ne dépend de rien.
 */

export type SuggestionReason =
  | { kind: 'friends'; friendName: string; others: number }
  | { kind: 'similar'; refName: string }
  | { kind: 'near' }

export interface Suggestion {
  eventId: string
  name: string
  city: string | null
  startDate: string
  endDate: string
  imageUrl: string | null
  reason: SuggestionReason
}

export interface Suggestions {
  /** Tout ce qui a été trouvé : le gratuit ne voit que ce nombre. */
  count: number
  /** Les 3 meilleures, vides en gratuit. */
  items: Suggestion[]
}

type Raw = Record<string, unknown>

function record(value: unknown): Raw | null {
  return typeof value === 'object' && value !== null ? (value as Raw) : null
}

function word(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

export function readReason(raw: unknown): SuggestionReason | null {
  const reason = record(raw)
  if (!reason) return null
  if (reason.kind === 'near') return { kind: 'near' }
  if (reason.kind === 'similar') {
    const refName = word(reason.ref_name)
    return refName ? { kind: 'similar', refName } : null
  }
  if (reason.kind === 'friends') {
    const friendName = word(reason.friend_name)
    const others = typeof reason.others === 'number' ? reason.others : 0
    return friendName ? { kind: 'friends', friendName, others } : null
  }
  return null
}

function readItem(raw: unknown): Suggestion | null {
  const item = record(raw)
  if (!item) return null
  const eventId = word(item.event_id)
  const name = word(item.name)
  const startDate = word(item.start_date)
  const endDate = word(item.end_date)
  const reason = readReason(item.reason)
  if (!eventId || !name || !startDate || !endDate || !reason) return null
  return {
    eventId,
    name,
    city: word(item.city),
    startDate,
    endDate,
    imageUrl: word(item.image_url),
    reason,
  }
}

export function readSuggestions(raw: unknown): Suggestions {
  const answer = record(raw)
  const count = typeof answer?.count === 'number' ? answer.count : 0
  const items = Array.isArray(answer?.items) ? answer.items : []
  return {
    count,
    items: items.map(readItem).filter((item): item is Suggestion => item !== null),
  }
}

/** « de » devant un nom de festival : des, du, de la, de l’, d’, de. */
export function withDe(name: string): string {
  if (name.startsWith('Les ')) return `des ${name.slice(4)}`
  if (name.startsWith('Le ')) return `du ${name.slice(3)}`
  if (name.startsWith('La ')) return `de la ${name.slice(3)}`
  if (name.startsWith('L’') || name.startsWith("L'")) return `de l’${name.slice(2)}`
  if (/^[AEIOUYÉÈÊÂÎÔÛaeiouyéèêâîôû]/.test(name)) return `d’${name}`
  return `de ${name}`
}

export function reasonText(reason: SuggestionReason): string {
  switch (reason.kind) {
    case 'friends':
      if (reason.others === 0) return `${reason.friendName} y va`
      return `${reason.friendName} et ${String(reason.others)} ${reason.others === 1 ? 'ami' : 'amis'} y vont`
    case 'similar':
      return `Proche ${withDe(reason.refName)}`
    case 'near':
      return 'Près de chez toi'
  }
}

/** Après « pourrait t’intéresser : » — un prénom garde sa majuscule, le reste la perd. */
export function reasonInSentence(reason: SuggestionReason): string {
  const said = reasonText(reason)
  return reason.kind === 'friends' ? said : said.charAt(0).toLowerCase() + said.slice(1)
}

export function foundLabel(count: number): string {
  return count === 1
    ? 'J’ai trouvé 1 festival fait pour toi'
    : `J’ai trouvé ${String(count)} festivals faits pour toi`
}
```

- [ ] **Step 4: Les voir passer**

Run: `pnpm --filter web-v2 exec vitest run src/lib/suggestions.test.ts`
Expected: PASS (tous).

- [ ] **Step 5: Commit**

```bash
git add apps/web-v2/src/lib/suggestions.ts apps/web-v2/src/lib/suggestions.test.ts apps/web-v2/src/lib/README.md
git commit -m "feat(v2): lire les suggestions et dire leur raison"
```

### Task 3: La cloche et le téléphone

**Files:**
- Modify: `apps/web-v2/src/lib/notifications.ts` (type `suggestion`, icône `suggestion`)
- Modify: `apps/web-v2/src/lib/notifications.test.ts`
- Modify: `apps/web-v2/src/features/notifications/NotificationPanel.tsx` (`ICONS.suggestion = Sparkles`)
- Modify: `apps/web-v2/src/lib/push-lines.ts`, `apps/web-v2/src/lib/push-lines.test.ts`
- Modify: `apps/web-v2/scripts/sync-push-phrases.mjs` (`FILES` + `suggestions.ts`)
- Modify (généré) : `supabase/functions/send-push/phrases/*`

**Interfaces:**
- Consumes: `readReason`, `reasonInSentence` (Task 2).
- Produces: `notificationPhrase('suggestion', data)` ; `lineOf('suggestion') === 'suggestions'` ; `PUSH_LINES` à 7 lignes, `suggestions` en 3e, `pro: true`.

- [ ] **Step 1: Les tests**

Dans `notifications.test.ts` :

```ts
describe('suggestion', () => {
  const data = {
    event_id: 'e1',
    event_name: 'Fête des Remparts',
    city: 'Dinan',
    start_date: '2027-07-12',
    end_date: '2027-07-13',
    reason: { kind: 'similar', ref_name: 'Les Médiévales de Provins' },
  }
  test('le festival, la ville, les dates, la raison', () => {
    const said = notificationPhrase('suggestion', data)
    expect(said?.icon).toBe('suggestion')
    expect(said?.href).toBe('/evenement/e1')
    expect(said?.text).toEqual([
      { strong: 'Fête des Remparts' },
      ' à Dinan du 12 au 13 juillet pourrait t’intéresser : proche des Médiévales de Provins.',
    ])
  })
  test('sans ville, avec un ami', () => {
    const said = notificationPhrase('suggestion', {
      ...data,
      city: null,
      reason: { kind: 'friends', friend_name: 'Gautier', others: 0 },
    })
    expect(said?.text).toEqual([
      { strong: 'Fête des Remparts' },
      ' du 12 au 13 juillet pourrait t’intéresser : Gautier y va.',
    ])
  })
  test('une raison illisible n’affiche rien', () => {
    expect(notificationPhrase('suggestion', { ...data, reason: { kind: 'x' } })).toBeNull()
  })
})
```

Dans `push-lines.test.ts` : `['suggestion', 'suggestions']` dans le `test.each` de `lineOf` ; l'ordre attendu devient `['deadline', 'new_edition', 'suggestions', 'friends', 'discussions', 'new_followers', 'weekly']` et les lignes Pro `['deadline', 'new_edition', 'suggestions']` (renommer le test « les sept lignes… les trois premières Pro »).

- [ ] **Step 2: Les voir échouer**

Run: `pnpm --filter web-v2 exec vitest run src/lib/notifications.test.ts src/lib/push-lines.test.ts`
Expected: FAIL (phrase `null`, ligne absente).

- [ ] **Step 3: Le code**

`notifications.ts` : `'suggestion'` à la fin de `KNOWN_TYPES` ; `| 'suggestion'` dans `NotificationIcon` ; `import { readReason, reasonInSentence } from './suggestions'` ; avant `default:` :

```ts
    case 'suggestion': {
      const start = text(data, 'start_date')
      const end = text(data, 'end_date')
      const city = text(data, 'city')
      const reason = readReason(data.reason)
      if (!event || !fiche || !start || !end || !reason) return null
      const dates = formatDateSpan(parseSqlDate(start), parseSqlDate(end))
      const where = city ? ` à ${city} ${dates}` : ` ${dates}`
      return {
        icon: 'suggestion',
        text: [{ strong: event }, `${where} pourrait t’intéresser : ${reasonInSentence(reason)}.`],
        href: fiche,
      }
    }
```

`NotificationPanel.tsx` : importer `Sparkles` de `lucide-react`, `suggestion: Sparkles` dans `ICONS`.

`push-lines.ts` : `PushLine` gagne `'suggestions'` ; dans `PUSH_LINES`, après `new_edition` :

```ts
  {
    key: 'suggestions',
    title: 'Suggestions pour toi',
    detail: 'Un festival fait pour toi, au plus deux fois par semaine',
    pro: true,
  },
```

et `suggestion: 'suggestions'` dans `LINE_OF_TYPE`. En-tête : « les sept lignes ».

`sync-push-phrases.mjs` : `const FILES = ['dates.ts', 'notifications.ts', 'push-lines.ts', 'suggestions.ts']` (et l'en-tête).

- [ ] **Step 4: Recopier, puis tout faire passer**

Run: `node apps/web-v2/scripts/sync-push-phrases.mjs && pnpm --filter web-v2 exec vitest run`
Expected: PASS, `push-copy.test.ts` compris.

- [ ] **Step 5: Commit**

```bash
git add apps/web-v2/src/lib apps/web-v2/src/features/notifications/NotificationPanel.tsx apps/web-v2/scripts/sync-push-phrases.mjs supabase/functions/send-push/phrases
git commit -m "feat(v2): la suggestion dans la cloche et sa ligne sur le téléphone"
```

### Task 4: Le bloc « Pour toi » du tableau de bord

**Files:**
- Create: `apps/web-v2/src/features/dashboard/useSuggestions.ts`
- Create: `apps/web-v2/src/features/dashboard/SuggestionsSection.tsx`
- Create: `apps/web-v2/src/styles/3-components/suggestions.css`
- Modify: `apps/web-v2/src/styles/2-semantic.css` (jetons `--suggestion-*`), `apps/web-v2/src/styles/index.css` (import)
- Modify: `apps/web-v2/src/features/dashboard/Dashboard.tsx`, `apps/web-v2/src/features/dashboard/README.md`

**Interfaces:**
- Consumes: `readSuggestions`, `reasonText`, `foundLabel`, `Suggestion`, `Suggestions` (Task 2) ; RPC `suggestions_for`, table `suggestion_dismissals` (Task 1) ; `usePlan`, `useAuth`, `useTransitionNavigate`, `useViewTransition`, `ProBadge`, `formatDateRange`, `parseSqlDate`.
- Produces: `useSuggestions(actorId?: string): { suggestions: Suggestions | null; dismiss: (eventId: string) => Promise<void> }` ; `<SuggestionsSection />`.

- [ ] **Step 1: Le hook**

```ts
/**
 * QUOI     — les suggestions « Pour toi » de l'acteur actif, et « Pas pour moi ».
 * POURQUOI — lot 8d. La base calcule (suggestions_for) ; un refus s'écrit dans
 *            suggestion_dismissals puis on relit, pour que la suivante prenne la place.
 * ATTENTION — une erreur de lecture rend null : le bloc se tait (c'est une aide, pas une donnée
 *            de l'exposant — même exception que la recherche de doublons, .claude/rules/v2.md).
 */
import { useCallback, useEffect, useState } from 'react'
import { readSuggestions, type Suggestions } from '@/lib/suggestions'
import { must, supabase } from '@/lib/supabase'

async function loadSuggestions(actorId: string): Promise<Suggestions> {
  return readSuggestions(must(await supabase.rpc('suggestions_for', { p_actor: actorId })))
}

export function useSuggestions(actorId: string | undefined) {
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!actorId) return
    let cancelled = false
    async function load(id: string) {
      let found: Suggestions | null
      try {
        found = await loadSuggestions(id)
      } catch {
        found = null
      }
      if (cancelled) return
      setSuggestions(found)
    }
    void load(actorId)
    return () => {
      cancelled = true
    }
  }, [actorId, version])

  const dismiss = useCallback(
    async (eventId: string) => {
      if (!actorId) return
      must(
        await supabase.from('suggestion_dismissals').insert({ actor_id: actorId, event_id: eventId }),
      )
      setVersion((current) => current + 1)
    },
    [actorId],
  )

  return { suggestions, dismiss }
}
```

- [ ] **Step 2: La section**

```tsx
/**
 * QUOI     — le bloc « Pour toi » : 3 festivals proches de ceux que l'exposant fait, chacun avec
 *            sa raison et « Pas pour moi » ; en gratuit, le nombre trouvé sous un voile.
 * POURQUOI — lot 8d, maquettes 2206:2 (Pro) et 2206:340 (gratuit). Rien à proposer, ou une
 *            lecture ratée : le bloc ne s'affiche pas.
 */
import { ArrowRight } from 'lucide-react'
import { ProBadge } from '@/components/ui/ProBadge'
import { useAuth } from '@/lib/auth'
import { formatDateRange, parseSqlDate } from '@/lib/dates'
import { useTransitionNavigate, useViewTransition } from '@/lib/navigation'
import { foundLabel, reasonText, type Suggestion } from '@/lib/suggestions'
import { usePlan } from '@/lib/usePlan'
import { useSuggestions } from './useSuggestions'

/** Les cartes du voile gratuit : de fausses, on n'a pas les vraies. */
const PLACEHOLDERS = ['a', 'b', 'c']

function SuggestionCard({ item, onDismiss }: { item: Suggestion; onDismiss: () => void }) {
  const go = useTransitionNavigate()
  const dates = formatDateRange(parseSqlDate(item.startDate), parseSqlDate(item.endDate))
  return (
    <article className="suggestion">
      <button
        type="button"
        className="suggestion__open"
        onClick={() => go(`/evenement/${item.eventId}`)}
      >
        {item.imageUrl ? (
          <img className="suggestion__poster" src={item.imageUrl} alt="" />
        ) : (
          <span className="suggestion__poster" />
        )}
        <span className="suggestion__body">
          <span className="suggestion__name">{item.name}</span>
          <span className="suggestion__meta">{item.city ? `${dates} · ${item.city}` : dates}</span>
          <span className="suggestion__reason">{reasonText(item.reason)}</span>
        </span>
      </button>
      <button type="button" className="suggestion__dismiss" onClick={onDismiss}>
        Pas pour moi
      </button>
    </article>
  )
}

export function SuggestionsSection() {
  const { actor } = useAuth()
  const { pro } = usePlan()
  const { suggestions, dismiss } = useSuggestions(actor?.id)
  const transition = useViewTransition()
  const go = useTransitionNavigate()

  if (!suggestions || suggestions.count === 0) return null
  if (pro && suggestions.items.length === 0) return null

  return (
    <section className="dashboard__section">
      <h2 className="dashboard__section-title">Pour toi</h2>
      <p className="dashboard__section-note">
        Des festivals proches de ceux que tu fais, trouvés par Fellowship
      </p>
      {pro ? (
        <div className="suggestions">
          {suggestions.items.map((item) => (
            <SuggestionCard
              key={item.eventId}
              item={item}
              onDismiss={() => transition('suggestion', () => void dismiss(item.eventId))}
            />
          ))}
        </div>
      ) : (
        <div className="suggestions suggestions--locked">
          {PLACEHOLDERS.map((key) => (
            <span key={key} className="suggestion suggestion--placeholder" aria-hidden="true" />
          ))}
          <div className="suggestions__invite">
            <div className="suggestions__invite-text">
              <ProBadge />
              <p className="suggestions__invite-title">{foundLabel(suggestions.count)}</p>
              <p className="suggestions__invite-note">
                Proches de ceux que tu fais, dans ta zone. Le Pro te les montre, et te prévient
                quand il en trouve un nouveau.
              </p>
            </div>
            <button type="button" className="suggestions__invite-button" onClick={() => go('/pro')}>
              Découvrir le Pro
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
```

Ruling attendu à vérifier au moment du code : `transition(…, () => void dismiss(…))` lance l'écriture dans la transition ; la carte part quand la relecture arrive. Si la transition se fige sur l'ancienne image le temps de l'écriture, retirer d'abord la carte localement (état `hidden: Set<string>` dans la section) puis appeler `dismiss` hors transition — et ledger la décision.

- [ ] **Step 3: Le CSS et ses jetons**

`2-semantic.css`, à côté des jetons du tableau de bord (valeurs de la maquette : bloc bordé `--line-card`, rayon 16, cartes padding 12, affiche 56×78 rayon 8, nom 14 semi-gras, méta et raison 12, « Pas pour moi » 12 tertiaire, flou 10 px) :

```css
  --suggestion-poster-width: 56px;
  --suggestion-poster-height: 78px;
  --suggestion-poster-radius: var(--radius-8);
  --suggestion-gap: var(--space-12);
  --suggestion-padding: var(--space-12);
  --suggestion-placeholder-height: 102px;
  --suggestion-blur: 10px;
  --suggestion-placeholder-opacity: 0.55;
  --type-suggestion-name: var(--weight-semibold) var(--size-14) / var(--leading-snug) var(--font-sans);
  --type-suggestion-small: var(--weight-regular) var(--size-12) / var(--leading-snug) var(--font-sans);
  --type-suggestion-reason: var(--weight-medium) var(--size-12) / var(--leading-snug) var(--font-sans);
  --type-suggestion-invite: var(--weight-regular) var(--size-26) / var(--leading-tight) var(--font-serif);
```

(Avant d'écrire : vérifier dans `1-primitives.css` et `2-semantic.css` les noms exacts des jetons de rayon, d'espace, de taille et de police déjà utilisés par `dashboard.css` et `reports` ; reprendre les mêmes. Un jeton absent s'ajoute en couche 1 puis 2, jamais en dur.)

`3-components/suggestions.css` : `.suggestions` (grille 3 colonnes, fond carte, bordure `--line-card`, rayon de carte, padding) ; `.suggestion` (flex, padding, rayon, survol comme `.report`) ; `.suggestion__open` (bouton nu, flex, gap) ; `.suggestion__poster` ; `.suggestion__name`, `.suggestion__meta`, `.suggestion__reason`, `.suggestion__dismiss` (bouton texte tertiaire, survol encre) ; `.suggestion--placeholder` (hauteur, fond de surface, flou, opacité) ; `.suggestions--locked { position: relative }` et `.suggestions__invite` (absolu, `inset: 0`, flex, `space-between`, padding 32 en ligne) ; `.suggestions__invite-title` (serif) ; `.suggestions__invite-button` (bouton noir principal, comme `ProEndCard`/le voile) ; `::view-transition-*` rien de spécial ; `@starting-style` sur `.suggestion` (opacité 0, `translate: 0 var(--space-6)`) avec transition `opacity`, `translate` sur `--duration-*`/`--ease-*` ; `prefers-reduced-motion` coupe les transitions. Import dans `index.css` à la suite de `dashboard.css`.

- [ ] **Step 4: Le placer**

`Dashboard.tsx` : `import { SuggestionsSection } from './SuggestionsSection'` et `<SuggestionsSection />` juste après le bloc `{next && (…)}`, avant « Mes dossiers ». En-tête : ajouter « pour toi » à la liste. `README.md` : deux lignes (`useSuggestions.ts`, `SuggestionsSection.tsx`).

- [ ] **Step 5: Vérifier**

Run: `pnpm --filter web-v2 lint && pnpm --filter web-v2 exec vitest run && pnpm --filter web-v2 build`
Expected: zéro erreur, zéro avertissement, build OK.

Dans le navigateur (après le déploiement de la Task 6, V2 réservée aux admins) : Runes de Chêne voit 3 cartes avec leurs raisons ; « Pas pour moi » retire une carte et une autre arrive ; en `?plan=free` (dev seulement) le voile et le nombre ; un acteur sans suggestion ne voit pas le bloc. Comparer à `2206:2` et `2206:340` (capture Figma à côté).

- [ ] **Step 6: Commit**

```bash
git add apps/web-v2/src/features/dashboard apps/web-v2/src/styles
git commit -m "feat(v2): le bloc « Pour toi » du tableau de bord"
```

### Task 5: L'offre Pro et la version

**Files:**
- Modify: `apps/web-v2/src/features/pro/PlanCard.tsx:28`
- Modify: `apps/web-v2/package.json` (`2.28.0`)

- [ ] **Step 1: Le texte**

`'Tes recherches sauvegardées t’alertent des nouveaux festivals'` → `'Fellowship te trouve des festivals faits pour toi, et te prévient'`.

- [ ] **Step 2: Vérifier qu'aucune trace ne reste**

Run: `grep -rn "recherches sauvegard" apps/web-v2/src`
Expected: rien.

- [ ] **Step 3: Commit**

```bash
git add apps/web-v2/src/features/pro/PlanCard.tsx apps/web-v2/package.json
git commit -m "chore(v2): 2.28.0 — les suggestions « Pour toi »"
```

### Task 6: Mise en ligne (avec le GO d'Uriel) et docs

- [ ] **Step 1:** Relecture fraîche de tout le lot (opus), corrections Critical/Important.
- [ ] **Step 2 (GO):** `node_modules/supabase/bin/supabase.exe functions deploy send-push --use-api` — la phrase `suggestion` part sur le téléphone ; vérifier 401 sans secret.
- [ ] **Step 3 (GO):** `pnpm build` puis déploiement V2 (`.claude/rules/deploiement.md`), curl de `/v2/`.
- [ ] **Step 4:** Docs : plan directeur (8d ☑), `docs/v2/maquettes-2027.md` (les trois cadres, intégrés ; la ligne « Recherches sauvegardées » de la base devient « Suggestions »), `_État.md` « Où on en est ». Push.
