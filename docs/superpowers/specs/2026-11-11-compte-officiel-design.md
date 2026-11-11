# Le compte officiel Fellowship — conception

> Discuté avec Uriel le 11/11/2026. Décision dans le vault : `_État.md` de Fellowship, *Tranché*.
> Maquette validée le 11/11/2026 : Figma, page Story, planche `2835:893` — **badge A** (le sceau :
> pastille au dégradé de la marque, cochée) et **anneau 2** (dégradé de la marque, plus épais, halo
> en terre claire). Pas de bulle du mot au-dessus de la barre (retirée de l'app, elle ne revient pas).

## Pourquoi

L'équipe veut parler à la communauté depuis Fellowship même : poser des questions (« Quelle serait
la future fonctionnalité qui vous manque sur Fellowship ? ») par un sujet, et recevoir les réponses
et les retours clients dans la boîte Messages. Le badge « Officiel » dit que c'est l'équipe qui
parle, pas un exposant parmi d'autres.

## Ce que voit l'exposant

- **Le badge « Officiel »** à côté du nom d'un compte officiel, **partout** où ce nom s'affiche :
  barre des sujets et sujet ouvert, bulles et réponses d'un tchat, boîte Messages, Ma communauté,
  vitrine. Un seul composant, réutilisé partout.
- **Ses sujets en priorité** : dans la barre des sujets, ceux d'un compte officiel viennent juste
  après « Toi », avant tous les autres, avec un anneau plus marqué que les autres sujets.
- **Une vitrine à part** : aucun bouton Suivre ; à sa place, **Écrire**, ouvert à tout compte
  connecté, ami ou pas. C'est la porte des retours clients.
- Un compte officiel **n'apparaît pas** dans « Tu connais peut-être », et nulle part on ne propose
  de le suivre (fil de Ma communauté compris).

## Règles métier

- **Personne ne suit le compte officiel, et ce n'est pas un objectif** (Uriel). Ses sujets touchent
  tout le monde parce qu'ils sont publiés en **Public**, le public existant des sujets. Écarté :
  l'abonnement forcé — inutile pour la portée, et il casserait le fil par défaut de Ma communauté
  (`defaultScope`, qui compte les abonnements).
- **Les messages restent entre amis, sauf avec un compte officiel** : n'importe qui peut ouvrir une
  conversation à deux avec lui, et lui avec n'importe qui (pour répondre). Les groupes gardent leur
  règle : on n'y ajoute que ses amis.
- Le compte officiel est une **enseigne ordinaire** (logo, vitrine), qu'Uriel crée lui-même dans ses
  réglages et au nom de laquelle il agit par le sélecteur de compte. Il publie ses sujets par le
  composeur habituel. Un sujet dure 7 jours, comme les autres.
- Être officiel est un **drapeau en base**, qui ne se pose qu'à la main (migration ou SQL), jamais
  depuis l'application. Il peut un jour servir à un autre compte sans code nouveau.

## Données

- Une colonne booléenne `officiel` (par défaut `false`), sur la table qui porte l'id d'acteur
  partout dans les RPC — `actors`, à vérifier dans `information_schema` avant d'écrire.
- **Une seule règle décide qui peut écrire à qui** : une fonction `peut_ecrire(moi, lui)` — amis, ou
  l'un des deux est officiel. `ouvrir_conversation` (définition **live** copiée entière) l'appelle
  pour une conversation à deux, à la place de son test « amis » ; le bouton Écrire (vitrine, fil)
  s'affiche selon la même règle, jamais selon un test recopié. Vérifier que l'envoi d'un message ne
  refait pas ce contrôle ailleurs. *Pourquoi* (Uriel, 11/11/2026) : une future invitation entre
  non-amis ajoutera un état à la conversation (en attente, ouverte) et un cas à cette fonction, sans
  rien défaire — les conversations avec un compte officiel seront ouvertes d'office.
- `accounts_to_follow` (définition live) : exclut les comptes officiels.
- Le front connaît la liste des comptes officiels par **une seule lecture** (une petite RPC ou un
  `select`), gardée en mémoire pour la session : le badge se décide sur l'id, sans changer chaque RPC
  qui rend un nom. *Choix de Claude, à confirmer par le builder si une meilleure voie existe.*

## Hors de ce lot

- Notifications des nouveaux messages (déjà hors du lot Sujets).
- Statistiques des réponses, sondage, vote : les réponses se lisent dans le tchat du sujet.
- Un écran d'administration des comptes officiels.

## Vérifier que c'est juste

- Tests purs : l'ordre de la barre des sujets (officiels après « Toi », puis l'ordre actuel).
- En base, après migration : un non-ami ouvre une conversation à deux avec le compte officiel, et
  l'inverse ; un non-ami ordinaire reste refusé ; le compte officiel est absent de
  `accounts_to_follow`.
- Dans le navigateur : badge visible aux cinq endroits, vitrine sans Suivre avec Écrire, sujet
  officiel en tête de barre avec son anneau, réponse reçue dans la boîte Messages du compte.
