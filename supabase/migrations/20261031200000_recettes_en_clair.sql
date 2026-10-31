-- POURQUOI : le bandeau « Chiffre tes recettes » de Mes bilans (Uriel, 31/10/2026). Une enseigne
-- sans phrase de passe y est invitée à en choisir une ; « Garder en clair » refuse, et ce refus doit
-- tenir sur tous ses appareils : il vit donc en base, pas dans le navigateur. Il ne sert plus qu'à
-- montrer « Chiffrer mes recettes » dans Réglages · Compte. Une phrase créée ensuite le rend sans
-- effet (l'écran ne le lit que tant que l'enseigne n'a pas de phrase).
-- Purement additif : une colonne nulle par défaut. L'écriture passe par la policy
-- entities_update_member (can_act_as) déjà en place ; la lecture par mes_enseignes() (select e.*),
-- comme cancel_at : aucun grant par colonne, ce choix ne regarde que l'enseigne.

alter table public.entities add column revenue_clear_chosen_at timestamptz;

comment on column public.entities.revenue_clear_chosen_at is
  'Quand l''enseigne a choisi de garder ses recettes en clair (bandeau de Mes bilans) ; null tant qu''elle n''a rien choisi.';

