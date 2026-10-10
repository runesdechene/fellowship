-- POURQUOI : lot 8e. Chaque notification écrite dans la cloche part aussi vers la fonction en
-- ligne send-push, qui décide qui la reçoit sur son téléphone. L'adresse de la fonction et le
-- secret d'en-tête vivent dans le Vault (jamais en clair dans une migration) ; tant qu'ils
-- manquent, rien ne part.
-- ATTENTION : l'envoi ne doit JAMAIS empêcher la notification d'être écrite — toute erreur est
-- avalée. pg_net n'attend pas la réponse : l'insertion ne ralentit pas.
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
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Push-Secret', fn_secret)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_send_push() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_notification_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_send_push();
