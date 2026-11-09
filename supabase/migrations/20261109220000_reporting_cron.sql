-- POURQUOI : chaque matin, reporting-quotidien lit les ventes de la veille et envoie les journées
-- prêtes à SuperPDP (bac à sable seulement, garde dans la fonction). L'adresse et le secret d'en-tête
-- vivent dans le Vault ; tant qu'ils manquent, rien ne part.
create function public.reporting_lancer_quotidien()
returns void language plpgsql security definer set search_path = public as $$
declare
  fn_url text;
  fn_secret text;
begin
  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'reporting_quotidien_url';
  select decrypted_secret into fn_secret from vault.decrypted_secrets where name = 'reporting_trigger_secret';
  if fn_url is null or fn_secret is null then return; end if;

  perform net.http_post(
    url := fn_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Reporting-Secret', fn_secret),
    timeout_milliseconds := 120000
  );
end; $$;
revoke execute on function public.reporting_lancer_quotidien() from public, anon, authenticated;

-- 5 h UTC : la veille est finie, à Paris comme ailleurs.
select cron.schedule('reporting-quotidien', '0 5 * * *', 'select public.reporting_lancer_quotidien()');
