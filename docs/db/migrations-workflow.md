# Migrations SQL — workflow Fellowship

> Comment on écrit et applique une migration ici. À lire AVANT d'en écrire une.
> Les pièges de contenu (schéma, RPC, RLS, triggers) sont dans [`gotchas.md`](./gotchas.md).

---

## La base est la PRODUCTION

Il n'y a **pas** de base de dev séparée. Le projet lié est la base que servent le
site déployé et les iframes des clients payants.

Conséquences, non négociables :

- Toute migration appliquée touche des utilisateurs réels **immédiatement**.
- Tout changement non rétro-compatible (`REVOKE`, `DROP`, renommage de colonne,
  changement de forme de retour d'une RPC) **casse le frontend déjà déployé**.
  Le code compatible se déploie **avant** la migration, jamais l'inverse.
- Prévenir Uriel avant un changement de cette nature. Ce n'est pas une formalité.
- Pas de comptes ni de données bidon « pour tester » : ça pollue la prod.

---

## Création d'un fichier

1. **Horodaté**, dans `supabase/migrations/`, format `AAAAMMJJhhmmss_description.sql`.
   C'est la convention native du CLI Supabase — 94 fichiers la suivent depuis
   `20260404110000_cleanup_old_schema.sql`. Ne pas inventer de numérotation.
2. **Un horodatage = un seul fichier.** Deux fichiers à la même version et le CLI
   en marque un « appliqué » et considère l'autre « en attente » à chaque push.
3. **En-tête commenté obligatoire — le POURQUOI**, pas le quoi. Trois à cinq
   lignes. Graphify lit ces commentaires comme description du nœud : c'est ce que
   je relirai dans six semaines.

   ```sql
   -- Plan 4 / Phase 5b : DROP TABLE profiles. Etape finale et irreversible.
   -- Prerequis faits : toutes les lectures applicatives sont rebranchees sur
   -- users/entities/memberships. Plus aucune FK vers profiles.
   ```

4. **Avant tout `CREATE OR REPLACE FUNCTION`** : récupérer la définition **LIVE**
   comme base de départ, jamais reconstruire depuis un fichier de migration ancien.

   ```sql
   select pg_get_functiondef('public.get_network_reviews(uuid)'::regprocedure);
   ```

   Une fonction est souvent enrichie par plusieurs migrations successives.
   Repartir d'une vieille version fait sauter les enrichissements **en silence**.
   Détail de la procédure : `gotchas.md` → « Lire avant de réécrire ».

---

## Application — canal unique : `db push`

```bash
npx supabase db push --dry-run --linked   # contrôle : ce qui SERAIT appliqué
npx supabase db push --linked             # applique + enregistre l'historique
```

Le `--dry-run` n'est pas optionnel. C'est le seul filet avant la prod.

Workflow complet : écrire le fichier → `db push --dry-run` → lire ce qu'il annonce
→ `db push` → **vérifier en prod**.

### Sous Windows, si `npx` coince

Le binaire est présent en direct, et c'est souvent le plus fiable :

```bash
node_modules/supabase/bin/supabase.exe db push --linked
```

Identifiants dans `.env` : `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`.
Le projet est déjà lié (`supabase/.temp/project-ref`). Je pousse moi-même — on ne
demande pas à Uriel d'appliquer à la main, sauf panne totale du CLI.

---

## MCP Supabase : lecture oui, écriture non

La frontière n'est pas « CLI contre MCP », elle est **lecture contre écriture**.

### ✅ Lecture — libre, et même encouragée

Introspection (`pg_get_functiondef`, `information_schema`), logs, advisors
sécurité, liste des migrations distantes. Aucun risque, gain réel, et ça sert
directement la règle « ne jamais deviner un nom de colonne ».

### ❌ Écriture — `apply_migration` n'est pas le canal

Il applique en prod **sans écrire le fichier local**. Résultat : le repo perd la
migration, `graphify-out/graph.json` ment, et le prochain `db push` se plante sur
« Remote migration versions not found in local ».

Secours d'urgence uniquement, si `db push` est cassé. Dans ce cas, **écrire le
`.sql` local dans la foulée**, avec la version que le MCP a enregistrée, sans
exception et sans remettre à plus tard.

Même logique pour le SQL editor du dashboard : il applique sans laisser de trace
dans le repo.

---

## Réparer l'historique

```bash
npx supabase migration repair --status applied  <version> --linked   # marque appliqué SANS rejouer
npx supabase migration repair --status reverted <version> --linked   # retire la ligne d'historique
```

`repair` ne touche **que** la table de bookkeeping — jamais le schéma, jamais les
données. C'est l'outil quand `db push` refuse de tourner parce que le distant et
le local ne sont plus d'accord sur ce qui a été appliqué.

Symptôme typique : `Remote migration versions not found in local`. Cause quasi
systématique : quelque chose a été appliqué hors `db push`.

---

## Avant un backfill massif

Les triggers `AFTER INSERT` s'exécutent **ligne par ligne**, y compris sur un
INSERT multi-lignes. Sur des milliers de lignes, ce sont des milliers d'effets de
bord — notifications, entrées de journal, e-mails.

Avant tout INSERT de plus de 100 lignes : se demander quels triggers vont partir,
et si leurs effets sont souhaitables à cette échelle. Si non, les couper :

```sql
ALTER TABLE ma_table DISABLE TRIGGER USER;
-- backfill
ALTER TABLE ma_table ENABLE TRIGGER USER;
```

---

## Après une modification SQL

Le hook `post-commit` de Graphify régénère le graphe sur les fichiers de code.
Après une migration, vérifier que les nouveaux nœuds (tables, RPCs) sont bien
apparus dans `graphify-out/graph.json` — sinon je chercherai à l'aveugle la
prochaine fois.

**Invariant à tenir** : tout DDL passe par un fichier de migration horodaté.
Sinon le live diverge du graphe en silence, et le graphe devient un piège au lieu
d'une carte.
