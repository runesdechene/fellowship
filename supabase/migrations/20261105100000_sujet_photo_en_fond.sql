-- 20261105100000_sujet_photo_en_fond.sql
--
-- POURQUOI — Uriel veut pouvoir poser la photo d'un sujet en fond plein écran, au lieu du papier
-- au logo (05/11/2026, maquette Story « La photo en fond ») : une seule photo, un seul envoi, et
-- un choix à la publication, « Affiche » (comme avant) ou « Fond ».
--
-- Additif : la colonne a une valeur par défaut, et le paramètre ajouté à publier_sujet aussi, donc
-- le code déployé continue d'appeler la fonction sans le connaître. Ajouter un paramètre crée une
-- autre fonction : l'ancienne signature est retirée dans la même transaction, puis les droits sont
-- reposés. Définition reprise entière de la version en ligne (20261104140000).

ALTER TABLE public.conversations
  ADD COLUMN media_fond BOOLEAN NOT NULL DEFAULT false,
  -- Seule une photo se pose en fond ; une vidéo reste en affiche.
  ADD CONSTRAINT conversations_fond_photo CHECK (NOT media_fond OR media_kind = 'image');

DROP FUNCTION public.publier_sujet(UUID, TEXT, public.sujet_audience, UUID, TEXT, public.message_media);

CREATE FUNCTION public.publier_sujet(
  p_actor UUID, p_mot TEXT, p_audience public.sujet_audience, p_event UUID DEFAULT NULL,
  p_media_path TEXT DEFAULT NULL, p_media_kind public.message_media DEFAULT NULL,
  p_media_fond BOOLEAN DEFAULT false
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT can_act_as(p_actor) THEN RAISE EXCEPTION 'Action non autorisée.'; END IF;
  IF NOT media_belongs_to(p_media_path, p_actor) THEN RAISE EXCEPTION 'Média invalide.'; END IF;

  INSERT INTO conversations (kind, created_by, mot, audience, event_id, media_path, media_kind,
                             media_fond, expires_at)
  VALUES ('sujet', p_actor, btrim(p_mot), p_audience, p_event, p_media_path, p_media_kind,
          p_media_fond, now() + interval '7 days')
  RETURNING id INTO v_id;

  INSERT INTO conversation_members (conversation_id, actor_id) VALUES (v_id, p_actor);
  -- Le mot est aussi le premier message du fil, avec son média.
  INSERT INTO messages (conversation_id, author_actor, body, media_path, media_kind)
  VALUES (v_id, p_actor, btrim(p_mot), p_media_path, p_media_kind);
  INSERT INTO sujet_views (conversation_id, actor_id) VALUES (v_id, p_actor);
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.publier_sujet(UUID, TEXT, public.sujet_audience, UUID, TEXT, public.message_media, BOOLEAN)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.publier_sujet(UUID, TEXT, public.sujet_audience, UUID, TEXT, public.message_media, BOOLEAN)
TO authenticated;
