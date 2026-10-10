# Registre de purge du back

Tout objet back croisé et douteux — RPC inutile, colonne héritée de la V1, policy trop large —
s'inscrit ici, **dans le même commit** que le travail qui l'a croisé. Une ligne par objet : ce
que c'est, pourquoi il est douteux, ce qu'il faudra faire.

**Pas de DROP tant que la V1 tourne.**

## Registre

| Objet | Pourquoi il est douteux | À faire |
|---|---|---|
| Policy `participations_select` | Trop large : une participation `inscrit` marquée `amis` est lisible par tout compte connecté (`visibility <> 'prive'`), pas seulement par les amis — vu au lot 9a, 11/10/2026 | À resserrer (`public`, ou `amis` ET `are_friends`) — **sécurité, à trancher avec Uriel**, la V1 en dépend |
| RPC `get_network_follow_activity` | La V2 ne la lit plus (lot 9a : `community_feed`) ; la V1 oui (`use-community.ts`) | À retirer avec la V1 |
