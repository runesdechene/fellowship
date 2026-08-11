# 0006 — Le virage annuaire : Fellowship, l'homme du milieu

**Statut : acté** — 2026-08-11
**Remplace le cadrage social de** [0001](0001-fondations-vision-packs-da.md) · **complète** [0005](0005-avis-bien-commun-exposants.md)

---

## Contexte

Uriel ouvre la session sur un doute de fond : *« Fellowship est trop social. Je veux un produit qui ait une vraie utilité pour nos problématiques d'exposants. Si ça n'aboutit à rien, on abandonnera le projet. »*

L'état des lieux confirme le doute :

- **4 clients payants externes, MRR ≈ 42 € HT.** Les features construites (fil Communauté, follows, avis, Discussion, Rencontres à venir) ont toutes le même défaut : **leur valeur est nulle tant qu'il n'y a personne.**
- **Le test du jour 1 échouait.** Un exposant qui s'inscrit seul, sans un seul contact, n'obtenait qu'un calendrier et une vitrine que personne ne visite.
- On a construit **un réseau social avant d'avoir un réseau**.

Deux intentions fondatrices d'Uriel, jamais servies frontalement jusqu'ici :

1. **Se sentir moins seul** au cours de sa saison.
2. **Être l'homme du milieu** entre organisateurs et exposants — *« les orgas galèrent souvent à organiser leurs fests, et ont de l'argent pourtant. »*

---

## Ce qu'on a découvert en séance

**1. La machine à fossé défensif est déjà construite, et le fil est coupé.**
Le Bilan post-événement existe (`event_reports` + `event_ledger_entries` : registre entrées/sorties par catégorie, bénéfice calculé, photos, améliorations) et il est **verrouillé en privé** par la migration `20260602160001_fix_event_reports_private.sql`. Chaque exposant saisit sa rentabilité dans son coin et l'app n'en fait rien.

**2. Les deux seuls retours utilisateurs enthousiastes portent sur les mêmes types de feature.**
Le **calendrier embarqué** (« les gens en sont très fans ») et les **threads de périple** (« les gens ADORENT »). Point commun : ce sont **les deux seules features qui sortent de l'app et touchent le réel**. Tout ce qui reste à l'intérieur de l'application laisse froid.

**3. Le bouche-à-oreille est la vraie source de découverte — et il s'évapore.**
Uriel chine sur les stands et sur les agendas régionaux, pas sur les réseaux. L'info (« Vaison c'était mort, va à Provins ») circule par le réseau physique, se perd, et ne touche que ceux qui étaient présents ce soir-là.

**4. Le concurrent est faible, mais pas là où on croyait.**
[Mediefest](https://mediefest.org/) : liste / calendrier / carte, financé par la publicité et les bannières « en vedette », **397 abonnés newsletter**, **aucun compte utilisateur**. Et — correction d'Uriel en séance — **il est rempli par les orgas et les visiteurs eux-mêmes**, pas par son éditeur.

**5. Ce sont les EXPOSANTS qui remplissent l'annuaire, pas les orgas.** *(corrigé en séance — voir l'avertissement ci-dessous)*
L'annuaire se remplit parce qu'un exposant ajoute un événement **pour l'avoir dans son propre calendrier**. Preuve vécue : la dernière candidature d'Uriel (**le HeroFest**) a été trouvée sur Fellowship, sur une fiche **créée par un autre exposant**, et il a pu candidater grâce aux infos que celui-ci avait saisies pour lui-même. **Le principe d'égoïsme utile a déjà fonctionné en production, sans avoir été conçu pour.** On industrialise un mécanisme prouvé, pas une hypothèse.

> ⚠️ **Erreur corrigée : « les orgas viendront déposer leur festival tout seuls » est FAUX.**
> Un organisateur dépose sur un agenda **pour toucher le public**, pas les exposants. Sur une plateforme qui n'a que des professionnels, il n'a aucune raison de venir. L'analogie avec Mediefest était trompeuse : leur audience est publique, la nôtre est métier.
> **Conséquence sur l'ordre : exposants → masse → orgas.** L'orga viendra pour **les candidatures** (un vivier qu'il n'a nulle part ailleurs), pas pour la visibilité.
> **Gain caché de cette correction :** la cible SEO n'est plus le festivalier mais l'exposant. On cesse d'affronter Mediefest sur « festival médiéval 2026 » (20 ans d'avance) pour viser « candidature exposant fête médiévale 2027 », « tarif emplacement marché créateurs », « exposer convention tatouage » — **longue traîne, intention commerciale, zéro concurrent.**

**6. Pour une partie des exposants, Fellowship est déjà « la constitution de mon réseau pro ».**
L'esprit de camaraderie est très fort dans le milieu. Le social n'est donc pas un placage marketing : il est culturellement juste. **Le problème n'a jamais été le social, c'était sa forme.**

---

## Options envisagées

| Option | Pour | Contre | Verdict |
|---|---|---|---|
| **A — D'abord les chiffres** : brancher le Bilan sur l'Explorer (rentabilité médiane par festival) | La machine existe déjà, fossé défensif immédiat | Ne règle ni l'acquisition ni la rétention d'hiver ; inutile sans volume d'utilisateurs | Reporté (chantier 5) |
| **B — D'abord les orgas** : construire le back-office organisateur | Ouvre le robinet d'inscriptions (1 festival = 80 exposants) | Six mois de chantier pour 2-3 prospects ; rien de neuf pour l'exposant en attendant | Rejeté en l'état |
| **C — L'annuaire public comme porte d'entrée**, les deux bouts ensuite | Utile au jour 1 sans réseau ; sert l'acquisition exposant **et** orga ; nourrit A et B | Exige du contenu en volume et un chantier SEO non trivial | **Retenu** |

---

## Décision

### Positionnement

> **Un vrai annuaire : simple, pratique, communautaire.** *(formulation d'Uriel — chaque mot est un arbitrage : « simple » = on refuse ; « pratique » = ça sert dès le jour 1, seul ; « communautaire » = la présence, pas le contenu.)*
>
> **Fellowship est le système d'exploitation de la saison d'un exposant nomade — édité par Runes de Chêne.**

**Le produit, c'est le calendrier.** Vision annuelle, simple, connectée à ses amis **et à son site web**. Tout le reste est à son service : **l'annuaire le remplit**, **l'embed le diffuse**, **les compagnons le rendent vivant**, **les métriques le rendent intelligent**. Ne jamais reprendre l'annuaire pour une finalité — c'est le moyen.

« Fait par des exposants, pour des exposants » : aucun éditeur SaaS ne peut acheter cet argument. Il règle le problème de confiance qui bloque le partage des chiffres et des avis.

*Limite connue, avancée par la décision sur le périmètre :* une marque d'artisanat d'inspiration médiévale éditant l'outil du circuit métal et tatouage tient au démarrage — grâce à la présence réelle d'Uriel sur ces salons — mais **l'entité dédiée arrivera plus tôt que prévu**. Conséquence immédiate et non différable : **le vocabulaire médiéval doit sortir du produit public.** Le champ lexical de type « Guilde » ([0004](0004-badge-certifie-levier-pro.md)) sonne juste sur une fête médiévale et faux dans une convention de tatouage. La direction artistique chaude/artisan passe partout ; les mots, non. **À réauditer.**

### Périmètre : la niche est professionnelle, pas thématique

**Décision tranchée par Uriel : surtout pas de niche médiéval/geek.** Il expose aussi sur des festivals de métal et des conventions de tatouage, où les exposants sont très intéressés.

L'argument décisif est plus fort que l'argument de focus : **un même exposant circule entre ces mondes.** Médiéval, métal, tatouage, marchés de créateurs — même homme, même camionnette, même saison. Un annuaire qui ne couvre que la moitié de la saison d'un exposant **est inutilisable** : il retourne à son tableur pour le reste, et l'app perd la partie.

> **La frontière n'est pas l'esthétique de l'événement, c'est : accueille-t-il des exposants indépendants qui vivent de la vente directe sur stand ?**

- ✅ Médiéval, fantasy, métal, tatouage, pop culture / geek, marchés de créateurs, marchés de Noël, brocantes créatives…
- ❌ Salons B2B, congrès, foires commerciales généralistes — il y a des stands, mais pas ce métier.

**Fellowship n'est donc pas un agenda d'événements : c'est un annuaire d'opportunités d'exposition.** Personne n'occupe ce terrain.

Bénéfice : couverture annuelle pleine. Médiéval et métal l'été, tatouage à l'automne et en salle, marchés de Noël en décembre. **L'app est utile douze mois sur douze sans qu'on invente le moindre artifice d'engagement.**

**Nuance conservée — priorité de remplissage ≠ restriction de périmètre.** On ouvre tous les thèmes dès le départ, mais on remplit **d'abord** les circuits qu'Uriel connaît et où son bouche-à-oreille porte. Un annuaire large et creux ne sert personne.

### « Prend des exposants » est un attribut, pas un filtre

On référence **large** (volume, SEO, festivaliers). Chaque fiche porte un statut : `prend des exposants` / `n'en prend pas` / `inconnu`.

- L'app connectée **filtre par défaut** sur « prend des exposants » — l'exposant ne voit jamais de bruit.
- La page publique montre tout.
- Un événement « ne prend pas d'exposants » n'est pas un déchet : il évite de chercher un dossier qui n'existe pas, et c'est du contenu indexé en plus.

C'est le champ le plus précieux de la base, précisément parce que c'est **celui que Mediefest n'a pas et ne peut pas avoir**.

### Modèle économique

| Qui | Quoi | Prix |
|---|---|---|
| **Exposant — gratuit** | L'annuaire, son calendrier, son **calendrier embarqué**, son dossier de candidature réutilisable, les alertes deadlines, les threads de périple, ses compagnons de saison, **son carnet de réseau pro qui se remplit tout seul** | 0 € |
| **Exposant — Pro** | Ses **métriques et ses budgets** (le Bilan, déjà codé et déjà gaté Pro) | inchangé |
| **Organisateur** | Entre gratuitement (dépose son festival, voit son audience), ressort client : boîte de réception des candidatures + outils de gestion | **1,5 % du tarif d'emplacement par dossier validé** — plancher 4 €, plafond 30 € |

### Tarification organisateur — arrêtée le 2026-08-11

> **1,5 % du tarif d'emplacement, par dossier validé. Minimum 4 €, maximum 30 €.**

Sur un festival de 150 exposants :

| Tarif d'emplacement | Ce que le festival encaisse | Frais / dossier | Facture par édition | Part prélevée |
|---|---|---|---|---|
| 150 € | 22 500 € | 4 € *(plancher)* | 600 € | 2,7 % |
| 400 € | 60 000 € | 6 € | 900 € | 1,5 % |
| 800 € | 120 000 € | 12 € | 1 800 € | 1,5 % |
| 2 400 € | 360 000 € | 30 € *(plafond)* | 4 500 € | 1,3 % |

**Pourquoi cette forme :**
- **Aux dossiers _validés_, jamais _reçus_** — l'orga ne paie que pour les exposants qu'il retient, donc sur son revenu et non sur son volume de candidatures. Facturer les dossiers reçus le punirait quand le produit marche et l'inciterait à nous contourner (« envoyez-moi ça par mail »).
- **Indexé sur le tarif d'emplacement**, parce qu'un dossier va de 300 € à 2 400 € selon les festivals : un forfait plat laisserait tout le haut du marché sur la table.
- **Rien à déclarer : le contrat passe par Fellowship.** Quand l'orga valide un dossier, il émet une **offre d'emplacement** (emplacement, tarif, dates, conditions) que l'exposant accepte dans l'outil. Le tarif n'est donc pas *déclaré* par l'orga, il est **transacté** — Fellowship le connaît par construction. Sous-déclarer reviendrait à mentir à l'exposant dans le contrat lui-même : ce n'est plus un risque de réputation, c'est un problème juridique pour l'orga. **Le risque de sous-déclaration est structurellement nul, sans avoir besoin d'encaisser quoi que ce soit.**
- **Plancher** pour ne pas perdre d'argent sous 30 stands ; **plafond** pour éviter le chiffre qui fait peur sur les très gros (à 2 % sans plafond, un gros festival verrait 7 200 € — prix d'un ERP, refus assuré).
- **Argument de vente** : *« moins de 2 % de vos recettes d'emplacement, contre trois semaines de travail récupérées. »*

**Contrainte produit qui en découle :** le concurrent (Google Forms) est gratuit. Le logiciel doit donc **rendre le temps gagné visible** — « 147 dossiers traités, 12 h économisées » — sinon l'orga compare à zéro et il a raison.

**Ce que ça avance dans la feuille de route — et ce n'est PAS l'encaissement.**

Le verrou de facturation, c'est **l'offre d'emplacement acceptée**, pas le paiement. C'est infiniment plus léger : un tarif porté par la validation, et une acceptation par l'exposant. **Ça entre dans le produit minimal.**

Et ce n'est pas de la plomberie de facturation : c'est la fonctionnalité que les exposants réclament depuis toujours — **une réponse claire et une confirmation écrite**, au lieu du silence ou d'un mail perdu. Elle sert les deux côtés, et elle déclenche la facture au passage.

> **L'offre d'emplacement acceptée = l'événement facturable.**

L'encaissement des emplacements reste une piste ultérieure (Stripe Connect, remboursements, légal). Il apporterait la trésorerie sécurisée à l'orga et une commission collectée à la source — mais il n'est **plus nécessaire** pour que le modèle tienne.

⚠️ **Risque résiduel** : tant que les outils aval n'existent pas, rien n'empêche l'orga de valider ses habitués hors plateforme. La parade reste le lock-in en aval — **ces outils doivent arriver _avec_ la facturation, pas après.**

### Quatre principes directeurs

1. **Égoïsme utile** — *chaque geste égoïste de l'utilisateur remplit un actif collectif.* Je candidate pour moi → l'annuaire se remplit. Je fais mon bilan pour moi → les métriques de rentabilité se remplissent. Je partage ma vitrine pour moi → Fellowship se fait connaître. **Aucune feature ne doit demander à l'utilisateur de « contribuer ».**
2. **Ça doit toucher le réel** — les deux features adorées sortent de l'app et touchent la vraie vie. C'est le critère de tri de toute feature future.
3. **Deux formes de social, et deux seulement.** Le problème n'a jamais été le social — l'esprit de camaraderie est fort dans le milieu, et une partie des exposants voit déjà Fellowship comme « la constitution de mon réseau pro ». Le problème, c'était **la forme** :
   - ✅ **La conversation ancrée** — le thread de périple : accroché à un événement précis, daté, éphémère, il marche à trois personnes. Il **crée** la relation.
   - ✅ **Le carnet qui se sédimente** — le réseau pro : durable, cumulatif, **jamais saisi à la main** (les participations disent déjà qui était là). Il **conserve** la relation. *« 34 exposants étaient à Provins avec toi. » « Tu as croisé Marie sur quatre événements — vous ne vous suivez toujours pas. »*
   - ❌ **Le contenu à produire pour un public flou** — le fil de posts. Il exige une masse qu'on n'a pas. *Le fil Communauté change donc de contenu : des **mouvements de saison** (« Marie a ajouté Trolls & Légendes »), pas des posts. Il se remplit tout seul, avec les gestes que les gens font de toute façon.*
4. **Valeur au jour 1, seul** — toute feature doit servir un exposant sans un seul contact sur la plateforme.

### Le fossé défensif : le graphe accumulé

**L'annuaire est copiable. Le Bilan est copiable. Le SEO se rattrape. Le carnet de deux cents collègues croisés sur trois saisons, non.** C'est le fossé côté exposant — la raison pour laquelle LinkedIn n'a jamais été détrôné malgré un produit médiocre. Cela justifie rétroactivement [0005](0005-avis-bien-commun-exposants.md) : les avis à identité protégée reposent sur le graphe d'amis pro ; cette brique n'était pas un détour, c'est la **couche de confiance** du fossé.

Le prérequis de ce fossé, c'est **le compte**. Sans compte utilisateur, un annuaire ne devient jamais un outil : Mediefest ne sait pas qui tu es, donc il ne peut ni te dire si tes copains y vont, ni si c'est rentable, ni te rappeler une deadline, ni te faire candidater, ni te faire un bilan. Il est structurellement condamné au panneau d'affichage. Sa monétisation publicitaire l'enferme : son intérêt, c'est le nombre de visites, pas notre succès.

**L'asymétrie est totale : nous pouvons devenir eux en un chantier ; ils ne peuvent pas devenir nous.**

Leur seul actif réel est **le référencement** — vingt ans d'ancienneté et de pages indexées. **Notre arme contre ça, c'est le calendrier embarqué** : chaque embed est un lien vers Fellowship depuis un site tiers. On ne rattrape pas leur SEO en écrivant du contenu, on le rattrape par nos utilisateurs.

Et la vraie bataille n'est pas la saisie : c'est **le réflexe** « je poste mon fest sur Mediefest ». On le prend avec le seul argument qui compte pour un orga et qui nous est structurellement réservé : *« 23 exposants suivent votre festival. »*

### Le cycle d'usage, fourni par le métier

- **Hiver** — je candidate, les deadlines me rappellent · les marchés de Noël tournent
- **Deux semaines avant** — le thread de périple s'allume, on s'organise (il absorbe toute la logistique : covoiturage, hébergement, camion — **sans construire de feature dédiée**)
- **Le week-end** — j'y suis, mes compagnons aussi
- **Dimanche soir** — mon bilan, et l'info remonte à tout le monde

Aucune mécanique d'engagement à inventer.

### 🎯 Ce sur quoi on se concentre MAINTENANT (révisé le 2026-08-11, fin de session)

> **La boîte de réception des candidatures, vendue aux gros festivals.**

**Révision majeure du même jour.** Le plan initial — « le meilleur calendrier exposant, gratuit, les orgas plus tard » — a été retourné en fin de session par une contrainte de trésorerie (plancher 1 500 €/mois, six mois) et par une correction d'Uriel : *« Fellowship Orga nous fait causer avec des entités qui brassent des millions et qui galèrent à gérer leurs dossiers. »*

Ce qui a changé dans l'analyse :
- **Il y a deux marchés orga, pas un.** Les petits et moyens veulent de la **visibilité** (annuaire, gratuit). Les gros veulent de l'**outillage** — ils n'ont aucun besoin de notre audience, ils ont besoin de traiter 300 dossiers. **Ce sont eux qui paient tout.**
- **L'exposant ne peut pas payer** : les clients actuels trouvent déjà 19 €/mois trop cher. Le côté solvable du produit était l'autre.
- **Le concurrent est Google Forms**, des mails et des interfaces PHP maison que les exposants détestent. La barre à dépasser est très basse.
- **L'avantage décisif** : le formulaire est du côté de l'orga, mais **le dossier est du côté de l'exposant** — il candidate avec ses pièces déjà remplies. L'orga reçoit des dossiers complets et comparables. Personne d'autre ne peut le faire, parce que personne d'autre n'a les exposants.

**Ordre de grandeur :** ~7 festivals couvrent le trou de trésorerie, ~15 couvrent le plancher entier.

**Produit minimal (4 à 8 semaines)** : formulaire de candidature configurable · boîte de réception avec statuts (reçu / présélectionné / accepté / refusé / liste d'attente) · dossier exposant pré-rempli · **offre d'emplacement acceptée par l'exposant** (le verrou de facturation, et la confirmation écrite que les exposants réclament) · réponses groupées et mails automatiques · export tableur. **Pas** de plan de stands, **pas** d'encaissement — battre Google Forms suffit.

**Mise sur le marché : par prévente.** Deux ou trois pilotes « saison 2027, tarif fondateur gelé deux ans », construits **avec** eux. Cash avant de tout bâtir, et certitude de construire ce qu'ils veulent.

*Le calendrier exposant gratuit n'est pas abandonné : il reste ce qui produit le vivier, donc ce qui donne sa valeur à l'outil orga. Mais il n'est plus la priorité de revenu.*

**Condition non négociable :** la feature la plus critique de ce plan est la moins glamour — **l'ajout d'un événement par un exposant**. Geste de 30 secondes sur téléphone, produisant une fiche exploitable par les autres (c'est ce qui a donné le HeroFest à Uriel). Ratée, tout le plan n'est qu'un joli calendrier vide.

**Vigilance :** ne plus investir une heure dans du **Pro de gestion** (quotas, confort, rangement) — cette moitié se dévalue avec la contraction du marché (voir « Le vent du marché » plus bas). Le payant devra migrer vers **la décision** (métriques, rentabilité). Ne rien construire qui aille dans l'autre sens.

### Ordre des chantiers

| # | Chantier | Nature |
|---|---|---|
| **0** | **Amorçage de l'annuaire** — automatisation cloud (Haiku) de collecte quotidienne sur les agendas régionaux et sites d'orgas | Infra + contenu |
| **1** | **L'annuaire public** — la page déconnectée devient un lieu de découverte ; une page indexable par événement | Produit + SEO |
| **2** | **Dossier exposant + candidature sortante** — postuler en un clic, y compris vers un orga absent de la plateforme | Produit |
| **3** | **Fil de saison + threads de périple + carnet de réseau** — mouvements au lieu de posts ; valoriser le thread existant ; le carnet pro qui se remplit via les participations | Produit |
| **4** | **Boîte de réception orga** — offerte à 2-3 pilotes, construite avec eux | Produit |
| **5** | **Métriques agrégées + facturation orga** — brancher le Bilan sur l'Explorer ; forfait + dossiers validés | Produit + business |

### Ce qu'on ne fera pas (anti-scope)

Aussi structurant que le scope. **On se concentre sur une chose et on la fait bien.**

| Refusé | Pourquoi |
|---|---|
| **Groupes de discussion** (demandé par des utilisateurs) | Les gens ont déjà WhatsApp et Facebook, gratuits et meilleurs. **Une demande d'utilisateur est une solution, pas un besoin** : ce qu'ils expriment, c'est « ne pas être seul ». On y répond par **la présence** (compagnons de saison, thread accroché à une date, carnet de réseau) — le seul terrain où l'on gagne, parce que ni Meta ni personne ne sait qui va à quel festival. |
| **Messagerie générale / DM ouverts** | Même raison. Sans objet partagé et daté, on retombe sur la forme de social qui exige une masse qu'on n'a pas. |
| **Fil de posts à produire** | Voir principe 3. Remplacé par les mouvements de saison. |
| **Feature de covoiturage / hébergement dédiée** | Le besoin est réel, mais **il se règle tout seul dans le thread de périple**. On a la solution sans construire le produit. |
| **Onglet Rencontres** (annoncé comme prochain chantier avant cette décision) | Déprioritisé au profit de l'annuaire. |
| **Back-office orga complet en amont** | Option B rejetée : six mois de chantier pour 2-3 prospects. Il vient après l'annuaire, avec des pilotes. |

---

## Conséquences

**Technique**
- **Prérendu / SSG obligatoire** sur les pages événement : l'app est une SPA React que Google indexe mal. Sans ça, tout le travail SEO ne rapporte rien. **C'est le coût caché du chantier 1.**
- **Réaudit des surfaces de fuite des événements privés/cachés** avant d'ouvrir l'Explorer au public.
- **Dédoublonnage à industrialiser** (`DeduplicateSuggestions` existe déjà) : le scraping quotidien produira doublons, dates changées et annulations.
- Le scraping donne **le squelette** (nom, dates, lieu, thème), **jamais la viande** (tarif d'emplacement, deadline, contact orga, prend-des-exposants) — celle-ci vit dans des dossiers envoyés sur demande. Elle viendra des utilisateurs via le principe d'égoïsme utile.

**Produit**
- La Landing publique devient l'annuaire. Elle **prouve** la valeur au lieu de la raconter.
- Le fil Communauté change de nature (mouvements, pas posts).
- Le calendrier embarqué passe de feature annexe à **pilier**.
- L'onglet Rencontres, annoncé comme prochain chantier, **est déprioritisé** au profit de l'annuaire.

**Business**
- La cible de revenu se déplace de l'exposant vers l'orga : ~62 abonnés payants à convertir *ou* ~20 festivals à signer, pour le même objectif de +500 €/mois — et chaque festival signé amène ses exposants.
- Le gratuit massif côté exposant n'est pas une concession commerciale : **l'inventaire d'exposants est ce qui rend la plateforme précieuse pour l'orga.**

---

## Le vent du marché : 25 dates → moins de 12

**Constat terrain d'Uriel** : les exposants gagnent de moins en moins sur les festivals ; beaucoup veulent passer de ~25 dates annuelles à moins de 12, pour se concentrer sur la vente en ligne.

**Analyse : c'est un vent favorable, pas une menace.**

1. **La sélectivité multiplie la valeur de l'information.** À 25 dates, on encaisse cinq week-ends morts — la masse compense, on candidate partout. À 12 dates, un week-end raté coûte 8 % de l'année. **On n'a plus le droit à l'erreur.** L'annuaire + les métriques de rentabilité sont *l'outil de la sélectivité* : ils n'auraient eu aucun sens dans un marché en expansion. **Le marché vient vers le produit qu'on définit ici.**
2. **Les 12 dates qui restent ne sont pas un reliquat, ce sont les 12 meilleures.** Si l'exposant bascule vers le web, ses dates physiques deviennent son **canal d'acquisition client** : on rencontre au stand, on achète en ligne toute l'année. Les choisir devient la décision business de l'année.
3. **Le calendrier embarqué devient le pont entre les deux moitiés du métier** (*« retrouvez-moi ici »*). Il cesse d'être un gadget viral. Ça explique pourquoi c'est le retour le plus enthousiaste reçu : les utilisateurs ont senti avant nous où allait leur métier.
4. **La douleur orga explose.** Si tout le monde réduit, les festivals ne remplissent plus leurs allées. Un organisateur qui galère à composer son plateau paiera pour accéder à un vivier d'exposants. **La contraction rend les deux côtés plus demandeurs à la fois.**

**Risques assumés, non minimisés :**
- Le marché adressable rétrécit (moins de dates/exposant, à terme moins de festivals viables). **Renforce encore « gratuit exposant, payant orga »** — un exposant à 12 dates paiera moins volontiers 8 €/mois.
- **Horloge** : des festivals vont mourir dans les trois ans ; les survivants seront ceux qui savent recruter. Fenêtre ouverte, pas éternelle.
- **Risque de fond** : si le métier bascule massivement en ligne, on outille une activité en déclin. Le contre-argument (le stand reste le canal d'acquisition) est une **hypothèse, pas un fait**. → **Indicateur à surveiller dans les chiffres de Runes de Chêne : la part du CA en ligne attribuable à des clients rencontrés en festival. Si elle s'effondre, la thèse tombe.**

---

## Ce qui reste ouvert

- **Le contenu réel d'un dossier de candidature** — ce qu'on fournit, dans quel format, par quel canal, et combien de temps ça prend. Toujours pas documenté (la dernière candidature d'Uriel, le HeroFest, s'est faite *depuis* Fellowship, mais on ne sait pas ce qu'il a dû fournir ensuite). **Bloquant pour le chantier 2.**
- **L'acceptabilité du partage des chiffres** (CA par événement, même agrégé et anonymisé) — tabou réel chez les exposants, à tester avant le chantier 5. La couche de confiance de [0005](0005-avis-bien-commun-exposants.md) est l'atout ici.
- **Le tarif orga** — forfait de base et prix au dossier validé, à calibrer.
- **La segmentation des métriques** — un stand de bijoux n'est pas un stand de restauration ; comparer des CA bruts produit du bruit trompeur.
