# Hub Admin Fellowship — Design Spec

**Date :** 2026-04-08
**Auteur :** Uriel + Claude

## Contexte

Fellowship a besoin d'un espace d'administration interne pour gérer la plateforme : événements, utilisateurs, tags, métriques et modération. Cet outil est réservé au super-admin (Uriel) pour le moment.

## Décisions clés

- **Architecture :** Routes protégées dans l'app existante (`/admin/*`), pas d'app séparée
- **Guard :** Champ `role` dans la table `profiles` (valeurs : `'user'`, `'admin'`)
- **Layout :** Même layout Fellowship avec sous-navigation admin (tabs horizontaux) quand on est sur `/admin/*`
- **Lazy loading :** Toutes les routes admin sont `React.lazy` pour ne pas alourdir le bundle public
- **Tags :** Migration des tags hardcodés (`constants.ts`) vers une table Supabase `tags` pour gestion dynamique depuis l'admin

## Routes

| Route | Module | Description |
|-------|--------|-------------|
| `/admin` | Dashboard | Métriques résumées + raccourcis |
| `/admin/events` | Événements | Table CRUD, dédoublonnage, filtres |
| `/admin/users` | Utilisateurs | Liste, suspend/réactiver |
| `/admin/tags` | Tags | CRUD tags + color picker + preview |
| `/admin/reports` | Modération | Signalements, actions |

## Module : Dashboard (`/admin`)

Cards métriques :
- **Exposants** — profils avec `user_type = 'exposant'`
- **Visiteurs** — profils avec `user_type = 'visiteur'` (ou équivalent)
- **Total utilisateurs** — somme des deux
- **Événements actifs** — événements à venir
- **Participations ce mois** — count sur le mois en cours
- **Nouveaux inscrits (7j / 30j)** — comptes créés récemment

Raccourcis : derniers signalements, derniers événements créés.

## Module : Gestion événements (`/admin/events`)

- Table : nom, date, lieu, créateur, nb participants, tags, statut
- Recherche/filtre par nom, tag, date
- Actions par ligne : voir, éditer, supprimer
- Intégration du dédoublonnage existant (`fuzzy_search_events`, `DeduplicateSuggestions.tsx`)
- Création d'événements depuis l'admin

## Module : Gestion utilisateurs (`/admin/users`)

- Table : nom, email, craft_type, user_type, date d'inscription, nb événements, statut
- Actions : voir profil, suspendre/réactiver
- Pas de suppression (trop dangereux) — suspension uniquement

## Module : Gestion tags (`/admin/tags`)

- Liste des tags avec couleur associée
- Ajouter / renommer / supprimer un tag
- Color picker pour chaque tag
- Preview en temps réel (apparence dans les event cards)
- Sort order configurable

## Module : Modération (`/admin/reports`)

- Liste des signalements (`event_reports`) avec statut : nouveau, en cours, résolu
- Vue détail : événement signalé, motif, reviews associées
- Actions : marquer résolu, supprimer l'événement

## Migrations DB

### 1. Colonne `role` dans `profiles`

```sql
ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'user';
```

Valeurs : `'user'`, `'admin'`. Distinct de `user_type` (exposant/visiteur) — `role` concerne les permissions système.

### 2. Table `tags`

```sql
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
-- Lecture publique
CREATE POLICY "tags_select" ON tags FOR SELECT USING (true);
-- Écriture admin only
CREATE POLICY "tags_admin_write" ON tags FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
```

Seed avec les tags actuels de `constants.ts`.

### 3. RLS admin

Policies supplémentaires sur `events`, `profiles`, `event_reports` pour les actions admin (delete, update global) quand `role = 'admin'`.

## Structure de fichiers

### Nouveaux fichiers

```
src/components/admin/
  AdminLayout.tsx      — Wrapper : sous-nav tabs + slot contenu
  AdminRoute.tsx       — Guard role === 'admin', sinon redirect /dashboard
  AdminDashboard.tsx   — Cards métriques + raccourcis
  AdminEvents.tsx      — Table événements + actions
  AdminUsers.tsx       — Table utilisateurs + actions
  AdminTags.tsx        — CRUD tags + color picker + preview
  AdminReports.tsx     — Liste signalements + actions

src/hooks/
  use-admin.ts         — useAdminMetrics, useAdminEvents, useAdminUsers,
                         useAdminTags, useAdminReports
```

### Modifications existantes

- `src/App.tsx` — routes `/admin/*` avec `React.lazy` + `AdminRoute`
- `src/components/layout/Sidebar.tsx` — lien "Admin" conditionnel (role === 'admin')
- `src/components/layout/BottomBar.tsx` — idem mobile
- `src/lib/auth.tsx` — exposer `role` dans AuthContext
- `src/lib/constants.ts` — tags deviennent fallback, source de vérité = table `tags`

## Hors périmètre

- Gestion des paiements/abonnements (pas encore de monétisation)
- Dashboard organisateur (segment 3, pas encore ciblé)
- App séparée / sous-domaine (pourra venir plus tard)
- Analytics avancées / graphiques (optionnel, itération future)
