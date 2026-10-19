# Recette du parcours exposant — V2 (chantier 4, avant la bascule)

**Pourquoi** : avant que la V2 passe à la racine de `flw.sh`, un exposant doit pouvoir tout y faire
sans bug — créer son compte, ajouter ses dates, passer Pro, payer, gérer son abonnement, parrainer.
La base et Stripe sont ceux de la production : chaque étape ci-dessous crée de vraies données, à
faire par Uriel (Claude ne crée pas de compte et ne paie pas).

## Partie A — faite par Claude le 19/10/2026 (lecture seule)

- Ordinateur, session de Runes de Chêne, sur `flw.sh/v2` : tableau de bord, Explorer, Calendrier,
  Communauté, vitrine, Réglages, `/pro`, fiche d'un événement, ouverture d'« Ajouter une date » —
  tout se charge, aucune erreur dans la console.
- Téléphone : non vérifié (la fenêtre pilotée ne se rétrécit pas) — c'est la partie B, sur un vrai
  téléphone.
- Relecture du code du parcours complet : voir « Ce que la relecture a trouvé » plus bas.

## Partie B — Uriel, sur son téléphone, avec un compte de test

Prévoir une adresse e-mail neuve (ex. `uriel+recette@…`) et une fenêtre de navigation privée.
Noter à chaque étape ce qui accroche, même un détail.

1. **Lien de parrainage** — ouvrir `https://flw.sh/v2/?r=RUNESDECHENE` en navigation privée.
2. **Inscription** — se connecter avec l'adresse neuve, saisir le code reçu. Tant que le compte n'a
   pas le rôle V2, il est renvoyé vers la V1 : **ne pas y finir l'arrivée**.
3. **Rôle V2** — sur l'ordinateur, `flw.sh/v2/admin` → Personnes → le compte de test → rôle « V2 ».
4. **Arrivée** — revenir sur `flw.sh/v2/` dans la fenêtre privée : l'arrivée en 5 étapes, le code
   RUNESDECHENE déjà rempli à la dernière étape. Vérifier : l'enseigne existe, le prénom s'affiche.
5. **Ajouter une date** — une date dans 2 mois (passe), puis une dans 9 mois (le gratuit doit
   inviter vers le Pro). Changer son statut, renseigner le paiement du dossier.
6. **Passer Pro** — `/pro` → « Essayer 14 jours gratuitement » (le bouton dit 14 même à un filleul,
   texte de la maquette ; Stripe, lui, doit annoncer 30 jours). Payer avec ta carte et
   le code promo RUNE-2026 (rien n'est prélevé pendant l'essai). Au retour : le bandeau doit dire
   « Ton essai court jusqu'au … » (environ 30 jours plus tard), la carte Pro « Ton offre actuelle ».
7. **Réglages** — « Pro mensuel/annuel · offert jusqu'au … (RUNE-2026) » ou « essai jusqu'au … » ;
   la ligne « Facturation » : y saisir une raison sociale et un SIREN valide, enregistrer, vérifier
   la phrase, puis dans « Gérer » (Stripe) que la facture porte ce nom.
8. **Parrain** — sur Runes de Chêne, `/pro` : « 1 en attente de leur première facture ».
9. **Résilier** — « Gérer » → annuler l'abonnement dans Stripe → revenir : la phrase doit dire
   « s'arrête le … ». (Le paiement échoué ne se provoque pas en prod : il a été vu en local.)
10. **Supprimer** — Réglages → « Supprimer mon compte » (taper SUPPRIMER) : le compte, l'enseigne
    et l'abonnement Stripe disparaissent ; vérifier dans `/v2/admin` que l'enseigne n'est plus là.

## Ce que la relecture a trouvé (19/10/2026)

Rien ne bloque l'ensemble des comptes : lectures d'`entities` dans la liste blanche, RPC du parcours
bien signées, retours de Stripe vers `/v2/pro`, suppressions complètes, garde d'accès qui laisse
passer un compte neuf vers l'arrivée.

**Corrigé le 19/10/2026 (V2 2.55.1, webhook redéployé à part) :**
- Paiement échoué : le webhook écrivait « past_due » d'office ; au dernier échec, s'il arrivait
  après la fin de l'abonnement, l'exposant restait « paiement échoué », sans Pro, sans pouvoir se
  réabonner. Il recopie désormais l'état réel de l'abonnement.
- Un événement d'un ancien abonnement (résilié, impayé) écrasait le nouveau : il est ignoré tant
  qu'un autre abonnement court.
- Chargement du compte raté (coupure réseau) : l'app montrait un compte sans enseigne, et l'arrivée
  proposait d'en créer une deuxième. Elle dit maintenant « Ton compte n'a pas pu se charger » et
  propose de réessayer.
- Retour de Stripe : l'attente s'arrête quand l'abonnement arrive (et non le Pro, déjà vrai pour un
  Pro offert, ce qui rouvrait un second paiement) ; après 16 s, le bandeau dit de recharger.
- La carte de parrainage parlait de « 30 jours de Pro offerts » : c'est un essai de 30 jours.

**Tranché par Uriel le 19/10/2026 — un seul essai par enseigne** (l'Atelier du Pooka avait reprofité
de 14 jours en se réabonnant). `stripe-checkout-session` demande à Stripe si le client a déjà eu un
abonnement, quel qu'en soit l'état ; si oui, pas d'essai. Le bouton dit alors « M'abonner »
(V2 2.55.2).

**Pour la bascule (chantier 5), certains :**
- `can_use_v2()` n'ouvre la V2 qu'aux rôles `admin` et `v2` : à élargir à tous le jour J, sinon
  personne ne peut s'inscrire par la V2. Une erreur de cette vérification renvoie vers la V1.
- « Revenir à la V1 » (barre latérale, onglets) est visible par tous.
- `/v2/pro` écrit en dur dans `stripe-checkout-session` et `stripe-portal-link` : à changer si la V2
  quitte `/v2/`.

**Petits défauts laissés :**
- « Gérer », « Passer Pro », « Supprimer… » s'affichent aussi pour une enseigne partagée dont on
  n'est pas propriétaire (le serveur refuse : « Réessaie »). Aucune enseigne partagée aujourd'hui.
- Le bouton dit « Essayer 14 jours » à un filleul (texte de la maquette) ; l'annulation du paiement
  ramène sur `/pro` sans la formule choisie ; la fin de l'arrivée laisse une entrée en double dans
  l'historique.
- Les états `unpaid` / `incomplete` n'ont pas de bandeau ; ils dépendent des réglages de relance du
  tableau de bord Stripe (non vérifiés).
