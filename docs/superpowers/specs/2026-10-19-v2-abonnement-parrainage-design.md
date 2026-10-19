# V2 — abonnement complet et parrainage (chantier 3 avant la bascule)

**Pourquoi** : avant que la V2 passe à la racine de `flw.sh`, un exposant doit pouvoir y gérer tout
son abonnement et parrainer, sans ouvrir la V1 (Uriel, 19/10/2026). Pas de maquette Figma pour ces
morceaux : Uriel a choisi qu'ils soient composés des briques existantes, puis relus.

## Ce qui marche déjà (rien à faire)

- Code promo : saisi au paiement Stripe (`allow_promotion_codes`).
- Raison sociale : demandée par Stripe au paiement, recopiée en base par le webhook.
- Parrainage côté filleul : code à l'inscription (`/bienvenue`), essai de 30 jours.
- Carte bancaire, factures, résiliation : l'espace Stripe (« Gérer » dans les Réglages).

## Ce qui se construit

1. **La phrase de l'enseigne dit vrai** (Réglages, « Enseignes et abonnement ») :
   paiement échoué · « s'arrête le X » si la résiliation est programmée · « offert jusqu'au X
   (CODE) » tant qu'un code promo couvre la facture.
   La résiliation programmée n'existait pas en base : colonne `entities.cancel_at`, écrite par le
   webhook (`cancel_at`, sinon fin de période si `cancel_at_period_end`), protégée par
   `protect_entity_plan`, lisible par `mes_enseignes()` seulement.
2. **Bandeau « paiement échoué »** en haut de l'app, tant que l'enseigne active est `past_due`, avec
   un bouton vers l'espace Stripe. *Choix de Claude* : partout plutôt que sur une seule page, parce
   que l'exposant perd le Pro s'il ne le voit pas.
3. **Facturation** : une ligne sous chaque enseigne abonnée (modèle « Siège social ou atelier ») :
   raison sociale et SIREN, modifiables dans une fenêtre (SIREN vérifié par sa clé, case « pas de
   SIREN »). Écrit par `stripe-update-billing` (propriétaire seul), qui recopie dans Stripe.
4. **Parrainage côté parrain** : une carte sur `/pro`, sous les deux offres, pour un compte
   exposant : le code à dicter, le lien à copier, les filleuls payants et en attente, le badge
   Ambassadeur. *Choix de Claude* : `/pro` parce que toutes les invitations du gratuit y mènent et
   que le parrain gratuit est la première cible. RPC existantes `ensure_referral_code`,
   `get_referral_overview`. Le lien reste `flw.sh/?r=CODE` : la V1 le capte aujourd'hui, la V2 le
   capte dès son arrivée (pour la bascule).
5. **Retour du paiement** : le bandeau ne dit plus « 14 jours » à un filleul qui en a 30 — il donne
   la date de fin d'essai lue en base.

## Hors périmètre

Rappel de fin d'essai (Uriel : on ne prévient pas pour l'instant). Saisie du code promo dans la V2
(Stripe le fait). Mobile de l'administration.
