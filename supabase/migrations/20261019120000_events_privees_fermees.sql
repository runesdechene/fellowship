-- POURQUOI : `anon_read_events` et `events_select_authenticated` lisaient tout (`true`) : une fiche
-- privée se lisait en interrogeant `events` directement, même sans compte — les apps ne la
-- cachaient qu'à l'affichage (relevé au lot 10c, docs/v2/purge-back.md). Décision d'Uriel
-- (12/10/2026) : une fiche privée ne se lit que par son créateur (et les admins).
-- Vérifié le 19/10/2026 : 2 fiches privées, aucune participation d'un tiers — personne ne perd de date.
-- Les fonctions SECURITY DEFINER (notifications, histoire d'une fiche) ne sont pas concernées.

drop policy anon_read_events on public.events;
create policy anon_read_events on public.events
  for select to anon
  using (not is_private);

drop policy events_select_authenticated on public.events;
create policy events_select_authenticated on public.events
  for select to authenticated
  using (not is_private or can_act_as(created_by_actor) or is_admin());
