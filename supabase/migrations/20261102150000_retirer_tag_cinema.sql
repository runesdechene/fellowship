-- POURQUOI : un festival de cinéma ne prend pas d'exposants (Uriel, 02/11/2026). Proposer la
-- catégorie promet des stands qui n'existent pas. Aucune fiche ne la porte (0 sur 115, vérifié
-- le 02/11/2026) : rien à reclasser.
delete from public.tags where slug = 'cinema';
