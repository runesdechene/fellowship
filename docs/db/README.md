# `docs/db/` — Référence BDD Fellowship

> Source de vérité pour les conventions et les pièges de la base.
> Écrit le 18 août 2026, en transposant la doctrine du repo Citadelle : les
> classes de bug sont les mêmes, les schémas ne le sont pas.

## Contenu

- [`gotchas.md`](./gotchas.md) — Pièges : schéma et noms de colonnes, API Supabase JS,
  RPCs, RLS et droits, storage, triggers. **À relire avant** d'écrire une migration,
  une RPC ou une query.
- [`migrations-workflow.md`](./migrations-workflow.md) — Le canal d'application :
  fichiers horodatés, `db push` comme voie unique, MCP en lecture seule, réparation
  de l'historique, backfills.

## Pour tout le reste

- **Schéma initial** : `supabase/migrations/20260404120000_initial_schema.sql`
- **Décisions ponctuelles** : l'en-tête commenté de chaque migration dit le POURQUOI
- **Carte du code et de la base** : `graphify-out/graph.json` — à consulter avant de greper
- **Discipline générale** : [`../xo-discipline.md`](../xo-discipline.md)

## Le rappel qui compte

**La base liée est la PRODUCTION.** Pas de base de dev séparée. Chaque migration
touche le site déployé et les clients payants. Voir `migrations-workflow.md`.
