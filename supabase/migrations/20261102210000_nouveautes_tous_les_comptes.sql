-- POURQUOI : les Nouveautés s'adressent à tous les comptes, exposants ou non (Uriel, 02/11/2026).
-- Jusqu'ici seuls les membres d'une enseigne exposant recevaient la notification et l'e-mail
-- (42 comptes sur 61). Définition live relue le 02/11/2026 avant remplacement.
CREATE OR REPLACE FUNCTION public.app_update_people()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.actor_id
  FROM users u
  WHERE u.suspended_at IS NULL
$function$;

-- La 3.19.0 (affiches par défaut) devait partir en « Grosse » : elle est passée en « Petite » par
-- erreur. Rien n'est renvoyé ici ; l'e-mail part quand Uriel clique « Envoyer l'e-mail » dans
-- l'administration (fonction app-update-email, un seul envoi).
UPDATE public.app_updates
SET weight = 'big'
WHERE version = '3.19.0' AND weight = 'small' AND email_sent_at IS NULL;
