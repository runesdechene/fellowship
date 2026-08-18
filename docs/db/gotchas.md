# Gotchas BDD — Fellowship

> Pièges récurrents Supabase / PostgreSQL, et schéma qui piège.
> **Lecture obligatoire avant d'écrire une migration, une RPC ou une query.**
>
> Le workflow d'application est dans [`migrations-workflow.md`](./migrations-workflow.md).

---

## Schema DB — ne jamais deviner un nom de colonne

Avant d'écrire une query : vérifier dans `supabase/migrations/20260404120000_initial_schema.sql`,
dans la migration qui a modifié la table, ou via le graphe. **Jamais de mémoire.**

### Le modèle acteur

`actors` est la table pivot. Une personne et une enseigne sont toutes deux des
acteurs, et se distinguent par la table qui les prolonge :

- `users` — la personne. PK = `actor_id`.
- `entities` — la casquette pro. PK = `actor_id`.
- `memberships` — qui appartient à quelle enseigne.

`profiles` **n'existe plus** : droppée le 2 juin 2026
(`20260602170000_drop_profiles_table.sql`). Toute écriture de profil personnel va
sur `users`. Si tu lis `profiles` quelque part, c'est du code mort.

### Table `users`
- ✅ PK = `actor_id` (pas `id`)
- ✅ `auth_id` → `auth.users(id)` — c'est lui qui correspond à `auth.uid()`
- ✅ `email` — **attention, pas `email_address`** (c'est la convention de l'autre
  projet ; les deux schémas diffèrent, ne pas copier l'un sur l'autre)
- ✅ `display_name`, `avatar_url`, `city`, `department`, `postal_code`
- ✅ `plan` (`user_plan`, défaut `free`), `role` (texte, défaut `user`)

### Table `entities`
- ✅ PK = `actor_id`, `brand_name`, `type` (`entity_type`), `craft_type` (texte libre)
- Le forfait **Pro vit sur l'entité**, pas sur la personne. Le gating lit le plan
  de l'acteur actif, jamais celui du compte connecté.

### Table `event_ledger_entries` — la source des montants
```
report_id, actor_id, event_id, label,
amount     numeric NOT NULL CHECK (amount >= 0)   -- toujours positif
direction  text CHECK (direction IN ('in','out'))  -- le sens est ICI
category   text CHECK (category IN ('emplacement','cachet','essence','peage',
                                    'hebergement','repas','remboursement','ventes','autre'))
source     text DEFAULT 'manual' CHECK (source IN ('stepper','manual'))
```

Deux pièges, tous deux déjà payés :

1. **Les montants de bilan viennent d'ICI**, pas des colonnes `revenue`,
   `booth_cost`, `charges` de `event_reports`. Ces trois-là sont un reliquat du
   schéma initial et **ne sont plus alimentées**. Les lire donne des zéros
   crédibles, ce qui est pire qu'une erreur.
2. **Le montant « à régler » est UNE ligne, pas une somme** : celle où
   `source = 'stepper'` et `direction = 'out'`. Un index unique garantit une seule
   ligne `stepper` par bilan (`uniq_ledger_stepper_per_report`). Additionner les
   lignes donne un total faux.

### Table `event_reports`
- ✅ `wins`, `improvements` (`TEXT[]`), `UNIQUE(user_id, event_id)`
- ❌ `booth_cost`, `charges`, `revenue` — **colonnes mortes**, voir ci-dessus

---

## API Supabase JS (côté frontend)

### `.single()` ne lève pas d'exception

`supabase.from(...).select().single()` retourne `{ data: null, error: {...} }` en
cas d'échec. **Jamais d'exception** — le `try/catch` ne se déclenche pas.

```ts
const { data, error } = await supabase.from('events').select('*').eq('id', id).single()
if (error) {
  console.error('events.single error:', error)
  return null
}
```

Le `try/catch` ne sert qu'aux erreurs **réseau** (connexion perdue, timeout).

### RPC : toujours destructurer `{ data, error }`

Sans destructurer, le vrai message Postgres est invisible et le code continue
avec `data === undefined`. `error.details` et `error.hint` portent souvent l'info
qui résout le bug (colonne manquante, contrainte violée).

### Chaque RPC a sa propre forme de retour

**Ne jamais présumer.** Lire la migration qui la définit et vérifier le JSON
retourné avant de consommer le résultat.

### Une RPC neuve n'est pas dans les types générés

`supabase.rpc as any` est le précédent du projet pour débloquer. C'est une dette,
pas une solution : elle se solde en régénérant `src/types/supabase.ts`, pas en
laissant le cast s'installer.

### Toute requête dont on prend « le premier résultat » doit être TRIÉE

Sans `order()` explicite, l'ordre est celui que Postgres choisit ce jour-là. C'est
comme ça que l'enseigne active basculait toute seule et vidait le tableau de bord.

---

## Functions et RPCs

### Lire avant de réécrire — procédure obligatoire

**Reconstruire au lieu de copier = régressions silencieuses.** L'attention se
porte sur le changement voulu et oublie tout le reste.

> ⚠️ « La plus récente » = le **plus haut horodatage**, jamais le nom de fichier
> qui sonne le plus abouti. Un nom en `_fix_`, `_polish_` ou `_final_` ne dit rien
> de l'ordre.

**Procédure :**

1. Récupérer la définition **LIVE** — source de vérité unique :
   ```sql
   select pg_get_functiondef('public.ma_fonction(uuid)'::regprocedure);
   ```
   Les fichiers de migration mentent par omission : une fonction enrichie en
   plusieurs fois n'est complète nulle part ailleurs que dans le live.
2. Copier la définition live **entière** dans la nouvelle migration.
3. Modifier **uniquement** la partie concernée.
4. Comparer chaque comportement avec l'original : colonnes retournées, forme du
   JSON, gardes, `SECURITY DEFINER`, `search_path`.
5. Après application : re-lire `pg_get_functiondef` et confirmer que le delta est
   là **et que rien d'autre n'a sauté**.

### `STABLE` avale les écritures en silence

Une fonction déclarée `STABLE` ne peut pas modifier la base : tout `UPDATE` ou
`INSERT` à l'intérieur est **ignoré sans erreur**. Pour toute fonction qui écrit,
laisser `VOLATILE` (le défaut — ne rien spécifier).

### Ne jamais retirer un champ du retour d'une RPC sans greper son nom

Le frontend fait souvent `data.champ?.something`. Sans le champ, ça retourne
`undefined` et le bug est **silencieux** : pas d'erreur, juste un bouton grisé ou
une liste vide. Greper le nom dans `src/` avant de retirer quoi que ce soit.

---

## RLS et droits

### Lire les données d'un TIERS exige une RPC `SECURITY DEFINER`

Les policies restreignent les lectures à soi-même. Lire le réseau de quelqu'un
d'autre (ses abonnés, ses amis) via un `from('follows')` direct retourne vide —
pas une erreur, du vide. Il faut passer par une RPC `SECURITY DEFINER`.
C'est l'origine du bug des abonnés absents sur la vitrine.

### Une policy sans clause `TO` s'applique à `anon`

```sql
-- ❌ s'applique à PUBLIC, donc à la clé anon publique
CREATE POLICY "service role manages x" ON x FOR ALL USING (true);
-- ✅
CREATE POLICY "service role manages x" ON x FOR ALL TO service_role USING (true);
```

Toujours écrire le `TO`. C'est comme ça qu'on expose des e-mails sans le vouloir.

### Une policy ne lit pas une table en direct

Un `EXISTS (SELECT 1 FROM users WHERE ...)` inline dans une policy est évalué
**avec les droits de l'appelant**. Si `anon` n'a pas accès à `users`, ça ne rend
pas « faux » : ça **plante** la requête. Passer par un helper `SECURITY DEFINER`
comme `public.is_admin()`.

### Cacher des colonnes : révoquer la TABLE d'abord

Un `REVOKE` **par colonne** est **inopérant** tant qu'un `GRANT` au niveau table
subsiste. La séquence correcte :

```sql
REVOKE SELECT ON public.ma_table FROM anon, authenticated;
GRANT  SELECT (colonnes, sûres, seulement) ON public.ma_table TO anon, authenticated;
```

Vérifier ensuite avec `set role anon;` puis un `select` réel. Corollaire : une
fois en liste blanche, **toute nouvelle colonne doit être `GRANT`ée explicitement**
dans la migration qui la crée, et `select('*')` côté front est mort — l'étoile
déplie aussi les colonnes interdites.

---

## Storage

### Un bucket = un jeu COMPLET de policies, SELECT compris

La policy `SELECT` est **indispensable même pour un upload** : `upload({upsert: true})`
lit l'objet (test d'existence, relecture de la ligne). Sans elle, l'upload échoue
en `400 violates RLS` — message parfaitement trompeur, il parle d'écriture alors
que c'est la lecture qui manque.

### Le check admin passe par `public.is_admin()`

```sql
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists (select 1 from users where actor_id = auth.uid() and role = 'admin'); $$;
```

`SECURITY DEFINER` + `search_path` fixé → la fonction résout `users` même dans le
contexte d'évaluation de `storage`. Une sous-requête inline à la place ne marche
pas. Vérifié : ça fonctionne aussi en `WITH CHECK`.

### Les buckets ne se créent pas en migration

Ils se créent à la main dans le dashboard. À chaque nouveau bucket dans le code,
le signaler explicitement à Uriel : **nom exact, public ou privé, policies à
poser**. Et demander avant d'en créer ou d'en réutiliser un — pas de mélange
injustifié.

---

## Triggers

### Un trigger figé face à un schéma qui bouge → signups bloqués

Un trigger sur `auth.users` qui fait un `INSERT INTO public.users (...)` avec une
liste de colonnes figée casse dès que quelqu'un ajoute une colonne `NOT NULL` sans
défaut, ou retire un `DEFAULT`. Symptôme : `Database error saving new user`, côté
Supabase Auth, **silencieux**.

Toute migration qui touche `public.users` (ajout de colonne `NOT NULL`, `DROP
DEFAULT`, renommage) doit vérifier que le trigger de création de compte reste
cohérent. Ceinture et bretelles : ajouter la colonne au trigger **et** lui garder
un `DEFAULT`.

Diagnostic :

```sql
-- colonnes NOT NULL sans défaut
SELECT column_name, is_nullable, column_default FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
  AND is_nullable = 'NO' AND column_default IS NULL;
```

### Backfill : couper les triggers

Voir `migrations-workflow.md` → « Avant un backfill massif ». Un backfill a déjà
généré des milliers d'entrées de journal et inondé le client de notifications
jusqu'au plantage.

---

## Couplages front ↔ DB à surveiller

### Le slug d'un tag doit exister côté frontend

Un slug en base qui n'a pas de clé correspondante dans les tables d'emoji et de
couleur du composant de badge retombe sur un rendu générique, sans erreur. Ajouter
un tag en base impose de compléter le frontend dans le même lot.

### Événements privés : toutes les surfaces de lecture

Une feature « privé / caché » doit filtrer **partout** : les hooks, les RPCs, les
`select` imbriqués et les triggers. Une seule surface oubliée et l'événement fuit.
