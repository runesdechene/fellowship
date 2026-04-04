# Fellowship V1 — Design Specification

> Validated: 2026-04-04 | Author: Uriel (Rune de Chêne) + Claude

## 1. Vision

Fellowship est le "Netflix de l'événementiel" pour les exposants et artisans de France. La plateforme permet de découvrir des événements, gérer son calendrier de festivals, voir où vont ses amis, et construire sa communauté de clients.

**Positionnement :** Aucun concurrent direct. Les apps de festivals existantes ciblent le public (visiteurs). Fellowship part des exposants (les acteurs), puis étend vers leur communauté, puis vers les organisateurs.

**Domaine :** flw.sh | **Nom :** Fellowship

## 2. Segments utilisateurs

### Segment 1 — Exposants (cible primaire, V1)
Artisans, créateurs, exposants vivant des festivals. Ils paient l'abonnement. Leur douleur : gestion chaotique des dates, isolement, pas d'outil dédié.

### Segment 2 — Public (V1)
Visiteurs, clients des exposants. Ils suivent des exposants, découvrent des événements autour d'eux. Gratuit.

### Segment 3 — Organisateurs (hors V1)
Gestionnaires de festivals. Pourront revendiquer leur fiche événement, gérer inscriptions, billetterie à terme.

## 3. Types de comptes

### Exposant
- Inscription par magic link email
- Profil complet : nom, marque, bio, avatar, site web, ville, code postal, département, sexe (homme/femme/indéfini)
- Slug public (`flw.sh/@slug`)
- QR code personnalisé
- Accès au dashboard calendrier, notes, bilans, avis détaillés

### Public
- Inscription par magic link email (Google/Apple en V2)
- Profil léger : nom, avatar, code postal, sexe
- Page d'accueil : Explorer (découverte d'événements)
- Peut suivre des exposants, voir les événements

## 4. Fonctionnalités V1 — Non-négociable

### 4.1 Calendrier communautaire
- Vue annuelle (12 mois, vue compacte, événements en points/barres colorés par tag primaire)
- Zoom en vue mensuelle au clic
- Trois niveaux de visibilité par participation : privé / amis / public
- Voir où vont ses amis (participations visibles par les amis)
- Compteur "X amis y vont" sur chaque fiche événement

### 4.2 Événements
- Entité partagée : l'exposant ne possède pas l'événement, il crée une participation
- Fiche complète : nom, dates (début/fin), lieu (ville + département), description, image/affiche, tag primaire, tags secondaires, date limite d'inscription, lien d'inscription, lien externe
- Dédoublonnage : à la saisie du nom, suggestions d'événements existants similaires (nom + dates + lieu)
- Tags : un tag primaire (genre de l'événement) + tags secondaires libres

### 4.3 Participations
- Statut : intéressé / inscrit / confirmé
- Visibilité : privé / amis / public
- Un utilisateur peut avoir une seule participation par événement

### 4.4 Relations sociales
- Action unique : follow
- Si A follow B et B follow A → amis (automatique, affiché comme tel)
- Sinon → simple follow unidirectionnel
- Pas de demande d'ami, pas d'acceptation
- Le public ne peut que follow des exposants

### 4.5 Notes sur les événements
- **Notes privées** : mémo perso, visibles uniquement par l'auteur
- **Notes amis** : visibles par les amis directs + amis d'amis (avec indicateur "ami de [Nom]" + bouton ajouter en ami)
- Affichées en fil sur la fiche événement
- Les notes amis d'amis permettent la découverte organique de nouveaux contacts

### 4.6 Bilan post-événement (privé)
- Coût de l'emplacement
- Charges diverses
- Chiffre d'affaires
- Bénéfice (calculé : CA - emplacement - charges)
- Points réussis (liste incrémentable, optionnel)
- Points à améliorer (liste incrémentable, optionnel)
- 100% privé, jamais partagé
- Prépare la data pour une future mascotte-guide intelligente (V2)

### 4.7 Notation des événements (Glassdoor des festivals)
- Disponible après la date de fin de l'événement
- Réservé aux exposants
- Trois critères : affluence (1-5), organisation (1-5), rentabilité (1-5)
- Avis texte optionnel
- **Score agrégé visible par tous** (exposants + public)
- **Avis détaillés (notes individuelles + commentaires) visibles uniquement par les exposants Pro**
- Un seul avis par exposant par événement

### 4.8 Rappels de deadline
- Push notification à J-7 et J-3 avant la date limite d'inscription
- Basé sur les participations de l'utilisateur (statut "intéressé" ou "inscrit")

### 4.9 Profil exposant public
- Avatar, nom de marque, bio, ville, site web
- Calendrier public (événements en visibilité "public" uniquement)
- Bouton "Suivre"
- QR code généré automatiquement pointant vers `flw.sh/@slug`

### 4.10 QR Code stand
- Scan → profil public de l'exposant (`flw.sh/@slug`)
- Bouton "Suivre sur Fellowship"
- Pas de compte ? → inscription rapide par magic link email (Google/Apple en V2)
- Compte créé (type: public) + follow automatique dans le même flow
- Le visiteur ne se retrouve jamais sur une page générique

### 4.11 Notifications / Activité
- Panneau popup (pas une page entière), accessible via icône cloche avec badge compteur
- Chaque notification cliquable → renvoie vers l'événement, profil ou note
- Types :
  - Ami ajoute un événement
  - Nouveau follower
  - Ami ajoute une note
  - Rappel deadline inscription (J-7, J-3)

### 4.12 Réglages
- **Exposant :** profil complet (nom, marque, bio, avatar, site, ville, code postal, sexe), compte (email, déconnexion, suppression), notifications (toggles par type), QR code (aperçu + téléchargement)
- **Public :** profil (nom, avatar, code postal, sexe), compte (email, déconnexion, suppression), notifications (toggles par type)

## 5. Fonctionnalités V1 — Ambitieux mais faisable

### 5.1 Page calendrier publique embeddable (iframe)
- Route : `flw.sh/@slug/embed`
- Page légère, standalone, pas de sidebar/nav
- Mini header : avatar + nom de marque + bouton "Voir sur Fellowship"
- Liste des événements publics, triés chronologiquement
- Snippet copiable depuis les réglages de l'exposant

### 5.2 Découverte par ville/département
- Barre de recherche + filtres (ville/département, tags, période)
- Résultats en cartes : image, nom, dates, lieu, score, "X amis y vont"

## 6. Hors scope V1

- Claim organisateur sur les fiches événement
- Aide IA pour remplir les PDF d'inscription
- Calcul de frais routiers
- Événements d'établissements fixes
- Messagerie / chat
- Emails / digest
- Mascotte-guide intelligente (data prévue dès V1)
- Notation par le public (futur : événements d'établissements)

## 7. Forfaits

### Gratuit
- 7 événements max par an
- Calendrier vue annuelle
- Visibilité : public seulement (pas de privé/amis)
- 3 amis visibles max
- Score agrégé des événements (pas les avis détaillés)
- Profil public basique
- Pas de notes privées
- Pas de bilan post-événement
- Pas de page embed
- Pas de QR code personnalisé
- Pas de push rappels deadline

### Pro (7-10 EUR/mois)
- Événements illimités
- Visibilité privé / amis / public
- Amis illimités
- Avis détaillés des exposants
- Notes privées
- Bilan post-événement (CA, coûts, points réussis/à améliorer)
- Page embed (iframe)
- QR code personnalisé
- Push rappels deadline
- Profil public complet (bio, site, marque)

**Murs de conversion :**
- 8ème événement → limite atteinte
- Essai d'ajout de note privée → fonctionnalité Pro
- Clic sur un avis détaillé → "Passe en Pro pour lire les avis"

## 8. Architecture technique

### Stack
- **Frontend :** React 19 + TypeScript 5.9 + Vite 7
- **Styling :** Tailwind CSS v4 (CSS-first, pas de config file) + shadcn/ui pattern (CVA + clsx + tailwind-merge)
- **Backend :** Supabase (auth, DB, RLS, Storage, Realtime)
- **Logic serveur :** Supabase Edge Functions (Deno) — uniquement pour le push, dédoublonnage, QR code
- **PWA :** vite-plugin-pwa + Workbox
- **Déploiement :** Netlify
- **Desktop/Mobile natif :** Non (PWA pure, Tauri supprimé)

### Path alias
`@` → `./src`

## 9. Data model Supabase

### profiles
| Colonne | Type | Notes |
|---|---|---|
| id | uuid (FK auth.users) | PK |
| type | enum (exposant, public) | |
| email | text | |
| display_name | text | |
| brand_name | text | nullable, exposants only |
| bio | text | nullable |
| avatar_url | text | nullable |
| website | text | nullable |
| city | text | nullable |
| department | text | nullable |
| postal_code | text | nullable |
| sex | enum (homme, femme, indefini) | |
| public_slug | text | unique, exposants only |
| plan | enum (free, pro) | default: free |
| created_at | timestamptz | |

### events
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | |
| description | text | nullable |
| image_url | text | nullable |
| city | text | |
| department | text | |
| start_date | date | |
| end_date | date | |
| registration_deadline | date | nullable |
| registration_url | text | nullable |
| external_url | text | nullable |
| primary_tag | text | |
| tags | text[] | tags secondaires |
| created_by | uuid (FK profiles) | qui l'a créé, pas propriétaire |
| created_at | timestamptz | |

### participations
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid (FK profiles) | |
| event_id | uuid (FK events) | |
| status | enum (interesse, inscrit, confirme) | |
| visibility | enum (prive, amis, public) | |
| created_at | timestamptz | |
| UNIQUE(user_id, event_id) | | |

### notes
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid (FK profiles) | |
| event_id | uuid (FK events) | |
| content | text | |
| visibility | enum (prive, amis) | |
| created_at | timestamptz | |

### event_reports (bilan privé)
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid (FK profiles) | |
| event_id | uuid (FK events) | |
| booth_cost | decimal | nullable |
| charges | decimal | nullable |
| revenue | decimal | nullable |
| profit | decimal | calculé (revenue - booth_cost - charges) |
| wins | text[] | points réussis |
| improvements | text[] | points à améliorer |
| created_at | timestamptz | |
| UNIQUE(user_id, event_id) | | |

### reviews
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid (FK profiles) | exposants only |
| event_id | uuid (FK events) | |
| affluence | smallint (1-5) | |
| organisation | smallint (1-5) | |
| rentabilite | smallint (1-5) | |
| comment | text | nullable |
| created_at | timestamptz | |
| UNIQUE(user_id, event_id) | | |

### follows
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| follower_id | uuid (FK profiles) | |
| following_id | uuid (FK profiles) | |
| created_at | timestamptz | |
| UNIQUE(follower_id, following_id) | | |

Amitié = follow réciproque (calculé à la query, pas de table séparée).

### notifications
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid (FK profiles) | |
| type | enum (deadline_reminder, friend_going, new_follower, friend_note) | |
| data | jsonb | contexte variable selon le type |
| read | boolean | default false |
| created_at | timestamptz | |

### push_subscriptions
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid (FK profiles) | |
| endpoint | text | URL push du navigateur |
| keys | jsonb | p256dh + auth |
| created_at | timestamptz | |

## 10. RLS Policies

- **profiles** : lecture publique (profils exposants), écriture par le propriétaire
- **events** : lecture par tous les authentifiés, création par les exposants, édition par le créateur
- **participations** : lecture selon visibilité (privé = owner, amis = follows réciproques, public = tous), écriture par le owner
- **notes** : privé = owner only, amis = follows réciproques + amis d'amis
- **event_reports** : lecture/écriture owner only (100% privé)
- **reviews** : score agrégé lisible par tous, détails lisibles par les exposants uniquement
- **follows** : lecture par les deux parties, création/suppression par le follower
- **notifications** : lecture/écriture owner only
- **push_subscriptions** : lecture/écriture owner only

## 11. Edge Functions

| Fonction | Rôle |
|---|---|
| `deduplicate-event` | À la création, cherche événements similaires (nom + dates + lieu), retourne suggestions |
| `generate-qr` | Génère le QR code du profil exposant (→ `flw.sh/@slug`) |
| `push-deadline-reminder` | Cron quotidien : deadlines à J-7 et J-3, envoie push |
| `push-friend-activity` | Trigger sur insert participation/note, notifie les amis |

## 12. Storage Buckets

- `avatars` — photos de profil
- `event-images` — affiches/images d'événements
- `qr-codes` — QR codes générés des exposants

## 13. Pages et navigation

### Navigation
- **Desktop :** sidebar gauche fixe, collapsible (icônes seules / icônes + labels). Logo Fellowship en haut, bouton chevron pour collapse.
- **Mobile :** bottom bar

### Pages exposant
1. **Dashboard** (accueil) — calendrier annuel, zoom mensuel, section "Tes amis bougent", compteurs
2. **Explorer** — recherche et découverte d'événements par zone/tags
3. **Notifications** — panneau popup, badge compteur
4. **Profil** — son profil public tel que les autres le voient
5. **Réglages** — compte, profil, notifications, QR code

### Pages public
1. **Explorer** (accueil) — découverte d'événements par zone/tags, style Netflix
2. **Mes suivis** — calendrier des exposants suivis, prochains événements
3. **Notifications** — panneau popup
4. **Profil** — profil basique
5. **Réglages** — email, nom, avatar, code postal, sexe, notifs

### Pages partagées
- **Fiche événement** — header (image, nom, dates, lieu), infos complètes, section sociale (X amis y vont + bouton J'y vais avec choix visibilité/statut), fil de notes amis, bouton note privée, section notation post-événement, bilan privé
- **Profil exposant public** (`flw.sh/@slug`) — avatar, marque, bio, calendrier public, bouton suivre, QR code
- **Création/édition événement** — formulaire complet avec dédoublonnage en temps réel

### Landing page (`flw.sh`, non connecté)
- Landing universelle, deux chemins :
  - "Je suis exposant" → features pro, pricing, CTA inscription
  - "Je cherche des événements" → section découverte style Netflix, CTA explorer
- Inspiration Airbnb : hero chaleureux, CTA naturel, social proof, pricing transparent, sections aérées
- Une fois connecté : exposant → Dashboard, public → Explorer

### Page embed (`flw.sh/@slug/embed`)
- Standalone, légère, pas de nav
- Mini header (avatar + marque + "Voir sur Fellowship")
- Liste événements publics chronologiques
- Snippet iframe copiable depuis réglages

## 14. Design et identité visuelle

### Direction
Mix **Airbnb** (chaleureux, vivant, conversion naturelle, typo ronde) + **Primary Obsidian** (esthétique pastel, scandinave, arrondi). Moins "laboratoire" qu'Airbnb — plus doux, plus coloré.

### Principes
- **Fond :** blanc cassé / off-white (pas de blanc pur, pas de sombre)
- **Accents :** violet et orange du logo, déclinés en versions pastel pour surfaces
- **Coins :** arrondis généreux (boutons, cartes, inputs)
- **Espacement :** aéré, padding confortable, jamais serré
- **Typo :** arrondie, friendly (Inter, Nunito ou similaire)
- **Tags :** couleurs pastel distinctives par catégorie
- **Dark mode :** disponible, charcoal doux (pas noir pur), accents atténués
- **Chaleur :** vient du contenu (affiches, avatars, photos) + palette pastel, pas d'un thème décoratif

### Logo
- `logo.png` — icône + texte "Fellowship" (sidebar étendue)
- `icon.png` — icône seule couleur dégradé violet/orange (sidebar collapsée, favicon)
- `icon_black.png` — version noir
- `icon.svg` — vectoriel
- Logo adaptable si le design l'exige

## 15. Onboarding

### Exposant
1. Magic link reçu → arrive sur Fellowship
2. "Bienvenue ! Comment s'appelle ta marque ?" → brand_name
3. "Ta ville ?" → city + code postal
4. "Choisis ton lien public" → slug (`flw.sh/@...`)
5. → Dashboard avec calendrier vide + prompt "Ajoute ton premier événement"

### Public (via QR ou direct)
1. Magic link email → compte créé (Google/Apple en V2)
2. "Ton prénom ?" → display_name
3. "Ton code postal ?" → pour la découverte régionale
4. → Page Explorer ou profil de l'exposant scanné (+ follow auto si via QR)

## 16. PWA

- **Service Worker (Workbox)** : cache statique (shell app) + cache dynamique (images, avatars) avec cache-first + expiration
- **Offline :** app s'ouvre, calendrier depuis cache local, bannière "Hors ligne"
- **Push :** Web Push API, tokens stockés dans `push_subscriptions`
- **Manifest :** Fellowship, flw.sh, standalone, theme_color adapté au design pastel
