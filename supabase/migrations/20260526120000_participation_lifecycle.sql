-- Participation lifecycle refonte :
-- 1) Nouvelle valeur d'enum « refuse » (dossier refusé).
-- 2) Le paiement n'a plus que deux états : a_payer / paye. On retombe en_cours_paiement -> a_payer.
-- Note : ADD VALUE ne peut pas être utilisé dans la même transaction que sa première utilisation,
-- mais l'UPDATE ci-dessous ne référence PAS 'refuse' (payment_status est une colonne texte libre),
-- donc les deux instructions cohabitent sans souci.

ALTER TYPE participation_status ADD VALUE IF NOT EXISTS 'refuse';

UPDATE participations
SET payment_status = 'a_payer'
WHERE payment_status = 'en_cours_paiement';
