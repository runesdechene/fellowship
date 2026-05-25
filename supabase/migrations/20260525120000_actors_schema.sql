-- 20260525120000_actors_schema.sql
-- Refonte des comptes — Fondation (Phase 1, Task 1)
-- Modèle acteur partagé : actors (identité) + users (personne) + entities (casquettes pro)
-- + memberships (M2M user↔entity + rôle). Autorisation via can_act_as / is_entity_owner.

CREATE TYPE actor_kind      AS ENUM ('person', 'entity');
CREATE TYPE entity_type     AS ENUM ('exposant', 'festival', 'entreprise');
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'member');

-- Identité partagée. Pour une personne, actors.id = auth.users.id (= auth.uid()).
CREATE TABLE actors (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind actor_kind NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- La PERSONNE (festivalier de base). actor_id = auth.uid().
CREATE TABLE users (
  actor_id UUID PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
  auth_id  UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  city TEXT, department TEXT, postal_code TEXT,
  sex user_sex DEFAULT 'indefini',
  plan user_plan NOT NULL DEFAULT 'free',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Les CASQUETTES PRO.
CREATE TABLE entities (
  actor_id UUID PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
  type entity_type NOT NULL,
  brand_name TEXT NOT NULL,
  craft_type TEXT,              -- texte LIBRE
  bio TEXT, website TEXT, banner_url TEXT, avatar_url TEXT,
  public_slug TEXT UNIQUE,
  city TEXT, department TEXT, postal_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entities_slug ON entities(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX idx_entities_type ON entities(type);

-- M2M : qui gère quelle entité, avec quel rôle.
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_actor_id   UUID NOT NULL REFERENCES users(actor_id)   ON DELETE CASCADE,
  entity_actor_id UUID NOT NULL REFERENCES entities(actor_id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_actor_id, entity_actor_id)
);
CREATE INDEX idx_memberships_user   ON memberships(user_actor_id);
CREATE INDEX idx_memberships_entity ON memberships(entity_actor_id);

-- Autorisation : l'utilisateur courant agit-il AU NOM de cet acteur ? (soi-même OU membre de l'entité)
CREATE OR REPLACE FUNCTION can_act_as(target_actor UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT target_actor = auth.uid()
      OR EXISTS (
        SELECT 1 FROM memberships
        WHERE user_actor_id = auth.uid() AND entity_actor_id = target_actor
      );
$$;

-- Sécurité : l'utilisateur courant est-il OWNER de cette entité ? (actions destructrices)
CREATE OR REPLACE FUNCTION is_entity_owner(target_entity UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_actor_id = auth.uid() AND entity_actor_id = target_entity AND role = 'owner'
  );
$$;

-- RLS des nouvelles tables
ALTER TABLE actors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY actors_select_all   ON actors   FOR SELECT USING (true);
CREATE POLICY users_select_all    ON users    FOR SELECT USING (true);   -- profils publics lisibles
CREATE POLICY users_update_self   ON users    FOR UPDATE USING (actor_id = auth.uid()) WITH CHECK (actor_id = auth.uid());
CREATE POLICY entities_select_all ON entities FOR SELECT USING (true);
-- Éditer le profil d'entité : tout membre (vitrine). Mais...
CREATE POLICY entities_update_member ON entities FOR UPDATE TO authenticated
  USING (can_act_as(actor_id)) WITH CHECK (can_act_as(actor_id));
-- ...SUPPRIMER l'entité = OWNER uniquement (sécurité structurelle : un employé ne peut pas).
CREATE POLICY entities_delete_owner ON entities FOR DELETE TO authenticated
  USING (is_entity_owner(actor_id));
-- PAS d'INSERT client direct sur entities/memberships (RLS fermé par défaut).
-- La création d'entité passe par la RPC SECURITY DEFINER ci-dessous (atomique) →
-- empêche de s'auto-déclarer owner d'une entité tierce.

CREATE POLICY memberships_select_mine ON memberships FOR SELECT TO authenticated
  USING (user_actor_id = auth.uid() OR can_act_as(entity_actor_id));
-- Inviter un membre = OWNER de l'entité uniquement (UI = Plan 3, garde-fou RLS = maintenant).
CREATE POLICY memberships_insert_by_owner ON memberships FOR INSERT TO authenticated
  WITH CHECK (is_entity_owner(entity_actor_id));
-- Retirer un membre = owner ; ou quitter soi-même.
CREATE POLICY memberships_delete_owner_or_self ON memberships FOR DELETE TO authenticated
  USING (is_entity_owner(entity_actor_id) OR user_actor_id = auth.uid());

-- Création d'entité atomique & sûre : crée l'acteur + l'entité + le membership OWNER pour auth.uid().
-- (L'onboarding appelle supabase.rpc('create_owned_entity', …), puis complète les champs via UPDATE.)
CREATE OR REPLACE FUNCTION create_owned_entity(p_type entity_type, p_brand_name TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO actors(id, kind) VALUES (gen_random_uuid(), 'entity') RETURNING id INTO new_id;
  INSERT INTO entities(actor_id, type, brand_name) VALUES (new_id, p_type, p_brand_name);
  INSERT INTO memberships(user_actor_id, entity_actor_id, role) VALUES (auth.uid(), new_id, 'owner');
  RETURN new_id;
END; $$;
