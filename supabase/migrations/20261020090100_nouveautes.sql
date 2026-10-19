-- POURQUOI : les Nouveautés (spec docs/superpowers/specs/2026-10-19-v2-nouveautes-design.md, Uriel,
-- 19/10/2026). L'admin publie les mises à jour de Fellowship ; les exposants y mettent un cœur (un
-- par personne) et en parlent (commentaires avec réponses, signés « Prénom (Enseigne) »). Une petite
-- mise à jour sonne sur le téléphone ; une grosse part en plus par e-mail (fonction app-update-email).
-- Tout est additif : le code déployé ne lit aucun de ces objets.

-- Les notes. Publier passe par publish_app_update (la note ET les notifications d'un coup) ;
-- corriger une note est un simple UPDATE admin : rien ne repart.
CREATE TABLE public.app_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL CHECK (length(trim(version)) BETWEEN 1 AND 20),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 10000),
  image_url text,
  weight text NOT NULL CHECK (weight IN ('small', 'big')),
  author_id uuid REFERENCES public.actors(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  -- Posé par app-update-email AVANT l'envoi, en une écriture : c'est lui qui interdit le second envoi.
  email_sent_at timestamptz,
  email_count integer
);
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_updates_select ON public.app_updates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY app_updates_admin_update ON public.app_updates
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY app_updates_admin_delete ON public.app_updates
  FOR DELETE TO authenticated USING (public.is_admin());
-- Le poids et l'envoi ne se changent pas après coup : seules ces colonnes s'écrivent depuis l'app.
REVOKE UPDATE ON public.app_updates FROM authenticated;
GRANT UPDATE (version, title, body, image_url) ON public.app_updates TO authenticated;

-- Un cœur par personne : la clé primaire le garantit.
CREATE TABLE public.app_update_hearts (
  update_id uuid NOT NULL REFERENCES public.app_updates(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (update_id, actor_id)
);
ALTER TABLE public.app_update_hearts ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_update_hearts_select ON public.app_update_hearts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY app_update_hearts_insert ON public.app_update_hearts
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
CREATE POLICY app_update_hearts_delete ON public.app_update_hearts
  FOR DELETE TO authenticated USING (actor_id = auth.uid());

-- Les commentaires : écrits par la personne (actor_id), au nom de l'enseigne qu'elle incarne
-- (entity_actor_id). parent_id : le commentaire auquel on répond ; l'affichage range tout sous la racine.
CREATE TABLE public.app_update_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES public.app_updates(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.app_update_comments(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  entity_actor_id uuid REFERENCES public.actors(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_update_comments_update ON public.app_update_comments (update_id, created_at);
CREATE INDEX app_update_comments_parent ON public.app_update_comments (parent_id);
ALTER TABLE public.app_update_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_update_comments_select ON public.app_update_comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY app_update_comments_insert ON public.app_update_comments
  FOR INSERT TO authenticated WITH CHECK (
    actor_id = auth.uid() AND (entity_actor_id IS NULL OR public.can_act_as(entity_actor_id))
  );
CREATE POLICY app_update_comments_delete ON public.app_update_comments
  FOR DELETE TO authenticated USING (actor_id = auth.uid() OR public.is_admin());

-- La pastille : allumée quand une note est plus récente que la dernière visite de la page. Les comptes
-- existants et neufs partent de maintenant : pas de pastille pour les notes d'avant.
-- La désinscription des e-mails : un jeton par personne (même forme que celui des prospects, pour que
-- la fonction prospect-unsubscribe serve les deux), et le refus qu'il pose.
ALTER TABLE public.users
  ADD COLUMN updates_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updates_email_off boolean NOT NULL DEFAULT false,
  ADD COLUMN email_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex');

-- La ligne « Nouveautés de Fellowship » des réglages du téléphone.
ALTER TABLE public.users DROP CONSTRAINT users_push_muted_lines;
ALTER TABLE public.users ADD CONSTRAINT users_push_muted_lines CHECK (
  push_muted <@ ARRAY['deadline', 'new_edition', 'suggestions', 'friends', 'discussions', 'new_followers', 'weekly', 'updates']
);

-- Les images des notes : lecture publique, écriture admin (modèle testimonials, mêmes pièges).
INSERT INTO storage.buckets (id, name, public) VALUES ('app-updates', 'app-updates', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
CREATE POLICY "app_updates_storage_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'app-updates');
CREATE POLICY "app_updates_storage_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'app-updates' AND public.is_admin());
CREATE POLICY "app_updates_storage_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'app-updates' AND public.is_admin());
CREATE POLICY "app_updates_storage_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'app-updates' AND public.is_admin());

-- Le public des Nouveautés : chaque personne membre d'au moins une enseigne exposant, une seule fois
-- même si elle en a plusieurs (les festivaliers ne comptent pas, Uriel).
CREATE FUNCTION public.app_update_people()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT m.user_actor_id
  FROM memberships m JOIN entities e ON e.actor_id = m.entity_actor_id
  WHERE e.type = 'exposant'
$$;
REVOKE EXECUTE ON FUNCTION public.app_update_people() FROM PUBLIC, anon, authenticated;

-- Publier : la note, puis une notification par personne du public ; le push suit par le
-- déclencheur on_notification_send_push.
CREATE FUNCTION public.publish_app_update(
  p_version text, p_title text, p_body text, p_image_url text, p_weight text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  INSERT INTO app_updates (version, title, body, image_url, weight, author_id)
  VALUES (trim(p_version), trim(p_title), trim(p_body), p_image_url, p_weight, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO notifications (actor_id, type, data)
  SELECT person, 'app_update',
         jsonb_build_object('update_id', new_id, 'title', trim(p_title), 'version', trim(p_version))
  FROM public.app_update_people() AS person;
  RETURN new_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.publish_app_update(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_app_update(text, text, text, text, text) TO authenticated;

-- Qui reçoit l'e-mail d'une grosse : le public, avec une adresse, pas désinscrit, une fois par adresse.
CREATE FUNCTION public.app_update_email_recipients()
RETURNS TABLE (email text, token text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (lower(u.email)) u.email, u.email_token
  FROM users u
  WHERE u.actor_id IN (SELECT public.app_update_people())
    AND u.email IS NOT NULL AND NOT u.updates_email_off AND u.suspended_at IS NULL
  ORDER BY lower(u.email), u.created_at, u.actor_id
$$;
REVOKE EXECUTE ON FUNCTION public.app_update_email_recipients() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_update_email_recipients() TO service_role;

-- Le nombre annoncé dans l'admin (« Un e-mail partira à N exposants »).
CREATE FUNCTION public.app_update_audience()
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN (SELECT count(*) FROM public.app_update_email_recipients());
END; $$;
REVOKE EXECUTE ON FUNCTION public.app_update_audience() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_update_audience() TO authenticated;

-- Qui est prévenu d'un commentaire (Uriel, 19/10/2026) : une réponse prévient l'auteur du commentaire
-- visé ; un commentaire de premier niveau prévient les admins, pour qu'Uriel réponde. Jamais soi-même.
CREATE FUNCTION public.notify_app_update_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  said jsonb;
BEGIN
  SELECT jsonb_build_object(
           'update_id', NEW.update_id,
           'comment_id', NEW.id,
           'title', (SELECT title FROM app_updates WHERE id = NEW.update_id),
           'actor_name', u.display_name || coalesce(' (' || e.brand_name || ')', ''))
    INTO said
    FROM users u LEFT JOIN entities e ON e.actor_id = NEW.entity_actor_id
    WHERE u.actor_id = NEW.actor_id;

  IF NEW.parent_id IS NULL THEN
    INSERT INTO notifications (actor_id, type, data)
    SELECT u.actor_id, 'app_update_comment', said
    FROM users u WHERE u.role = 'admin' AND u.actor_id <> NEW.actor_id;
  ELSE
    INSERT INTO notifications (actor_id, type, data)
    SELECT c.actor_id, 'app_update_reply', said
    FROM app_update_comments c WHERE c.id = NEW.parent_id AND c.actor_id <> NEW.actor_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_app_update_comment
  AFTER INSERT ON public.app_update_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_app_update_comment();
