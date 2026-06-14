export interface ChangelogEntry {
  version: string
  date: string
  title: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: '0.7.279',
    date: '2026-06-14',
    title: 'Bouton « S\'inscrire » sur la page d\'accueil',
    changes: [
      'La page d\'accueil affiche maintenant un bouton « S\'inscrire » bien visible en haut à droite, à côté d\'un lien « Connexion » discret',
    ],
  },
  {
    version: '0.7.278',
    date: '2026-06-13',
    title: 'Événements privés visibles partout chez toi + avatars des amis',
    changes: [
      'Tes événements privés apparaissent maintenant sur ta carte et ton cockpit, avec un cadenas (ceux des autres restent invisibles)',
      'Sur le calendrier, les avatars de tes amis s\'affichent vraiment et sont cliquables vers leur profil',
    ],
  },
  {
    version: '0.7.277',
    date: '2026-06-13',
    title: 'Événements privés',
    changes: [
      'Crée un événement privé (🔒) : visible seulement de toi et de qui a le lien',
      'Un événement privé n\'apparaît dans aucune recherche, ni l\'Explorer, ni la carte, ni ta vitrine — parfait pour tes petites dates non publiques',
      'Tu peux suivre ton paiement et faire ton bilan dessus comme sur n\'importe quel festival',
      'Tu peux le rendre public plus tard s\'il grandit',
    ],
  },
  {
    version: '0.7.276',
    date: '2026-06-13',
    title: 'Suivi financier des festivals',
    changes: [
      'Quand tu marques « Payé » (ou « Reçu »), on te demande le montant — il atterrit direct dans ton bilan, tu n\'oublieras plus le prix de ton stand',
      'Nouveau réglage par festival : « je paie ma place » ou « on me paie pour venir » (le suivi s\'adapte)',
      'Le bilan devient un registre de lignes : ajoute essence, péage, hébergement, cachet, ventes… dans les deux sens, le bénéfice se calcule tout seul',
      'Ton cockpit récapitule tes cachets reçus et tes emplacements payés',
    ],
  },
  {
    version: '0.7.248',
    date: '2026-06-11',
    title: 'Communauté & notifications remises au propre',
    changes: [
      'La cloche se marque comme lue dès que tu l\'ouvres — fini le bouton « Tout lire »',
      'Les nouveaux festivals ajoutés sur Fellowship apparaissent dans le fil Communauté',
      'Une pastille rouge sur « Communauté » signale l\'activité que tu n\'as pas encore vue',
      'Communauté te suggère des gens à suivre selon les festivals où tu vas (3 profils, renouvelés à chaque visite)',
    ],
  },
  {
    version: '0.7.246',
    date: '2026-06-11',
    title: 'Calendrier : compagnons visibles partout',
    changes: [
      'Le « X compagnons sur cette date » s\'affiche désormais sur tous les festivals, et plus seulement sur le premier de chaque mois',
    ],
  },
  {
    version: '0.7.229',
    date: '2026-06-05',
    title: 'Carte : boutons mobile sur une ligne',
    changes: [
      'Sur mobile, « Mes festivals » et « Mes amis » sont alignés sur une même ligne horizontale, un peu plus bas sous la barre de recherche',
    ],
  },
  {
    version: '0.7.228',
    date: '2026-06-05',
    title: 'Carte : boutons mobile dégagés',
    changes: [
      'Sur mobile, les boutons « Mes festivals » et « Mes amis » ne recouvrent plus la barre de recherche : ils passent juste en dessous, la recherche redevient cliquable',
    ],
  },
  {
    version: '0.7.227',
    date: '2026-06-05',
    title: 'Communauté de la vitrine : deux onglets',
    changes: [
      'La communauté d\'une vitrine se présente en deux onglets façon Instagram : « Abonnés » (qui suit) et « Abonnements » (qui la vitrine suit)',
    ],
  },
  {
    version: '0.7.226',
    date: '2026-06-05',
    title: 'Abonnés visibles sur chaque vitrine',
    changes: [
      'Correction : le compteur et la liste des abonnés d\'une vitrine s\'affichent désormais correctement pour tous les visiteurs (et non plus seulement pour le propriétaire)',
    ],
  },
  {
    version: '0.7.225',
    date: '2026-06-05',
    title: 'Petite touche',
    changes: [
      'Un point cuivre signature après le logo Fellowship',
    ],
  },
  {
    version: '0.7.224',
    date: '2026-06-05',
    title: 'La Carte, en grand',
    changes: [
      'Chaque festival apparaît avec son image et la couleur de sa catégorie ; clique pour un aperçu (date, ville, lien vers la fiche)',
      'Filtres Quoi / Où / Quand comme l\'Explorer (catégories multi-sélection, période — à venir par défaut)',
      'Tes festivals ressortent avec ton avatar ; en Pro, active « Mes amis » pour voir où va ton réseau (avatars groupés)',
    ],
  },
  {
    version: '0.7.222',
    date: '2026-06-04',
    title: 'La Carte des festivals',
    changes: [
      'Nouvelle page Carte : tous les festivals géolocalisés sur une vraie carte interactive, habillée aux couleurs Fellowship (jour comme nuit)',
      'Tes festivals où tu es accepté ressortent avec ton avatar ; pins colorés par catégorie, regroupés quand on dézoome',
      'Recherche par ville/festival, filtres par catégorie, et liste synchronisée avec ce que tu vois à l\'écran',
    ],
  },
  {
    version: '0.7.221',
    date: '2026-06-04',
    title: 'Badge Certifié',
    changes: [
      'Les comptes Pro affichent un badge « Certifié » sur leur vitrine et leur profil public — un gage de crédibilité auprès des organisateurs et du public',
    ],
  },
  {
    version: '0.7.220',
    date: '2026-06-04',
    title: 'Événements géolocalisés',
    changes: [
      'À la création d\'un événement, une recherche d\'adresse propose des suggestions et place le lieu précisément (en vue de la future carte)',
      'Les événements sans adresse précise sont situés au centre-ville, et tous les événements existants ont été géolocalisés',
    ],
  },
  {
    version: '0.7.219',
    date: '2026-06-04',
    title: 'Un seul Calendrier, plus clair',
    changes: [
      '« Mes dates » et « Calendrier » fusionnent : une seule page Calendrier pour tout le monde',
      'En gratuit : tes dates, tes compagnons et ton quota ; Pro débloque la vue réseau (amis pro, visiteurs)',
    ],
  },
  {
    version: '0.7.218',
    date: '2026-06-04',
    title: 'Calendrier — la date des copains sans cliquer',
    changes: [
      'Les festivals où va un compagnon affichent maintenant la date complète (jour + mois) directement, sans avoir à ouvrir la fiche',
    ],
  },
  {
    version: '0.7.217',
    date: '2026-06-04',
    title: 'Dossiers refusés — ton carnet de bord',
    changes: [
      'Quand tu marques un dossier « Refusé » sur un festival, tu peux noter pourquoi (trop cher, dates en conflit…)',
      'Nouvelle section repliable « Dossiers refusés » dans le Cockpit : retrouve tes refus et leur raison',
    ],
  },
  {
    version: '0.7.216',
    date: '2026-06-04',
    title: 'Cockpit — « Plus tard » sur le bandeau bilan',
    changes: [
      'Quand tu mets le rappel de bilan « à plus tard », il ne réapparaît plus dans la même journée (il revient le lendemain)',
    ],
  },
  {
    version: '0.7.215',
    date: '2026-06-04',
    title: 'Retours 1ʳᵉ cliente — corrections P0',
    changes: [
      'Bouton « Retour » : revient à l\'écran d\'où tu viens (Cockpit, Mes dates, Communauté…) au lieu de toujours rouvrir l\'Explorer',
      'Explorateur sur mobile : le carrousel ne défile plus tout seul pendant que tu tapes une carte',
      'Réglages : la section « Une question ? Un bug ? » est de nouveau atteignable en bas de page sur mobile',
    ],
  },
  {
    version: '0.7.214',
    date: '2026-06-03',
    title: 'Slugs plus propres',
    changes: [
      'La ville n\'est ajoutée au lien que si elle n\'est pas déjà dans le nom du festival (fini medievale-brignoles-brignoles)',
    ],
  },
  {
    version: '0.7.213',
    date: '2026-06-02',
    title: 'Liens /e/slug partout',
    changes: [
      'Tous les liens d\'événements de l\'app utilisent désormais le lien lisible /e/nom-du-festival (cartes, calendrier, vitrine, communauté, cockpit, recherche, embed)',
    ],
  },
  {
    version: '0.7.212',
    date: '2026-06-02',
    title: 'Liens d\'événements lisibles',
    changes: [
      'Liens partagés en flw.sh/e/nom-du-festival (slug stable) ; les anciens liens /evenement/… restent valides',
    ],
  },
  {
    version: '0.7.211',
    date: '2026-06-02',
    title: 'Partage — modale au lieu de WhatsApp forcé',
    changes: [
      'Bouton « Partager » : modale Fellowship avec un message pré-rédigé à copier-coller (plus de WhatsApp imposé). Bouton « Partager… » natif en bonus si le navigateur le supporte.',
    ],
  },
  {
    version: '0.7.210',
    date: '2026-06-02',
    title: 'Cockpit — accueil de l\'entité',
    changes: [
      'Cockpit : « Bonjour [ton enseigne] » avec ton avatar, et « La vision d\'ensemble de ta saison »',
    ],
  },
  {
    version: '0.7.209',
    date: '2026-06-02',
    title: 'Bilan enrichi + Mes bilans',
    changes: [
      'Bilan : note libre + photos souvenir privées (le ressenti et la mémoire du festival)',
      'Cockpit : nouvelle section « Mes bilans » — tes festivals passés et leur bilan, par festival',
    ],
  },
  {
    version: '0.7.208',
    date: '2026-06-02',
    title: 'Cockpit — le bandeau bilan disparaît après enregistrement',
    changes: [
      'Après avoir rempli un bilan, le bandeau du Cockpit se met à jour et disparaît (refetch des bilans)',
    ],
  },
  {
    version: '0.7.207',
    date: '2026-06-02',
    title: 'Cockpit — polish hero & saison',
    changes: [
      'Prochain festival : statut en haut à droite, J-X et date en grand dans le corps',
      'Saison : 12 mois glissants depuis le mois courant, chiffre dans le cadre, hauteurs égales',
      'Bilan : ne propose plus que les festivals terminés récemment (fenêtre 45 j)',
    ],
  },
  {
    version: '0.7.206',
    date: '2026-06-02',
    title: 'Cockpit — habillage DA',
    changes: [
      'Cockpit rebranché sur les vrais tokens DA (cartes, cadres, badges de statut) — fin de l\'effet « page à plat »',
    ],
  },
  {
    version: '0.7.205',
    date: '2026-06-02',
    title: 'Cockpit exposant V1',
    changes: [
      'Cockpit exposant V1 (home Pro : prochain festival, à régler, compagnons, saison, bilan)',
    ],
  },
  {
    version: '0.7.197',
    date: '2026-06-01',
    title: 'Le bon prénom dans les Réglages',
    changes: [
      'Les Réglages enregistrent enfin ton prénom/nom affiché sur ton vrai profil (modèle acteur) — fini le décalage où l\'app affichait un autre nom que celui saisi',
    ],
  },
  {
    version: '0.7.196',
    date: '2026-05-28',
    title: 'Un mail pour nous joindre',
    changes: [
      'Un bloc « Une question ? Un bug ? » dans Réglages avec notre adresse directe (appfellowship@pm.me) — on lit tout, on répond',
    ],
  },
  {
    version: '0.7.195',
    date: '2026-05-28',
    title: 'Explorer fluide et 10 nouveaux types de festival',
    changes: [
      '10 nouveaux types : Exposition, Marché de Noël, Marché de créateurs, Brocante, Culturel, Terroir, Cinéma, Biker, Outdoor, Gastronomique',
      'Le filtre « Quoi » de l\'Explorer reprend les couleurs et emojis de la landing — chaque type est immédiatement reconnaissable',
      'Le popover « Quoi » s\'adapte enfin à la largeur de l\'écran (3 → 2 → 1 colonnes) sans débordement',
      'Tatouage repris dans la palette aussi (🌹) — plus de chip générique',
      'Marquee de la landing enrichi : 19 types de festivals défilent désormais en haut de page',
      'Refonte du layout Explorer en flex column → fini les chevauchements entre cartes, dock infos et boutons',
    ],
  },
  {
    version: '0.7.187',
    date: '2026-05-28',
    title: 'Tarifs Pro publics, landing peaufinée',
    changes: [
      'Tarifs visibles sur la page d\'accueil : Découverte gratuit, Pro 9,99 € HT (11,99 € TTC) / mois',
      'Vrais avatars d\'exposants et compte en direct dans le hero exposant',
      '« Rejoindre la liste d\'attente » côté organisateur scrolle vers le formulaire d\'inscription',
      'Logo icône Fellowship adopté partout (haut et bas de page)',
      'Mobile : marge fantôme à droite éliminée, prompt d\'installation PWA recentré, nav cliquable',
      'Calendrier : 3 → 2 → 1 colonnes selon la largeur de l\'écran, plus de scroll horizontal',
      'Cette modale « Quoi de neuf » s\'adapte enfin au mode nuit',
    ],
  },
  {
    version: '0.7.122',
    date: '2026-05-28',
    title: 'Page festival — nouvelle direction artistique',
    changes: [
      'La page d\'un festival passe à la DA « Nuit de Festival » : affiche en ambiance, hero, cockpit latéral',
      'Cockpit : compte à rebours, deadline candidatures, suivi (Repéré → Dossier → Accepté), accès carte',
      'Nouvelle grille « Infos pratiques » : horaires, affluence attendue, emplacement (taille + prix), édition',
      'Modale « Comment candidater » : email, lien d\'inscription et note de l\'organisateur réunis',
      'Bande « Tes compagnons sur cette date » et partage du festival',
      '« Discussion du festival » (questions entre exposants & rencontres) en aperçu — bientôt',
    ],
  },
  {
    version: '0.7.37',
    date: '2026-05-26',
    title: 'Calendrier — nouvelle direction artistique',
    changes: [
      'Le calendrier passe à la DA « Nuit de Festival » (cartes-mois, bannières saisonnières, mode nuit/jour)',
      'Pastilles de statut unifiées avec le reste de l\'app (Repéré, Accepté, À payer, Inscrit, Refusé)',
      'Nouvelle section « Tes compagnons ce mois-ci » regroupant les dates où vont tes contacts',
      'Filtres restylés ; vues mobiles harmonisées',
    ],
  },
  {
    version: '0.7.36',
    date: '2026-05-26',
    title: 'Statuts de participation unifiés',
    changes: [
      'Nouveau cycle clair pour les exposants : Repéré → Dossier envoyé → Accepté → À payer → Inscrit',
      'Statut « Refusé » pour garder l\'historique d\'un dossier non retenu',
      'Vocabulaire et couleurs de statut harmonisés entre l\'Explorer et la page événement',
      '« Repéré » passe au vert, cohérent avec le bouton Repérer',
    ],
  },
  {
    version: '0.7.3',
    date: '2026-05-09',
    title: 'Explorer — vue grille avec 3 modes',
    changes: [
      'Explorer affiche maintenant tous les événements en grille verticale (jusqu\'à 8 par ligne sur grand écran)',
      'Nouveau sélecteur de mode : Bientôt (à venir uniquement) · Récents (par date d\'ajout) · Tous (chronologique, passés + à venir)',
      'Le mode choisi est mémorisé entre les sessions, comme les filtres tags / mois / département',
      'État vide affiché quand les filtres ne renvoient aucun résultat',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-04-09',
    title: 'Widget calendrier intégrable',
    changes: [
      'Widget embed — intégrez votre calendrier Fellowship sur votre site web',
      'Cartes événements style Lu.ma avec images, dates et tags',
      'Macaron "En vedette" sur l\'événement le plus proche',
      'Thème clair/sombre et couleur d\'accent personnalisables via l\'URL',
      'Bouton "Intégrer mon calendrier" sur votre profil — copiez le code iframe',
      'Fix — les participations "Inscrit" sont maintenant automatiquement publiques',
      'Profil public — seuls les événements inscrits sont visibles',
      'Explorer — les filtres remettent le défilement au début',
      'Cartes événements migrées en CSS pur (finies les classes Tailwind)',
    ],
  },
  {
    version: '0.6.1',
    date: '2026-04-09',
    title: 'Correctifs Explorer',
    changes: [
      'Fix — les tags ne font plus déborder la page sur mobile (scroll horizontal)',
      'Section "Dans votre département" masquée temporairement',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-04-08',
    title: 'Admin Hub & nouveau système de tags',
    changes: [
      'Admin Hub — dashboard, gestion événements, utilisateurs, tags et signalements',
      'Tags dynamiques — gérés depuis l\'admin avec color picker visuel',
      'Multi-tags — choisissez jusqu\'à 4 catégories par événement, le premier est le principal',
      'Icônes par catégorie — Médiéval ⚔️, Fantastique ✨, Geek 🎮, Musique 🎵...',
      'Tag « Autre » pour les événements non catégorisés',
      'Les filtres Explorer reconnaissent tous les tags d\'un événement',
      'Onboarding exposant — le nom d\'enseigne devient le nom d\'affichage',
    ],
  },
  {
    version: '0.5.3',
    date: '2026-04-08',
    title: 'Calendrier mobile repensé',
    changes: [
      'Nouvelle vue annuelle mobile — grille 3×4 avec les 12 mois visibles',
      'Vue mois détaillée — gélules compactes avec miniature et statut',
      'Navigation mois par mois avec chevrons',
      'Fix — les événements ne débordent plus sur mobile',
    ],
  },
  {
    version: '0.5.2',
    date: '2026-04-08',
    title: 'Correction upload images',
    changes: [
      'Fix — certaines photos d\'événements apparaissaient en blanc après upload',
      'Détection automatique des images corrompues avec fallback sur l\'original',
      'Meilleure compatibilité avec les formats photos iPhone/Android',
    ],
  },
  {
    version: '0.5.1',
    date: '2026-04-08',
    title: 'Recherche intelligente & correctifs',
    changes: [
      'Détection d\'événements similaires à la création — même avec fautes de frappe ou accents manquants',
      'L\'activité récente distingue "s\'intéresse à" et "participe à" correctement',
      'Les filtres de l\'Explorer sont mémorisés quand vous quittez la page',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-04-06',
    title: 'Nouvelle fiche événement',
    changes: [
      'Fiche événement entièrement redessinée — layout 2 colonnes moderne',
      'Colonne gauche : affiche, ajouté par, liens, amis présents',
      'Colonne droite : infos, suivi de participation, notes, avis, à propos',
      'Meta-rows avec icônes carrées (date, lieu, deadline, participants)',
      'Bloc "Ma participation" avec header cuivre et barre latérale',
      'Bouton "Ajouter un événement" dans la barre de recherche (remplace le FAB)',
      'Barre de recherche mobile — icône compacte avec logo Fellowship centré',
      'Compression automatique des images en WebP (max 800px, ~100 KB)',
      'Toutes les images existantes compressées (-85% en moyenne)',
      'Mobile — poster pleine largeur, contenu aligné à gauche',
    ],
  },
  {
    version: '0.4.1',
    date: '2026-04-06',
    title: 'Calendrier — amis cliquables',
    changes: [
      'Calendrier — participants plus visibles (texte plus sombre)',
      'Calendrier — clic sur les amis ouvre une modal détaillée',
      'Modal participants triés par Amis pro / Amis visiteurs',
      'Chaque ami affiche avatar, nom, type et statut',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-04-06',
    title: 'La fiche événement devient un cockpit',
    changes: [
      'Fiche événement redessinée — affiche grande, 2 colonnes, dashboard privé',
      'Dashboard exposant — stepper participation (Intéressé → En cours → Inscrit)',
      'Suivi paiement — 3 statuts (À payer / En cours / Payé)',
      'Encadré explicatif éphémère quand on change de statut',
      'Amis sur un festival — avatars en ligne avec statut',
      'Notes et Avis côte à côte',
      'Mobile — barre sticky en bas qui se déplie',
      'Comptes publics peuvent participer aux événements (Intéressé / J\'y vais)',
      'Séparation Activité (sidebar) vs Notifications (cloche top-right)',
      'Cloche avec dropdown de notifications personnelles',
      'Bouton "Suivre en retour" sur les notifications de nouvel abonné',
      'Lien site web affiché sur les profils exposants',
      'Noms cliquables dans les notifications → profil',
      'Amis et abonnés visibles par tous les visiteurs',
      'Email de contact + note d\'inscription sur les événements',
      'Notification quand un nouvel exposant rejoint Fellowship',
      'Avatars (photos de profil) dans les notifications',
      'Images événements en format portrait',
      'Calendrier — tri chronologique corrigé',
      'Modal création — ne se ferme plus au clic overlay',
      'Bouton + repositionné pour les téléphones avec barre home',
      'Scroll horizontal Explorer — padding respecté au snap',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-04-05',
    title: 'Fellowship prend forme',
    changes: [
      'Explorer Netflix — slideshow horizontal avec flèches',
      'Filtres par catégorie pastel + sélecteur de mois',
      'Calendrier — bannières SVG illustrées par saison',
      'Calendrier — présence (statut + amis) sur chaque événement',
      'Calendrier — toggle Amis pour voir les événements de ses amis',
      'Profil — bannière photo, bouton QR + édition sous la bannière',
      'Profil — amis & abonnés sur la page profil',
      'Profil — type d\'activité (forgeron, marque...)',
      'Profil — bouton Suivre sous le nom',
      'Profil accessible avec sidebar quand connecté',
      'URLs /@slug fonctionnelles',
      'Barre de recherche — avatar profil en haut à droite',
      'Changelog — popup des nouveautés',
      'Bouton + flottant global (FAB)',
      'Explorer = page d\'accueil',
      'Paddings et titres harmonisés sur toutes les pages',
      'Nouveau logo cuivre',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-04-05',
    title: 'Le grand redesign',
    changes: [
      'Nouveau design system — Plus Jakarta Sans, flat, cuivre',
      'Calendrier avec bannières illustrées par mois',
      'Cards événements style Netflix',
      'Notifications intégrées dans la sidebar',
      'Profil unifié avec page publique',
      'Barre de recherche globale (⌘K)',
      'Bouton d\'ajout d\'événement flottant',
      'Toggle "Amis" sur le calendrier',
      'Présence sur les événements (statut + amis)',
      'Choix exposant/visiteur à l\'inscription',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-04-04',
    title: 'Lancement Fellowship',
    changes: [
      'Dashboard, Calendrier, Explorer',
      'Système de participations et reviews',
      'Profil exposant avec QR code',
      'Notifications et suivi d\'amis',
    ],
  },
]

export const LATEST_VERSION = changelog[0].version

const STORAGE_KEY = 'fellowship-changelog-seen'

export function hasSeenLatest(): boolean {
  const seen = localStorage.getItem(STORAGE_KEY)
  return seen === LATEST_VERSION
}

export function markAsSeen(): void {
  localStorage.setItem(STORAGE_KEY, LATEST_VERSION)
}
