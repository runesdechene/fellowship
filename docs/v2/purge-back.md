# Registre de purge du back

Tout objet back croisé et douteux — RPC inutile, colonne héritée de la V1, policy trop large —
s'inscrit ici, **dans le même commit** que le travail qui l'a croisé. Une ligne par objet : ce
que c'est, pourquoi il est douteux, ce qu'il faudra faire.

**Pas de DROP tant que la V1 tourne.**

## Registre

| Objet | Pourquoi il est douteux | À faire |
|---|---|---|
| ~~Policy `participations_select`~~ | Réglé le 11/10/2026 (migration `20261011170000`, accord d'Uriel) : « amis » ne se lit plus que par un ami, de la personne ou d'une de ses enseignes | — |
| ~~Colonnes d'abonnement de `entities`~~ | Réglé le 11/10/2026 (migration `20261011190000`, accord d'Uriel, lot 9b) : le déclencheur `protect_entity_plan` les remet à leur valeur pour toute session utilisateur ; seules les fonctions serveur les écrivent | — |
| RPC `get_network_follow_activity` | La V2 ne la lit plus (lot 9a : `community_feed`) ; la V1 oui (`use-community.ts`) | À retirer avec la V1 |
