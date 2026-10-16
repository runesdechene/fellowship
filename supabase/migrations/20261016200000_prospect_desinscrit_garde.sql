-- POURQUOI : relecture finale du lot 3b. Un prospect désinscrit qu'on supprimait pouvait revenir par
-- un réimport CSV, sans sa désinscription, et recevoir de nouveau des e-mails : la promesse « plus
-- jamais » ne tenait pas. Un prospect désinscrit ne se supprime donc plus. La politique unique
-- prospects_admin (20261016140000) est découpée par opération pour poser cette condition sur DELETE.

drop policy prospects_admin on public.prospects;

create policy prospects_admin_lecture on public.prospects for select to authenticated
  using ((select public.is_admin()));
create policy prospects_admin_ajout on public.prospects for insert to authenticated
  with check ((select public.is_admin()));
create policy prospects_admin_modif on public.prospects for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy prospects_admin_suppression on public.prospects for delete to authenticated
  using ((select public.is_admin()) and unsubscribed_at is null);
