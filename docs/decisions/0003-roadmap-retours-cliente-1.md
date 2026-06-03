# 0003 — Roadmap : retours de la 1ʳᵉ cliente

- **Date :** 2026-06-03
- **Participants :** Uriel (CEO) · Claude (XO)
- **Statut :** `acté` (priorisation validée ; tickets à exécuter)
- **Source :** retour détaillé, par rubrique, de la **première cliente** (exposante) après usage réel.

## Contexte

Première utilisatrice payante, retour structuré et précis après usage terrain. Globalement
très positif (« un très bon outil »), avec une **validation forte du wedge** : elle adore les
outils par événement (bilan + notes perso) — *« je vais lâcher mon tableur Excel »*. Plusieurs
bugs concrets, quelques polish, une demande de feature, et **un retour stratégique majeur sur
la lisibilité** (trop d'infos répétées).

## Les 9 retours, triés

| # | Retour | Nature | Diagnostic | Effort | Priorité |
|---|--------|--------|------------|--------|----------|
| 1 | Bouton « retour » ramène toujours sur Explorer | 🐞 nav globale | Le retour suit une provenance par défaut au lieu du vrai historique → fix `navigate(-1)`. Touche toutes les pages. | S | P0 |
| 2 | Filtre par type (Explorer) affiche quand même tout | 🐞 core | `composeFilter` est correct → la **sélection de catégorie ne remonte pas** au filtre. Discovery cassé. | S-M | P0 |
| 3 | Barre de recherche (Explorer) sans effet | 🐞 core | Idem : l'input ne pilote pas le filtre. À débuguer avec #2. | S-M | P0 |
| 4 | Carousel défile seul / saute plusieurs au clic | 🐞 UX (mobile) | Autoplay 4,5 s qui court pendant le tap ; le pause-au-survol ne marche pas au toucher. | M | P0 |
| 5 | Section contact « Une question ? Un bug ? » (bas des Réglages) inatteignable sur mobile | 🐞 mobile | Scroll/hauteur de Réglages coupé avant la section contact (mailto). | S | P0 |
| 6 | Calendrier : afficher la date des events des copains sans cliquer | ✨ polish | Date inline sur les events amis. | S | P1 |
| 7 | Cockpit : le bandeau bilan revient après fermeture | ✨ polish | Le « fermer » est local → revient au remount. Persister (par jour / par event, localStorage). | S | P1 |
| 8 | Vue des **événements refusés** + note du pourquoi | 🆕 feature | Statut `refuse` déjà en base (masqué). Vue dédiée + champ note = pile le positionnement « carnet de bord / CRM ». | M | P1 |
| 9 | **Trop d'infos répétées sur plusieurs pages** | 🧭 stratégique | Voir ci-dessous — le retour-reine. | — | P2 |

## Le retour stratégique (#9) — lisibilité

La cliente trouve l'app **riche mais chargée** : mêmes infos dupliquées (les dates de ses
events apparaissent sur le **compte**, le **calendrier** ET le **cockpit**), beaucoup de boutons
qui renvoient ailleurs. Elle a raison, et ça **colle à notre positionnement** : on veut l'outil
*calme et lisible* face au concurrent fouillis. On a construit vite → on a sprawlé.

**Principe retenu : chaque surface a UN job ; si une info ne sert pas ce job, on la coupe.**
- **Calendrier** = planifier la saison → les dates y sont chez elles.
- **Cockpit** = la prochaine action → « prochain festival », pas re-lister tout.
- **Compte / Réglages** = identité + paramètres → **pas un agenda** (cohérent avec la décision
  « Réglages vs Vitrine » : Réglages = compte, pas vitrine/agenda — on a dérivé). Exemple validé
  par la cliente : **virer les dates de la page compte**.

→ **Chantier dédié : audit « une info = un endroit canonique »** (lister chaque info, lui
assigner sa page maison, dégager les doublons). C'est ce qui fera passer de « riche mais chargé »
à « limpide ».

## Décision — ordre d'exécution

- **P0 — bugs qui frappent un user payant immédiatement** : #2 + #3 (filtre/recherche Explorer),
  #1 (retour global), #5 (contact mobile), #4 (carousel).
- **P1 — quick wins satisfaction** : #7 (bilan persistant), #6 (dates copains calendrier),
  #8 (événements refusés).
- **P2 — chantier stratégique** : #9 audit de lisibilité.

## Conséquences

- Chaque P0/P1 → son cycle spec léger → plan → build (sous-agents) selon l'habitude.
- #9 mérite sa propre session de design (audit IA), pas un simple ticket.
- Garder la cliente dans la boucle : ces fixes répondent à SON retour → bon momentum relationnel
  (1ʳᵉ ambassadrice).

## Lié à

- [0002 — Cockpit exposant](0002-cockpit-exposant.md) (bandeau bilan #7)
- Décision « Réglages vs Vitrine » (mémoire) — principe de séparation compte/vitrine (#9)
