# 0001 — Fondations : vision, offres, et direction artistique fondatrice

- **Date :** 2026-05-24
- **Participants :** Uriel (fondateur/CEO) · Claude (XO)
- **Statut :** `acté` (sauf points marqués "à valider")
- **Maquette de référence :** [`assets/landing-founding-theme.html`](assets/landing-founding-theme.html) — **thème fondateur de toute l'app future**

> Session de brainstorm complète d'une journée. Ce document fige les décisions stratégiques **et** la direction artistique. La maquette HTML jointe est la référence visuelle officielle.

---

## 1. Contexte & déclencheur

- Uriel vit le problème depuis 3 ans (marque **Rune de Chêne**, exposant en festivals). Centaines d'exposants/organisateurs/festivaliers rencontrés.
- **Concurrent** : une personne en stealth développerait "la même idée" pour **fin d'année** (info indirecte, peu de détails). → fenêtre de tir réelle.
- **Stratégie : court-circuiter en lançant cet été** (pic de la saison des festivals = pic de distribution).

## 2. Le MOAT (avantage défendable)

Ce n'est **pas** le logiciel (copiable). C'est la **distribution** :
- Présence physique sur les festivals chaque week-end, tchatch, conversion facile.
- **500+ cartes de visite d'exposants chauds** déjà collectées.
- Des organisateurs déjà prêts à acheter.
→ Conséquence stratégique : on n'a pas à "construire mieux", on doit **shipper vite quelque chose à vendre à un canal qu'on possède déjà.**

## 3. Mission / Vision / Positionnement

- **Mission.** Fellowship libère les exposants de festivals du chaos de l'organisation (dates, inscriptions, paiements, trajets, communauté) pour qu'ils créent et vendent au lieu de jongler avec des post-it et des PDF. Et il donne aux festivaliers un seul endroit pour suivre leurs créateurs préférés et planifier leurs sorties.
- **Vision.** Devenir **la référence automatisée des festivals en France** : la plateforme unique reliant exposants, organisateurs et festivaliers. Postuler à un festival en un clic ; piloter ses dossiers sans papier ; toujours savoir où retrouver les créateurs qu'on aime.
- **Positionnement / tagline.** **« Le réseau qui fait tourner les festivals. »**

## 4. Vocabulaire de marque (tranché)

- **Exposant** = terme généraliste pour les pros (artisans, créateurs, marques).
- **Festival** = mot parapluie (couvre salons, foires, marchés, expos). On n'utilise **pas** "événement" (trop large, évoque les events privés — réservé à plus tard).
- **Festivalier** = visiteur non-pro.

## 5. Modèle d'offres (la "boutique") — V1

Un seul compte, un seul chemin d'upgrade :
1. **Gratuit — Festivalier** : découvrir les festivals, suivre ses créateurs, planifier ses sorties.
2. **Gratuit — Exposant (Découverte)** : bases du toolkit (gérer ses dates, calendrier annuel, voir la communauté, page exposant publique) — *« pour y prendre goût »*.
3. **Payant — Exposant Pro** : toolkit complet (bilan de rentabilité, rappels de deadlines, avis détaillés, calendrier embed, "Postuler en 1 clic" à venir).

- **Principe de la ligne gratuit/payant** : le gratuit crée l'habitude et fait sentir la valeur ; le Pro débloque ce qui fait gagner du temps/de l'argent.
- **Pourquoi** : le gratuit nourrit le réseau et **retient les indécis** (ils n'ont aucune raison d'aller voir un concurrent), neutralisant la peur de "pousser vers la concurrence".
- ⚠️ **À valider** : **le prix** (placeholder actuel **9,99 € HT/mois**). Décision non prise.
- ⚠️ **À affiner** : la liste exacte des features gratuit vs Pro (on l'a esquissée sur la maquette, pas verrouillée).

## 6. Deux moteurs de revenus

1. **Abonnement exposant** (beachhead, V1) — on a la demande + le canal.
2. **Commission sur les dossiers** (V2) — l'exposant postule en 1 clic, son profil part à l'organisateur. C'est une marketplace 2 faces (poule/œuf) → après le beachhead.

## 7. Architecture des comptes — refonte

- **Cible : 1 compte = 1 individu** (ex. « Uriel ») qui **gère des entités** (un exposant « Rune de Chêne », un festival, etc.).
- Remplace l'actuel "1 compte, 2 types (festivalier/exposant)".
- **Décision : refonte COMPLÈTE maintenant** (Uriel a tranché contre ma reco de "fondation seulement").
  - *Risque assumé acté par l'XO* : c'est le chantier le plus profond, il peut manger le délai de l'été → **à séquencer en premier**, tout le reste en dépend.
  - *Argument pour le faire maintenant* : une migration de comptes est exponentiellement plus douloureuse avec des utilisateurs ; là on est en alpha → moment le moins cher.
  - **Frontière à tenir** (cohérence avec "organisateur = V2") : on livre le **contenant** (créer une entité festival + sa page publique) mais **pas** les outils de gestion de dossiers dedans (= V2).

## 8. Périmètre LANCEMENT ÉTÉ vs V2

**Été (indispensable) :**
- Abonnement payant activé
- Refonte complète des comptes (individu → entités)
- Mécaniques exposant améliorées (UX + fonctions de gestion)
- **+ Festivalier intégré dès la V1** (le compte unique le rend gratuit ; les visiteurs veulent aussi planifier)

**V2 (reporté, assumé) :**
- Module organisateur (réception + gestion des dossiers)
- Commission / marketplace 2 faces
- Cockpit multi-entités complet
- Festivalier enrichi, événements privés

## 9. Direction artistique — **« Nuit de Festival »** (FONDATRICE)

Choisie parmi 6 directions testées. Référence : [`assets/landing-founding-theme.html`](assets/landing-founding-theme.html).

### Thèmes
- **Nuit (par défaut)** : fond brun-nuit profond, halos chauds, ambiance "soir de festival, guirlandes".
- **Jour (inversé)** : version lin/crème claire, mêmes accents assombris pour lisibilité.
- **Toggle** lune↔soleil : petit **switch** avec curseur copper qui glisse (nuit→jour). La nuit est le défaut.

### Palette
| Rôle | Nuit | Jour |
|---|---|---|
| Fond | `#170f0e` | `#f0ebe4` (lin) |
| Surface (cartes) | `#241917` | `#fbf9f5` |
| Surface alt | `#1e1513` | `#ece4d6` |
| Texte | `#fbf3e8` | `#3d3028` |
| Texte atténué | `#b3a293` | `#7c6f64` |
| Bordure | `rgba(255,240,225,.10)` | `rgba(60,45,35,.14)` |

- **Primaire — Copper (bronze patiné, niveau intermédiaire)** : dégradé `hsl(25 78% 52%) → hsl(16 70% 40%)` (boutons, onglet actif). Carte Pro = 3 stops `… → hsl(12 64% 32%)`. *Ni néon, ni terne — le juste milieu, validé après itérations.*
- **Secondaire — Vert tilleul CHAUD** : **`#a8cc7a`** (`hsl(86 44% 64%)`, foncé `hsl(92 40% 46%)`). Issu du tag "Marché de producteurs". Choisi après avoir écarté indigo/cyan/violet/magenta/teal : **un vert chaud, pas froid** — c'est ce qui résout le "off" (tout le reste de l'ambiance étant chaud). Sert les icônes, l'organisateur, les badges.
- **Amber** `#ffce85` (lueurs, dégradé titre, accents).
- **Halos d'ambiance (`bgfx`)** : calque **fixe** plein écran, blobs chauds (copper/rose/or) baignant TOUT le site (pas juste le hero). En mode jour : `mix-blend-mode: multiply`, opacité réduite.

### Typographie
- **Plus Jakarta Sans** — titres + wordmark logo.
- **Inter** — corps de texte.

### Logo — DÉCISION + ACTION
- Uriel **préfère le lettrage typographique** « Fellowship » en Plus Jakarta Sans (+ marque ✦) à l'actuel `logo.png` bronze.
- ⚠️ **ACTION** : produire un vrai asset logo dans cette typo (Plus Jakarta Sans), avec une marque/symbole retravaillé, + version claire pour le mode jour.

### Composants clés de la landing
- **Sélecteur d'audience** en haut (remplace l'eyebrow) : `Festivalier · Exposant (défaut) · Organisateur (Soon)`. Change tout le contenu de la page selon l'onglet, avec **fondu** (`fadeUp .4s`).
- **Frise de tags d'événements** sous le hero : tags **colorés en permanence** (chacun sa teinte via `--c`), légère intensification au survol, défilement continu en pause au survol. (Testé neutre/hover-only → rejeté : on perd le foisonnement coloré, l'âme festival.)
- **Navbar** : transparente en haut, **fond verre dépoli (blur) au scroll** (>16px), theme-aware.
- **Cartes features** centrées, aérées (padding généreux, gap interne icône/titre/texte).
- **Tarifs** 3 tiers (cf. §5), **teaser organisateur** + liste d'attente (capter les organisateurs chauds sans construire le module).

### Note d'implémentation
- Dans la maquette, le token CSS `--indigo` porte (par héritage d'itérations) la valeur du **vert secondaire** : à **renommer `--secondary`** lors de l'implémentation réelle.
- L'app actuelle (dashboard, calendrier) est en clair chaud. Landing/thème fondateur = sombre par défaut + toggle. À terme, harmoniser toute l'app sur ce système 2-thèmes.

## 10. Points encore OUVERTS (à ne pas oublier)

- [ ] **Prix** de l'offre Pro (9,99 € = placeholder).
- [ ] **Split features** exact gratuit / Pro.
- [ ] **Imagerie** : la landing n'a aucune capture produit ni photo (hypothèse "ce qui sonne encore un peu off"). À traiter — screenshot du calendrier et/ou photo chaleureuse de stand.
- [ ] **Asset logo** dans le lettrage Jakarta (+ version jour).
- [ ] Détail : l'eyebrow "Pour les festivaliers" est resté vert (152) — couleur propre au festivalier ou à uniformiser ?

## 11. Méthode de collaboration (rappel)

- Claude = **XO** : challenge, pense business/marché, objectif **rouler sur le concurrent**.
- **On ne fige rien sans le GO explicite d'Uriel.** Ne pas le presser. (Ce doc est écrit *après* son GO.)
- Décisions stratégiques → `docs/decisions/`. Specs techniques → `docs/superpowers/`.
