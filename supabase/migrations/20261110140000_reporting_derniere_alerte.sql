-- POURQUOI : l'e-mail du matin répétait chaque jour les mêmes journées bloquées (Uriel, 10/11/2026).
-- On garde le texte du dernier e-mail parti : il ne repart que s'il a changé, ou à l'approche d'une
-- échéance. Écrit par la fonction reporting-quotidien seule (rôle service), jamais par l'écran.
alter table public.reporting_entreprises add column derniere_alerte text;
