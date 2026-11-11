-- POURQUOI — l'équipe parle à la communauté depuis Fellowship même : un compte « Fellowship »
-- officiel publie des sujets (« Quelle fonctionnalité vous manque ? ») et reçoit les retours clients
-- dans sa boîte Messages (Uriel, 11/11/2026, docs/superpowers/specs/2026-11-11-compte-officiel-design.md).
--
-- 1. `actors.officiel` : le drapeau, posé à la main (cette migration, ou SQL), jamais depuis l'app.
-- 2. `peut_ecrire(moi, lui)` : la SEULE règle qui dit qui peut ouvrir une conversation avec qui —
--    amis, ou l'un des deux est officiel. Une future invitation entre non-amis y ajoutera un cas.
-- 3. `ouvrir_conversation` (définition live recopiée entière) : une conversation à deux passe par
--    `peut_ecrire` ; un groupe garde sa règle, on n'y met que ses amis.
-- 4. `comptes_officiels()` : la liste que le front lit une fois, pour le badge et la barre des sujets.
-- 5. L'enseigne Fellowship elle-même, comme la crée `create_owned_entity`, Uriel seul propriétaire.
--    Type `entreprise`, pas `exposant` : « Tu connais peut-être » et les arrivées du fil ne
--    retiennent que les exposants, Fellowship n'y paraît donc pas, sans toucher à ces fonctions.

ALTER TABLE public.actors ADD COLUMN officiel boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.peut_ecrire(p_actor uuid, p_other uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(can_act_as(p_actor), false)
     AND (coalesce(are_friends(p_actor, p_other), false)
          OR EXISTS (SELECT 1 FROM actors a WHERE a.id IN (p_actor, p_other) AND a.officiel));
$function$;

REVOKE EXECUTE ON FUNCTION public.peut_ecrire(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.peut_ecrire(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ouvrir_conversation(p_actor uuid, p_others uuid[], p_title text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_others UUID[];
  v_id UUID;
  v_key TEXT;
  v_title TEXT := NULLIF(btrim(p_title), '');
  v_direct BOOLEAN;
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  SELECT array_agg(DISTINCT a.id) INTO v_others
  FROM actors a WHERE a.id = ANY (p_others) AND a.id <> p_actor;
  IF v_others IS NULL THEN RAISE EXCEPTION 'Choisis au moins une personne.'; END IF;
  v_direct := cardinality(v_others) = 1 AND v_title IS NULL;
  -- À deux, la règle commune (peut_ecrire) ; en groupe, seulement ses amis.
  IF v_direct AND NOT peut_ecrire(p_actor, v_others[1]) THEN
    RAISE EXCEPTION 'Tu ne peux écrire qu’à tes amis.';
  END IF;
  IF NOT v_direct
     AND EXISTS (SELECT 1 FROM unnest(v_others) AS x WHERE NOT coalesce(are_friends(p_actor, x), false)) THEN
    RAISE EXCEPTION 'Tu ne peux écrire qu’à tes amis.';
  END IF;

  IF v_direct THEN
    v_key := least(p_actor, v_others[1])::text || ':' || greatest(p_actor, v_others[1])::text;
    SELECT id INTO v_id FROM conversations WHERE pair_key = v_key;
    IF v_id IS NULL THEN
      INSERT INTO conversations (kind, created_by, pair_key) VALUES ('direct', p_actor, v_key)
      ON CONFLICT (pair_key) DO NOTHING RETURNING id INTO v_id;
      IF v_id IS NULL THEN SELECT id INTO v_id FROM conversations WHERE pair_key = v_key; END IF;
    END IF;
  ELSE
    INSERT INTO conversations (kind, created_by, title) VALUES ('groupe', p_actor, v_title)
    RETURNING id INTO v_id;
  END IF;

  INSERT INTO conversation_members (conversation_id, actor_id)
  SELECT v_id, x FROM unnest(array_append(v_others, p_actor)) AS x
  ON CONFLICT DO NOTHING;
  RETURN v_id;
END;
$function$;

-- Publique : être officiel n'est pas un secret, la vitrine sans compte affiche aussi le badge.
CREATE OR REPLACE FUNCTION public.comptes_officiels()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM actors WHERE officiel ORDER BY id;
$function$;

GRANT EXECUTE ON FUNCTION public.comptes_officiels() TO anon, authenticated;

-- L'enseigne Fellowship : les trois écritures de create_owned_entity, Uriel propriétaire.
DO $$
DECLARE
  v_owner CONSTANT uuid := 'a7ad4ea6-5009-44a7-a532-e58ac4e5a995'; -- Uriel
  v_id uuid;
BEGIN
  SELECT actor_id INTO v_id FROM entities WHERE public_slug = 'fellowship';
  IF v_id IS NULL THEN
    INSERT INTO actors (id, kind, officiel) VALUES (gen_random_uuid(), 'entity', true) RETURNING id INTO v_id;
    INSERT INTO entities (actor_id, type, brand_name, public_slug, avatar_url, bio)
    VALUES (v_id, 'entreprise', 'Fellowship', 'fellowship', 'https://flw.sh/icon-512.png',
            'L’équipe de Fellowship. Une idée, un souci, une question : écrivez-nous.');
    INSERT INTO memberships (user_actor_id, entity_actor_id, role) VALUES (v_owner, v_id, 'owner');
  ELSE
    UPDATE actors SET officiel = true WHERE id = v_id;
  END IF;
END $$;
