-- POURQUOI — slug est NOT NULL depuis 20261025110000, mais c'est trg_events_set_slug qui le pose à
-- chaque insertion : sans défaut, les types générés exigeaient un slug du client à la création.
-- Le défaut vide n'est jamais gardé, le trigger le remplace toujours.
ALTER TABLE events ALTER COLUMN slug SET DEFAULT '';
