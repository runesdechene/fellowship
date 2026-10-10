-- POURQUOI : relecture du lot 8e (10/10/2026), dont la relecture de sécurité. Une adresse d'envoi
-- quelconque ferait poster la fonction send-push n'importe où : la table n'accepte plus que les
-- services de notification des navigateurs (même liste que isPushEndpoint, lib/push-lines.ts).
-- Une contrainte, et pas seulement la RPC : la politique « propriétaire seulement » permet aussi
-- d'écrire la table directement. La RPC refuse en plus des clés vides.
-- Le déclencheur laisse 10 s à la fonction (5 s par défaut) : réveil à froid + tous les membres
-- d'une enseigne. Définitions reprises ENTIÈRES de 20261010090100 et 20261010090300.
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_endpoint_host CHECK (
    endpoint ~ '^https://(fcm\.googleapis\.com|web\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)/'
  );

CREATE OR REPLACE FUNCTION public.register_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF coalesce(p_p256dh, '') = '' OR coalesce(p_auth, '') = '' THEN
    RAISE EXCEPTION 'clés de l''abonnement manquantes';
  END IF;
  INSERT INTO push_subscriptions (user_id, endpoint, keys)
  VALUES (auth.uid(), p_endpoint, jsonb_build_object('p256dh', p_p256dh, 'auth', p_auth))
  ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, keys = EXCLUDED.keys;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_send_push()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fn_url text;
  fn_secret text;
BEGIN
  SELECT decrypted_secret INTO fn_url FROM vault.decrypted_secrets WHERE name = 'send_push_url';
  SELECT decrypted_secret INTO fn_secret FROM vault.decrypted_secrets WHERE name = 'push_trigger_secret';
  IF fn_url IS NULL OR fn_secret IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := fn_url,
    body := jsonb_build_object('notification_id', NEW.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Push-Secret', fn_secret),
    timeout_milliseconds := 10000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END; $$;
