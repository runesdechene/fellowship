-- Ajout de la valeur d'enum AVANT la migration qui crée le trigger l'utilisant.
-- Fichier séparé : une valeur d'enum ne peut pas être employée dans la même
-- transaction que son ALTER TYPE ADD VALUE. Isoler l'ajout garantit qu'elle est
-- committée avant tout emploi (trigger notify_review_reply).
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'review_reply';
