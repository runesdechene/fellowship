# 0007 — DA V2 « Parchemin »

**Statut : acté** — 2026-08-11
**Remplace la DA « Nuit de Festival »** de [0001](0001-fondations-vision-packs-da.md) comme direction par défaut · **sert** [0006](0006-virage-annuaire-homme-du-milieu.md)

---

## Contexte

Retour utilisateur sur l'app actuelle : *« le design est trop brouillon, trop d'infos partout, pas assez minimaliste »*, et *« les gens sont habitués au design de Runes de Chêne et ne l'ont pas retrouvé dans Fellowship »*.

C'est le même diagnostic que [0006](0006-virage-annuaire-homme-du-milieu.md) appliqué à la surface : **trop d'informations à l'écran, c'est la même maladie que trop de features.**

## Maquettes de référence

| | Fichier | Ce qu'elle montre |
|---|---|---|
| **L'app** | [`assets/v2-app-clair.html`](assets/v2-app-clair.html) | Cockpit, Calendrier, Explorer navigables · jour/nuit · halos commutables · 4 accents |
| **La landing** | [`assets/v2-landing-parchemin.html`](assets/v2-landing-parchemin.html) | Comparateur avant/après sur le rendu réel de flw.sh, jour et nuit |
| **Le calque** | [`assets/landing-parchemin.css`](assets/landing-parchemin.css) | Le CSS applicable par-dessus `Landing.css` |

---

## Décision

### Le langage

| | Valeur |
|---|---|
| Fond | parchemin `#F4EEE1` · sombre `#171414` (l'`--app-bg` existant) |
| Encre | `#594848` · secondaire `#8C7B72` — **jamais de noir, jamais de blanc pur** |
| Titres | graisse **500**, interlettrage **négatif** (−0,032 à −0,036 em), interligne ~1,05 |
| Capitales espacées | réservées aux **micro-libellés** |
| Blocs | un fond **à peine décalé** du parchemin (`--block`), **ni bordure ni ombre** |
| Images | **seuls objets à porter un rayon et une ombre douce** |
| Accent | **terracotta**, partout — app comme vitrine *(arbitrage tranché : marque unifiée > lisibilité fonctionnelle)* |
| Statuts | billes **colorées** (vert forêt confirmé / ambre en attente), halo doux autour |
| Halos | conservés, **à ~17 % d'opacité** |

### Le clair est le défaut

**Aucune bascule automatique sur `prefers-color-scheme`.** Le parchemin *est* l'identité ; le sombre ne s'active que sur demande explicite. Un visiteur dont le système est en thème sombre doit arriver sur le parchemin.

### Quatre principes

1. **La séparation se fait par la teinte, pas par le trait.** Un bloc n'a ni bordure ni ombre : un fond légèrement décalé suffit. Les blocs sont un peu translucides et captent les halos qui passent derrière — c'est ce qui les empêche d'être des rectangles morts.
2. **Seules les images ont des bords.** Rayon et ombre douce sont réservés aux visuels. Le contenu, lui, respire sur le parchemin.
3. **On enlève le bruit, pas la matière.** *Erreur commise et corrigée en séance : minimal avait été confondu avec plat.* Le premium vient de la matière maîtrisée — dégradé imperceptible, liseré de lumière, ombre large et très diffuse — pas de son absence. Une information en moins, une texture en plus.
4. **Richesse visuelle ≠ densité d'information.** Une carte peut porter une grande image généreuse et seulement deux lignes de texte.

### Ce qui est banni

- **Le verre et le flou** sur le contenu *(le voile léger reste admis sur la barre latérale)*
- **Les ombres dures** — remplacées par des ombres larges à faible opacité
- **Les trames tissées / grains en hachures** — testées, rejetées : effet grillagé
- **Les gélules décoratives** — une gélule ne survit que si elle porte un état sur lequel on agit
- **Les bordures de cartes**

---

## Conséquences

**Livraison — V2 commutable sur `main`, jamais une branche longue.**
Les nouveaux écrans coexistent avec les anciens derrière un interrupteur. On livre en continu, on montre la V2 à une cliente avant de basculer, aucune divergence à fusionner. Conforme à la règle « main = atelier ».

**Ordre de fusion :** le calque de la landing d'abord (il est prêt et validé), la DA de l'app ensuite.

**Un bug de la prod est corrigé au passage :** en mode jour, les maquettes d'appareils du hero restaient **sombres** — un rectangle noir au milieu du crème. Elles passent en clair et montrent enfin l'app telle qu'elle sera.

**Piège rencontré, à ne pas refaire :** un liseré de lumière (`inset 0 1px 0 rgba(255,255,255,…)`) écrit en dur se voit comme un trait blanc en thème sombre. Tout liseré doit passer par un jeton redéfini par thème.

**Sur les halos en clair :** le chaud doit dominer et le froid ne faire que ponctuer. Un halo bleu ou vert trop présent grise le parchemin et le fait paraître sale.

---

## Ce qui reste ouvert

- **La police.** Plus Jakarta Sans est en place ; **Cabin** est celle de runesdechene.com. C'est elle qui fera la reconnaissance de marque. À embarquer dans un second temps, **seule**, pour mesurer son effet sans le mélanger au reste.
- **L'accent de l'app** — terracotta acté « pour l'instant ». Le sélecteur des maquettes garde bordeaux, violet et bleu électrique sous la main : sur parchemin, le terracotta se fond davantage dans le fond chaud que les accents froids.
- **La propagation aux autres écrans** — Carte, Communauté, Vitrine, Réglages, Abonnement, Boutique n'ont pas été maquettés.
- **Le vocabulaire** — le champ lexical médiéval (« Guilde », cf. [0004](0004-badge-certifie-levier-pro.md)) reste à réauditer, il sonne faux hors univers médiéval (cf. [0006](0006-virage-annuaire-homme-du-milieu.md)).
