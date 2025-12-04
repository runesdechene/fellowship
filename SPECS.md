# Fellowship — Cahier des Charges

> Application de gestion d'événements pour entrepreneurs

## Vision

Fellowship permet aux entrepreneurs de :

- Gérer leurs inscriptions à des événements professionnels
- Rejoindre des groupes/communautés
- Voir où vont leurs pairs (networking facilité)

---

## Phase 1 — Base de données & Profils

### 1.1 Schéma Supabase

**Table `profiles`**

- `id` (uuid, FK → auth.users)
- `full_name` (text, nullable)
- `avatar_url` (text, nullable)
- `company` (text, nullable)
- `bio` (text, nullable)
- `onboarding_completed` (boolean, default false)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Table `events`**

- `id` (uuid)
- `title` (text)
- `description` (text, nullable)
- `location` (text, nullable)
- `url` (text, nullable) — lien externe (Eventbrite, Meetup, etc.)
- `start_date` (timestamp)
- `end_date` (timestamp, nullable)
- `created_by` (uuid, FK → profiles)
- `created_at` (timestamp)

**Table `registrations`**

- `id` (uuid)
- `user_id` (uuid, FK → profiles)
- `event_id` (uuid, FK → events)
- `status` (enum: 'interested', 'registered', 'confirmed', 'attended', 'cancelled')
- `notes` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Table `groups`**

- `id` (uuid)
- `name` (text)
- `description` (text, nullable)
- `is_private` (boolean, default false)
- `created_by` (uuid, FK → profiles)
- `created_at` (timestamp)

**Table `group_members`**

- `id` (uuid)
- `group_id` (uuid, FK → groups)
- `user_id` (uuid, FK → profiles)
- `role` (enum: 'owner', 'admin', 'member')
- `joined_at` (timestamp)

### 1.2 Profil utilisateur

- [ ] Création automatique du profil à l'inscription (trigger PostgreSQL)
- [ ] Onboarding à la première connexion (`/app/onboarding`)
  - Nom complet
  - Entreprise (optionnel)
  - Bio courte (optionnel)
- [ ] Flag `onboarding_completed` pour ne plus afficher l'onboarding
- [ ] Page de modification du profil (`/app/settings`)
- [ ] Avatar (upload vers Supabase Storage)

---

## Phase 2 — Gestion des Événements

### 2.1 Ajouter un événement

- [ ] Formulaire de création d'événement
- [ ] Import depuis URL (Eventbrite, Meetup, LinkedIn Events)
- [ ] Recherche d'événements existants (éviter les doublons)

### 2.2 Mes événements

- [ ] Liste des événements auxquels je suis inscrit
- [ ] Filtres par statut (à venir, passés, intéressé, confirmé)
- [ ] Vue calendrier (optionnel)

### 2.3 Inscription

- [ ] Changer le statut d'inscription
- [ ] Ajouter des notes personnelles
- [ ] Rappels (optionnel)

---

## Phase 3 — Groupes

### 3.1 Créer un groupe

- [ ] Formulaire de création
- [ ] Groupe public ou privé
- [ ] Inviter des membres

### 3.2 Rejoindre un groupe

- [ ] Recherche de groupes publics
- [ ] Demande d'adhésion (groupes privés)
- [ ] Lien d'invitation

### 3.3 Vue groupe

- [ ] Liste des membres
- [ ] Événements auxquels les membres participent
- [ ] "X membres vont à cet événement"

---

## Phase 4 — Social & Découverte

### 4.1 Fil d'activité

- [ ] Voir les événements populaires dans mes groupes
- [ ] "Jean va à [Événement]"

### 4.2 Profils publics

- [ ] Voir le profil d'un autre utilisateur
- [ ] Ses événements passés/à venir (si partagés)

---

## Phase 5 — Polish

### 5.1 PWA

- [ ] Installation sur mobile
- [ ] Mode offline (cache des événements)
- [ ] Notifications push (rappels)

### 5.2 Desktop (Tauri)

- [ ] Build Windows/Mac/Linux
- [ ] Raccourcis clavier

### 5.3 Intégrations

- [ ] Export calendrier (.ics)
- [ ] Sync Google Calendar (optionnel)

---

## Priorités

| Priorité | Fonctionnalité          |
| -------- | ----------------------- |
| 🔴 P0    | Schéma DB + Profils     |
| 🔴 P0    | CRUD Événements         |
| 🟠 P1    | Inscriptions & Statuts  |
| 🟠 P1    | Groupes basiques        |
| 🟡 P2    | Vue "qui va où"         |
| 🟢 P3    | PWA & Notifications     |
| 🟢 P3    | Intégrations calendrier |

---

## Notes techniques

- **Package manager** : pnpm
- **Auth** : Supabase Magic Link (déjà en place)
- **Styling** : TailwindCSS 4 + shadcn/ui patterns
- **Routing** : React Router 7
- **Desktop** : Tauri 2
