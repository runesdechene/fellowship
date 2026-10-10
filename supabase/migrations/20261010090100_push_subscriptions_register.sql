-- POURQUOI : lot 8e. push_subscriptions existe depuis le premier schéma, vide et jamais servie :
-- elle garde l'adresse d'envoi de chaque téléphone (endpoint + clés), rattachée à la personne.
-- Un téléphone = une ligne (unicité de endpoint). S'inscrire passe par une RPC parce qu'un
-- téléphone déjà inscrit au nom d'un autre (un poste partagé) doit passer à la personne connectée,
-- ce que la politique « propriétaire seulement » interdirait. Couper = effacer sa propre ligne,
-- ce que cette politique permet déjà.
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);

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
