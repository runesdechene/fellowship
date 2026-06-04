# 0004 — Le badge « Certifié » comme levier d'abonnement Pro

- **Date :** 2026-06-04
- **Participants :** Uriel (CEO) · Claude (XO)
- **Statut :** `acté` (positionnement validé ; spec d'implémentation à écrire séparément)
- **Lien :** s'appuie sur [le Pro par entité](0001-fondations-vision-packs-da.md) ; impacte la matrice gratuit/Pro.

## Contexte

Aujourd'hui, le forfait **Pro** vit sur l'entité (`entities.plan = 'free' | 'pro'`) et il est
**invisible de l'extérieur** : un visiteur de la vitrine ne voit pas qu'un exposant est Pro. Le
Pro se vend donc uniquement par du **gating fonctionnel** (Calendrier / Communauté / Dashboard
débloqués) — un argument faible, parce que les gens *détestent payer pour franchir un mur*.

En parallèle, la table `entities` a déjà une colonne `verified` (booléen, posé à la main), pensée
au départ comme signal de confiance / anti-usurpation.

La question posée : peut-on afficher un marqueur d'abonnement sur la vitrine ? Elle a dérivé vers
une décision plus large de **positionnement de l'offre Pro**.

## Options envisagées

1. **Afficher le `subscription_status` brut sur la vitrine.**
   ❌ Rejeté. C'est de l'info de **facturation privée** (`trialing / past_due / canceled / unpaid`).
   Exposer « past_due » sur la vitrine d'un artisan, c'est le griller devant les organisateurs.

2. **Deux badges distincts : « Pro » (payant) + « Vérifié » (confiance).**
   Possible, mais double système visuel à gérer pour une app à notre échelle → sur-ingénierie, et
   ça brouille la lecture (deux marqueurs côte à côte).

3. **Fusionner : Certifié = Pro, vendu comme argument de tête.** ✅ Retenu (avec garde-fou, ci-dessous).

## Décision

**Le badge « Certifié » devient la matérialisation visible du Pro, et un argument de vente de
tête — pas un bonus discret.**

### Le modèle

> **Pro → accorde « Certifié » automatiquement. Mais « Certifié » reste posable à la main,
> indépendamment du plan.**

- Couplé **par défaut** (payer = certifié), mais **mécaniquement découplé** : on peut certifier un
  compte officiel sans le forcer à payer, ou refuser le badge à un payeur louche.
- Un **seul badge visible** à l'écran → UX simple, KISS.

### Pourquoi ce positionnement

- **Vendre de la crédibilité > vendre des features.** Les gens paient plus volontiers pour *qui
  ils sont* (statut, appartenance) que pour *ce qu'ils débloquent*. La crédibilité accroche
  émotionnellement ; les outils (Dashboard…) retiennent ensuite.
- **Le découplage sert les deux segments :**
  - **Exposants** → « Certifié » = badge de sérieux, vendu avec le Pro.
  - **Festivals** → l'override manuel = « sois la page *officielle certifiée* de ton festival » :
    à la fois un hook de vente futur **et** le garde-fou anti-squatteur.

### Garde-fous (à respecter dans le pitch et l'UI)

- **Ne jamais exposer le statut Stripe brut.** Le public ne voit qu'un badge **binaire positif**,
  dérivé de l'état Pro — jamais `trialing/past_due/canceled`.
- **Le mot compte.** On vend « **Certifié / Membre de la Guilde / Sérieux** », **pas** « identité
  vérifiée ». Raison : plus on crie publiquement « payer = vérifié », plus le badge perd sa valeur
  de *confiance* (cf. checkmark bleu de X). Pour des exposants, « payant ≈ artisan sérieux » est un
  signal légitime ; on garde « vérif d'identité » pour une vraie vérif anti-fraude plus tard.

## Conséquences

### Ce qui fait que ça convertit (sinon le badge est creux)

1. **Visibilité.** Le badge doit être vu là où ça juge : **vitrine publique + listings Explorer +
   à côté du nom partout.** Enterré = zéro valeur de vente.
2. **Le manque doit se voir.** Sur sa *propre* vitrine, un gratuit voit un état « non certifié » +
   nudge *« Passez Pro pour certifier votre compte »*. C'est le **déclencheur d'upgrade** : sans ce
   contraste, personne ne ressent le besoin.
3. **Le bon wording** partout (cf. garde-fous).

### Cas à trancher dans la spec technique

- **Dérivation `plan → verified`** : badge dérivé à l'affichage de `plan = 'pro'`, **OU**
  `verified` reste une colonne propre qu'on set quand Pro s'active (override possible). Choix à
  arbitrer côté implémentation (la 2ᵉ voie est plus simple à découpler).
- **Essais (trialing)** : badge dès le trial, ou seulement quand ça paie vraiment ? (Sinon : badge
  qui apparaît puis disparaît au churn → effet moche.)
- **Comps** (ex. **Bilskirnir**, passé Pro à la main le 2026-06-04) : héritent du badge → cohérent,
  validé.

### Suite

Spec d'implémentation à écrire dans `docs/superpowers/specs/` + `plans/` : dérivation, placement
du badge (vitrine / Explorer / partout), composant badge DA, nudge gratuit, gestion trial/comp.
