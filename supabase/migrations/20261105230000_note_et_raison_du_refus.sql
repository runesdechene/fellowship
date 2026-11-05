-- POURQUOI : retour d'une artisane en bêta (05/11/2026) : la V2 avait perdu les notes personnelles
-- d'une date et la raison d'un refus. Uriel (05/11/2026, maquette Figma 2789:233) : une note libre
-- par date et une raison de refus, visibles par l'exposant seul.
-- Les deux vivent dans participation_dossiers, lisible par son seul propriétaire
-- (participation_dossiers_own). La raison quitte participations.refusal_note : cette colonne se
-- lisait par tous, même sans compte, sur une participation publique.
-- Reprise : les notes de la V1 (table notes, 18 lignes dont 3 « amis ») se réunissent par date, de
-- la plus ancienne à la plus récente ; les 4 raisons de refus suivent. La table notes et la colonne
-- refusal_note restent jusqu'au retrait de la V1 (docs/v2/purge-back.md).

ALTER TABLE public.participation_dossiers
  ADD COLUMN note text,
  ADD COLUMN refusal_reason text;

INSERT INTO public.participation_dossiers (actor_id, event_id, note, updated_at)
SELECT n.actor_id, n.event_id, string_agg(n.content, E'\n\n' ORDER BY n.created_at), now()
FROM public.notes n
WHERE n.actor_id IS NOT NULL AND btrim(n.content) <> ''
GROUP BY n.actor_id, n.event_id
ON CONFLICT (actor_id, event_id) DO UPDATE SET note = EXCLUDED.note;

INSERT INTO public.participation_dossiers (actor_id, event_id, refusal_reason, updated_at)
SELECT p.actor_id, p.event_id, p.refusal_note, now()
FROM public.participations p
WHERE btrim(coalesce(p.refusal_note, '')) <> ''
ON CONFLICT (actor_id, event_id) DO UPDATE SET refusal_reason = EXCLUDED.refusal_reason;

UPDATE public.participations SET refusal_note = NULL WHERE refusal_note IS NOT NULL;
