-- 20261104130000_sujets_et_messages.sql
--
-- POURQUOI — les exposants ne savent jamais à qui écrire sur WhatsApp pour parler d'un festival
-- (Uriel, 04/11/2026). Fellowship leur donne :
--   * les SUJETS : un mot (et une photo ou une vidéo) lancé en haut de l'application, vu par ses
--     amis, ses abonnés ou tout le monde, ouvert 7 jours ou jusqu'à ce que l'auteur le clôture ;
--   * un vrai TCHAT derrière chaque sujet, qui sert aussi aux conversations à deux et aux groupes.
-- Conception : docs/superpowers/specs/2026-11-04-sujets-et-messages-design.md.
--
-- Tout est additif : aucune table lue par le code déployé ne change.
-- Les écritures passent par des RPC SECURITY DEFINER qui vérifient can_act_as(p_actor) : on agit
-- toujours au nom de l'acteur actif. Les lectures directes (fil, membres) sont filtrées par
-- can_see_conversation(), ce qui vaut aussi pour le temps réel.
-- Le bucket `discussions` (privé) se crée à la main dans le dashboard (docs/db/gotchas.md) ; ses
-- policies sont posées ici.

-- ── Types ────────────────────────────────────────────────────────────────────────────────────────
CREATE TYPE public.conversation_kind AS ENUM ('sujet', 'direct', 'groupe');
CREATE TYPE public.sujet_audience    AS ENUM ('amis', 'abonnes', 'public');
CREATE TYPE public.message_media     AS ENUM ('image', 'video');

-- ── Tables ───────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            public.conversation_kind NOT NULL,
  created_by      UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Un groupe peut porter un nom.
  title           TEXT CHECK (title IS NULL OR char_length(title) BETWEEN 1 AND 60),
  -- Une conversation à deux est unique par paire : « petit:grand ».
  pair_key        TEXT UNIQUE,
  -- Ce qui fait un sujet.
  mot             TEXT CHECK (mot IS NULL OR char_length(mot) BETWEEN 1 AND 80),
  audience        public.sujet_audience,
  event_id        UUID REFERENCES public.events(id) ON DELETE SET NULL,
  media_path      TEXT,
  media_kind      public.message_media,
  expires_at      TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  CONSTRAINT conversations_sujet_complet CHECK (
    kind <> 'sujet' OR (mot IS NOT NULL AND audience IS NOT NULL AND expires_at IS NOT NULL)
  ),
  CONSTRAINT conversations_direct_paire CHECK (kind <> 'direct' OR pair_key IS NOT NULL)
);
CREATE INDEX idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX idx_conversations_event ON public.conversations(event_id);
-- La barre ne lit que les sujets ouverts.
CREATE INDEX idx_conversations_sujets_ouverts ON public.conversations(expires_at)
  WHERE kind = 'sujet' AND closed_at IS NULL;

CREATE TABLE public.conversation_members (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  actor_id        UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  muted           BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (conversation_id, actor_id)
);
CREATE INDEX idx_conversation_members_actor ON public.conversation_members(actor_id);

CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  author_actor    UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  body            TEXT CHECK (body IS NULL OR char_length(body) BETWEEN 1 AND 4000),
  media_path      TEXT,
  media_kind      public.message_media,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_non_vide CHECK (body IS NOT NULL OR media_path IS NOT NULL),
  CONSTRAINT messages_media_complet CHECK ((media_path IS NULL) = (media_kind IS NULL))
);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_author ON public.messages(author_actor);
CREATE INDEX idx_messages_media ON public.messages(media_path) WHERE media_path IS NOT NULL;

-- Qui a vu quel sujet : l'anneau passe au gris.
CREATE TABLE public.sujet_views (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  actor_id        UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  seen_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, actor_id)
);
CREATE INDEX idx_sujet_views_actor ON public.sujet_views(actor_id);

-- ── Helpers ──────────────────────────────────────────────────────────────────────────────────────
-- Les acteurs au nom desquels agit le compte connecté : lui-même et ses enseignes.
CREATE OR REPLACE FUNCTION public.my_actor_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid()
  UNION
  SELECT entity_actor_id FROM memberships WHERE user_actor_id = auth.uid();
$$;

-- Cet acteur fait-il partie du public de ce sujet ? (amis = suivi dans les deux sens, lib/friends.ts)
CREATE OR REPLACE FUNCTION public.actor_sees_sujet(p_actor UUID, p_conversation UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = p_conversation AND c.kind = 'sujet' AND (
      c.created_by = p_actor
      OR c.audience = 'public'
      OR (c.audience = 'abonnes' AND EXISTS (
            SELECT 1 FROM follows WHERE follower_actor = p_actor AND following_actor = c.created_by))
      OR (c.audience = 'amis'
          AND EXISTS (SELECT 1 FROM follows WHERE follower_actor = p_actor AND following_actor = c.created_by)
          AND EXISTS (SELECT 1 FROM follows WHERE follower_actor = c.created_by AND following_actor = p_actor))
    )
  );
$$;

-- Un sujet est ouvert tant qu'il n'est ni clôturé ni expiré.
CREATE OR REPLACE FUNCTION public.sujet_is_open(p_conversation UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = p_conversation AND kind = 'sujet' AND closed_at IS NULL AND expires_at > now()
  );
$$;

-- Le compte connecté peut-il lire cette conversation ? Membre (au nom d'un de ses acteurs), ou
-- public d'un sujet encore ouvert.
CREATE OR REPLACE FUNCTION public.can_see_conversation(p_conversation UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation AND actor_id IN (SELECT my_actor_ids())
  )
  OR (
    sujet_is_open(p_conversation)
    AND EXISTS (SELECT 1 FROM my_actor_ids() a WHERE actor_sees_sujet(a, p_conversation))
  );
$$;

-- Un média se lit si son auteur est l'un de mes acteurs, ou s'il est dans une conversation lisible.
CREATE OR REPLACE FUNCTION public.can_see_discussion_media(p_path TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM messages m WHERE m.media_path = p_path AND can_see_conversation(m.conversation_id)
  );
$$;

-- Un chemin de média appartient à l'acteur qui l'envoie : « <acteur>/<fichier> ».
CREATE OR REPLACE FUNCTION public.media_belongs_to(p_path TEXT, p_actor UUID)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT p_path IS NULL OR p_path LIKE p_actor::text || '/%';
$$;

-- ── RLS : lecture seule, les écritures passent par les RPC ───────────────────────────────────────
ALTER TABLE public.conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sujet_views          ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.conversations, public.conversation_members, public.messages, public.sujet_views
  FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.conversations, public.conversation_members, public.messages,
  public.sujet_views FROM authenticated;

CREATE POLICY conversations_select ON public.conversations FOR SELECT TO authenticated
  USING (can_see_conversation(id));
CREATE POLICY conversation_members_select ON public.conversation_members FOR SELECT TO authenticated
  USING (can_see_conversation(conversation_id));
CREATE POLICY messages_select ON public.messages FOR SELECT TO authenticated
  USING (can_see_conversation(conversation_id));
CREATE POLICY sujet_views_select ON public.sujet_views FOR SELECT TO authenticated
  USING (actor_id IN (SELECT my_actor_ids()));

-- ── Écritures ────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.publier_sujet(
  p_actor UUID, p_mot TEXT, p_audience public.sujet_audience, p_event UUID,
  p_media_path TEXT, p_media_kind public.message_media
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  IF NOT media_belongs_to(p_media_path, p_actor) THEN RAISE EXCEPTION 'Média invalide.'; END IF;

  INSERT INTO conversations (kind, created_by, mot, audience, event_id, media_path, media_kind, expires_at)
  VALUES ('sujet', p_actor, btrim(p_mot), p_audience, p_event, p_media_path, p_media_kind,
          now() + interval '7 days')
  RETURNING id INTO v_id;

  INSERT INTO conversation_members (conversation_id, actor_id) VALUES (v_id, p_actor);
  -- Le mot est aussi le premier message du fil, avec son média.
  INSERT INTO messages (conversation_id, author_actor, body, media_path, media_kind)
  VALUES (v_id, p_actor, btrim(p_mot), p_media_path, p_media_kind);
  INSERT INTO sujet_views (conversation_id, actor_id) VALUES (v_id, p_actor);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.envoyer_message(
  p_actor UUID, p_conversation UUID, p_body TEXT, p_media_path TEXT, p_media_kind public.message_media
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_kind public.conversation_kind;
  v_member BOOLEAN;
  v_id UUID;
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  IF NOT media_belongs_to(p_media_path, p_actor) THEN RAISE EXCEPTION 'Média invalide.'; END IF;

  SELECT kind INTO v_kind FROM conversations WHERE id = p_conversation;
  IF v_kind IS NULL THEN RAISE EXCEPTION 'Conversation introuvable.'; END IF;
  v_member := EXISTS (SELECT 1 FROM conversation_members
                      WHERE conversation_id = p_conversation AND actor_id = p_actor);

  IF v_kind = 'sujet' THEN
    IF NOT sujet_is_open(p_conversation) THEN RAISE EXCEPTION 'Ce sujet est clôturé.'; END IF;
    IF NOT v_member THEN
      IF NOT actor_sees_sujet(p_actor, p_conversation) THEN
        RAISE EXCEPTION 'Conversation introuvable.';
      END IF;
      -- Écrire dans un sujet en fait un participant : il rejoint sa boîte Messages.
      INSERT INTO conversation_members (conversation_id, actor_id) VALUES (p_conversation, p_actor);
    END IF;
  ELSIF NOT v_member THEN
    RAISE EXCEPTION 'Conversation introuvable.';
  END IF;

  INSERT INTO messages (conversation_id, author_actor, body, media_path, media_kind)
  VALUES (p_conversation, p_actor, NULLIF(btrim(p_body), ''), p_media_path, p_media_kind)
  RETURNING id INTO v_id;
  UPDATE conversations SET last_message_at = now() WHERE id = p_conversation;
  UPDATE conversation_members SET last_read_at = now()
  WHERE conversation_id = p_conversation AND actor_id = p_actor;
  RETURN v_id;
END;
$$;

-- Ouvre la conversation avec ces personnes : à deux sans nom, la conversation unique de la paire
-- (« Écrire » rouvre l'existante) ; sinon un nouveau groupe.
CREATE OR REPLACE FUNCTION public.ouvrir_conversation(p_actor UUID, p_others UUID[], p_title TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_others UUID[];
  v_id UUID;
  v_key TEXT;
  v_title TEXT := NULLIF(btrim(p_title), '');
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  SELECT array_agg(DISTINCT a.id) INTO v_others
  FROM actors a WHERE a.id = ANY (p_others) AND a.id <> p_actor;
  IF v_others IS NULL THEN RAISE EXCEPTION 'Choisis au moins une personne.'; END IF;

  IF cardinality(v_others) = 1 AND v_title IS NULL THEN
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
$$;

CREATE OR REPLACE FUNCTION public.cloturer_sujet(p_actor UUID, p_conversation UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  UPDATE conversations SET closed_at = now()
  WHERE id = p_conversation AND kind = 'sujet' AND created_by = p_actor AND closed_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seul l’auteur clôture son sujet.'; END IF;
END;
$$;

-- Lu : le fil jusqu'ici, et le sujet passe au gris dans la barre.
CREATE OR REPLACE FUNCTION public.marquer_lu(p_actor UUID, p_conversation UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  UPDATE conversation_members SET last_read_at = now()
  WHERE conversation_id = p_conversation AND actor_id = p_actor;
  IF actor_sees_sujet(p_actor, p_conversation) THEN
    INSERT INTO sujet_views (conversation_id, actor_id) VALUES (p_conversation, p_actor)
    ON CONFLICT (conversation_id, actor_id) DO UPDATE SET seen_at = now();
  END IF;
END;
$$;

-- Tout membre d'un groupe y ajoute qui il veut.
CREATE OR REPLACE FUNCTION public.ajouter_membres(p_actor UUID, p_conversation UUID, p_others UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM conversation_members m JOIN conversations c ON c.id = m.conversation_id
    WHERE m.conversation_id = p_conversation AND m.actor_id = p_actor AND c.kind = 'groupe'
  ) THEN RAISE EXCEPTION 'Groupe introuvable.'; END IF;
  INSERT INTO conversation_members (conversation_id, actor_id)
  SELECT p_conversation, a.id FROM actors a WHERE a.id = ANY (p_others)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.renommer_groupe(p_actor UUID, p_conversation UUID, p_title TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  UPDATE conversations c SET title = NULLIF(btrim(p_title), '')
  WHERE c.id = p_conversation AND c.kind = 'groupe'
    AND EXISTS (SELECT 1 FROM conversation_members
                WHERE conversation_id = p_conversation AND actor_id = p_actor);
  IF NOT FOUND THEN RAISE EXCEPTION 'Groupe introuvable.'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.quitter_conversation(p_actor UUID, p_conversation UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  DELETE FROM conversation_members WHERE conversation_id = p_conversation AND actor_id = p_actor;
END;
$$;

CREATE OR REPLACE FUNCTION public.regler_sourdine(p_actor UUID, p_conversation UUID, p_muted BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  UPDATE conversation_members SET muted = p_muted
  WHERE conversation_id = p_conversation AND actor_id = p_actor;
END;
$$;

-- ── Lectures composées ───────────────────────────────────────────────────────────────────────────
-- La barre : les sujets ouverts que voit cet acteur, le sien d'abord, les non vus ensuite.
CREATE OR REPLACE FUNCTION public.sujets_du_moment(p_actor UUID)
RETURNS TABLE (
  id UUID, created_by UUID, author_label TEXT, author_avatar TEXT, mot TEXT,
  media_path TEXT, media_kind public.message_media, audience public.sujet_audience,
  event_id UUID, event_name TEXT, event_tags TEXT[], event_image TEXT,
  event_start DATE, event_end DATE,
  participants INTEGER, seen BOOLEAN, created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  RETURN QUERY
  SELECT c.id, c.created_by, ap.label, ap.avatar_url, c.mot, c.media_path, c.media_kind, c.audience,
         c.event_id, e.name, e.tags, e.image_url, e.start_date, e.end_date,
         (SELECT count(DISTINCT m.author_actor)::int FROM messages m WHERE m.conversation_id = c.id),
         EXISTS (SELECT 1 FROM sujet_views v WHERE v.conversation_id = c.id AND v.actor_id = p_actor),
         c.created_at, c.expires_at
  FROM conversations c
  LEFT JOIN actor_public ap ON ap.actor_id = c.created_by
  LEFT JOIN events e ON e.id = c.event_id AND e.is_private = false
  WHERE c.kind = 'sujet' AND c.closed_at IS NULL AND c.expires_at > now()
    AND actor_sees_sujet(p_actor, c.id)
  ORDER BY (c.created_by = p_actor) DESC,
           EXISTS (SELECT 1 FROM sujet_views v WHERE v.conversation_id = c.id AND v.actor_id = p_actor),
           c.last_message_at DESC
  LIMIT 40;
END;
$$;

-- La boîte Messages : les conversations dont cet acteur est membre, la plus récente d'abord.
CREATE OR REPLACE FUNCTION public.mes_conversations(p_actor UUID)
RETURNS TABLE (
  id UUID, kind public.conversation_kind, title TEXT, created_by UUID, mot TEXT,
  event_id UUID, event_name TEXT, event_tags TEXT[], event_image TEXT,
  expires_at TIMESTAMPTZ, closed_at TIMESTAMPTZ, last_message_at TIMESTAMPTZ,
  last_body TEXT, last_media_kind public.message_media, last_author UUID, last_author_label TEXT,
  unread INTEGER, muted BOOLEAN, member_count INTEGER, others JSONB
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  RETURN QUERY
  SELECT c.id, c.kind, c.title, c.created_by, c.mot,
         c.event_id, e.name, e.tags, e.image_url,
         c.expires_at, c.closed_at, c.last_message_at,
         last.body, last.media_kind, last.author_actor, lap.label,
         (SELECT count(*)::int FROM messages m
          WHERE m.conversation_id = c.id AND m.created_at > me.last_read_at
            AND m.author_actor <> p_actor),
         me.muted,
         (SELECT count(*)::int FROM conversation_members x WHERE x.conversation_id = c.id),
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object('id', o.actor_id, 'label', o.label, 'avatar', o.avatar_url))
           FROM (SELECT x.actor_id, p.label, p.avatar_url
                 FROM conversation_members x JOIN actor_public p ON p.actor_id = x.actor_id
                 WHERE x.conversation_id = c.id AND x.actor_id <> p_actor
                 ORDER BY x.joined_at LIMIT 3) o
         ), '[]'::jsonb)
  FROM conversation_members me
  JOIN conversations c ON c.id = me.conversation_id
  LEFT JOIN events e ON e.id = c.event_id AND e.is_private = false
  LEFT JOIN LATERAL (
    SELECT m.body, m.media_kind, m.author_actor FROM messages m
    WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1
  ) last ON true
  LEFT JOIN actor_public lap ON lap.actor_id = last.author_actor
  WHERE me.actor_id = p_actor
  ORDER BY c.last_message_at DESC
  LIMIT 200;
END;
$$;

-- ── Droits d'exécution ───────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION
  public.my_actor_ids(), public.actor_sees_sujet(UUID, UUID), public.sujet_is_open(UUID),
  public.can_see_conversation(UUID), public.can_see_discussion_media(TEXT),
  public.publier_sujet(UUID, TEXT, public.sujet_audience, UUID, TEXT, public.message_media),
  public.envoyer_message(UUID, UUID, TEXT, TEXT, public.message_media),
  public.ouvrir_conversation(UUID, UUID[], TEXT), public.cloturer_sujet(UUID, UUID),
  public.marquer_lu(UUID, UUID), public.ajouter_membres(UUID, UUID, UUID[]),
  public.renommer_groupe(UUID, UUID, TEXT), public.quitter_conversation(UUID, UUID),
  public.regler_sourdine(UUID, UUID, BOOLEAN), public.sujets_du_moment(UUID),
  public.mes_conversations(UUID)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.my_actor_ids(), public.actor_sees_sujet(UUID, UUID), public.sujet_is_open(UUID),
  public.can_see_conversation(UUID), public.can_see_discussion_media(TEXT),
  public.publier_sujet(UUID, TEXT, public.sujet_audience, UUID, TEXT, public.message_media),
  public.envoyer_message(UUID, UUID, TEXT, TEXT, public.message_media),
  public.ouvrir_conversation(UUID, UUID[], TEXT), public.cloturer_sujet(UUID, UUID),
  public.marquer_lu(UUID, UUID), public.ajouter_membres(UUID, UUID, UUID[]),
  public.renommer_groupe(UUID, UUID, TEXT), public.quitter_conversation(UUID, UUID),
  public.regler_sourdine(UUID, UUID, BOOLEAN), public.sujets_du_moment(UUID),
  public.mes_conversations(UUID)
TO authenticated;

-- ── Temps réel : le fil se met à jour sans recharger ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ── Bucket `discussions` (privé, créé à la main) ─────────────────────────────────────────────────
CREATE POLICY discussions_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'discussions' AND public.can_act_as(((storage.foldername(name))[1])::uuid));
CREATE POLICY discussions_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'discussions' AND (
    public.can_act_as(((storage.foldername(name))[1])::uuid) OR public.can_see_discussion_media(name)
  ));
CREATE POLICY discussions_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'discussions' AND public.can_act_as(((storage.foldername(name))[1])::uuid));
