# Registre de purge du back

Tout objet back croisé et douteux — RPC inutile, colonne héritée de la V1, policy trop large —
s'inscrit ici, **dans le même commit** que le travail qui l'a croisé. Une ligne par objet : ce
que c'est, pourquoi il est douteux, ce qu'il faudra faire.

**Pas de DROP tant que la V1 tourne.**

## Registre

| Objet | Pourquoi il est douteux | À faire |
|---|---|---|
| ~~Policy `participations_select`~~ | Réglé le 11/10/2026 (migration `20261011170000`, accord d'Uriel) : « amis » ne se lit plus que par un ami, de la personne ou d'une de ses enseignes | — |
| Colonnes d'abonnement de `entities` | La politique `entities_update_member` laisse tout membre modifier `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `current_period_end`, `trial_end`, `discount_*`, `billing_interval` (plan, Pro offert, Ambassadeur et Certifié, eux, sont protégés par déclencheur) — vu au lot 6b, 11/10/2026 | Les protéger comme `plan` (déclencheur) ou retirer ces colonnes du droit UPDATE — **sécurité, à trancher avec Uriel**, la V1 écrit peut-être certaines |
| RPC `get_network_follow_activity` | La V2 ne la lit plus (lot 9a : `community_feed`) ; la V1 oui (`use-community.ts`) | À retirer avec la V1 |
