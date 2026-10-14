-- POURQUOI — 12/10/2026, à la demande d'Uriel : donner la V2 (et elle seule) à une exposante, sans
-- les pouvoirs d'admin. Un rôle `v2` ouvre la V2 ; la V1 renvoie ce rôle vers la V2.
-- En le posant, un trou est apparu : la politique `users_update_self` laisse chacun écrire SA ligne,
-- colonne `role` comprise — n'importe quel compte pouvait se nommer admin. Le rôle ne change plus
-- que par un admin (politique `admin_update_users`) ou par le serveur (sans auth.uid()), comme les
-- colonnes d'abonnement des enseignes (protect_entity_plan, lot 9b).
CREATE FUNCTION public.protect_user_role() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.role IS DISTINCT FROM OLD.role AND NOT is_admin() THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_user_role BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_role();

-- La porte de la V2 : les admins, et le rôle `v2`.
CREATE FUNCTION public.can_use_v2() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE actor_id = auth.uid() AND role IN ('admin', 'v2'));
$$;
REVOKE ALL ON FUNCTION public.can_use_v2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_v2() TO authenticated;
