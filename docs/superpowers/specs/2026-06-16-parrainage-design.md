# Parrainage Fellowship — « Offre un mois, gagne un mois »

**Date :** 2026-06-16
**Statut :** Design validé (brainstorm Uriel × Charixos), prêt pour plan d'implémentation
**Contexte business :** Décision d'activer un levier de croissance virale dans le milieu
exposant (forte densité sociale, bouche-à-oreille physique au stand). Objectif : effet
boule de neige sur l'acquisition d'abonnés Pro.

---

## 1. Le deal en une phrase

**« Offre un mois, gagne un mois. »**

- Le **filleul** a son **1er mois Pro offert** immédiatement à la souscription.
- Le **parrain** gagne **un mois** ~30 jours plus tard, **uniquement quand le filleul paie
  sa première vraie facture** (anti-fraude).

Le message est identique pour tout le monde — gratuit comme Pro, on gagne un mois de Pro.

---

## 2. Décisions de design (verrouillées)

| # | Décision | Choix retenu | Pourquoi |
|---|----------|--------------|----------|
| 1 | Sens de la récompense | **Bilatéral** (parrain ET filleul gagnent) | Le filleul doit avoir une raison de sortir la CB ; le parrain a alors un argument de vente, pas juste un lien. |
| 2 | Forme | **Symétrique : un mois de chaque côté** | Message imbattable de simplicité, se raconte en une phrase au stand. |
| 3 | Déclenchement récompense parrain | **À la 1ʳᵉ facture réellement payée du filleul** | Tue le farming (faux comptes auto-parrainés). On ne récompense que sur du revenu encaissé. |
| 4 | Éligibilité parrain | **Tout le monde** (gratuit ET Pro) | Les gratuits sont la plus grosse armée d'ambassadeurs. Bonus : le gratuit qui parraine goûte au Pro → levier d'activation. |
| 5 | Plafond | **Aucun** | Grâce au verrou anti-fraude, chaque mois offert = un abonné payant réel acquis. Plafonner = brider ses meilleurs ambassadeurs. |
| 6 | Attribution | **Lien + code lisible** | Lien pour le digital (WhatsApp/stories/groupes FB), code dicible à voix haute pour le physique au stand. |
| 7 | Génération du code | **Dérivé du nom/marque + suffixe si collision** (ex. `RUNEDECHENE`, puis `RUNEDECHENE2`) | Mémorable et dicible ; un code aléatoire imprononçable saboterait l'usage physique. |
| 8 | Emplacement UI | **Section dans la page Abonnement + bandeau au mur du quota** | L'argent vit dans Abonnement ; le bandeau transforme le mur frustrant du quota en opportunité. |
| 9 | Titre « Ambassadeur Fellowship » | **Débloqué au 1er filleul payant, permanent à vie, binaire en V1** | Le statut est le motivateur le moins cher qui existe ; dans un milieu où la réputation entre pairs pèse, un titre public peut dépasser le mois offert. Même registre que le badge Certifié (décision 0004). |

---

## 3. Les trois récompenses (mécanique précise)

### 3.1 Filleul — 1er mois offert (immédiat)
- À la souscription, on applique un **coupon Stripe « 100% off, 1 mois »** (même nature que
  le coupon existant `GUILDEDESVOYAGEURS`, déjà géré par le webhook et les colonnes
  `discount_end` / `discount_label`).
- **Ce coupon REMPLACE les 14 jours d'essai par défaut** (`trial_period_days: 14` dans
  `stripe-checkout-session`). On ne stacke pas : un seul cadeau net de 30 jours, une seule
  date de 1ʳᵉ facture claire — qui est précisément le déclencheur de la récompense parrain.
- **Une seule fois par entité, à vie.** Une entité déjà abonnée (ou ayant déjà consommé un
  cadeau filleul) n'est pas éligible.

### 3.2 Parrain Pro — crédit d'un mois (différé)
- Crédit **Stripe natif sur le `customer balance`**, d'une valeur égale à **un mois de son
  plan** (mensuel ou annuel — on lit le prix mensuel-équivalent).
- Appliqué automatiquement à sa **prochaine facture**. Idempotent, fonctionne identiquement
  pour mensuel et annuel.
- UI : « un mois offert » partout ; la mécanique s'adapte.

### 3.3 Parrain gratuit — un mois de Pro offert (différé)
- Le parrain gratuit n'a pas de customer Stripe → impossible de lui « vendre » un mois.
- **Solution :** colonne `comped_pro_until timestamptz` sur l'entité. Le gating Pro lit :
  **`Pro si plan = 'pro' OU comped_pro_until > now()`**.
- Plusieurs parrainages cumulent : on **étend** `comped_pro_until` d'un mois à chaque
  filleul payant (depuis `max(now(), comped_pro_until)`).
- Bonus produit : le gratuit goûte au Calendrier / Communauté / Dashboard → bien plus
  susceptible de convertir ensuite.

---

## 4. Les trois flux

### 4.1 Attribution (rattacher filleul → parrain)
1. Le parrain partage son **lien** (`https://flwsh…/?r=RUNEDECHENE`) ou dicte son **code**.
2. Filleul arrive : capture du `?r=CODE` (persisté côté client, ex. localStorage) **ou**
   saisie manuelle du code dans l'**Onboarding**.
3. À la création de l'entité du filleul → insertion d'une ligne `referrals`
   (statut `attributed`), liant parrain ↔ filleul.
4. **Blocages automatiques** à ce stade :
   - auto-parrainage (parrain = filleul, même acteur),
   - filleul déjà abonné ou ayant déjà consommé un cadeau filleul,
   - code inexistant/invalide → simplement ignoré (le filleul s'inscrit normalement).

### 4.2 Récompense filleul (immédiate, à la souscription)
- Au checkout Stripe du filleul attribué : on injecte le coupon « 1er mois offert » (§3.1)
  à la place du trial 14j.
- Le webhook persiste `discount_end` / `discount_label` comme pour les codes promo actuels.

### 4.3 Récompense parrain (différée, anti-fraude)
- Le webhook `stripe-webhook` écoute la **1ʳᵉ vraie facture payée** du filleul :
  `invoice.paid` avec **montant > 0** (donc après le mois offert).
- À cet instant :
  1. Marquer la `referrals` correspondante `rewarded`, horodater.
  2. Si parrain **Pro** → ajouter le crédit `customer balance` (§3.2).
  3. Si parrain **gratuit** → étendre `comped_pro_until` (§3.3).
- Idempotence : réutilise le mécanisme `stripe_events_processed` déjà en place + un statut
  `rewarded` non rejouable sur la ligne `referrals`.

---

## 5. Modèle de données

### `referral_codes`
| Colonne | Type | Notes |
|---------|------|-------|
| `code` | `text` PK ou unique | dérivé du nom + suffixe si collision, normalisé (MAJ, sans accents/espaces) |
| `owner_entity_id` | `uuid` | l'entité propriétaire (là où vit le Pro / la facturation) |
| `created_at` | `timestamptz` | généré à la 1ʳᵉ visite de la page Parrainage |

> **Point à confirmer au plan (§8) :** le code appartient à l'**entité**, car c'est là
> qu'atterrissent les deux types de récompense (crédit Stripe ou `comped_pro_until`).
> Vérifier que tout acteur parrain dispose bien d'une entité dans le modèle acteur.

### `referrals`
| Colonne | Type | Notes |
|---------|------|-------|
| `id` | `uuid` PK | |
| `parrain_entity_id` | `uuid` | |
| `filleul_entity_id` | `uuid` | unique (un filleul = un seul parrain, à vie) |
| `status` | `text` | `attributed` / `rewarded` / `rejected_fraud` |
| `attributed_at` | `timestamptz` | |
| `filleul_first_paid_at` | `timestamptz` | la 1ʳᵉ facture réelle |
| `parrain_rewarded_at` | `timestamptz` | |

### `entities` (ajouts)
| Colonne | Type | Notes |
|---------|------|-------|
| `comped_pro_until` | `timestamptz` | Pro offert hors Stripe (récompense parrain gratuit) ; gating : `plan='pro' OR comped_pro_until > now()` |

---

## 5bis. Titre « Ambassadeur Fellowship »

Couche de **statut public** par-dessus la récompense matérielle. Même registre que le
badge Certifié (décision 0004) : on vend la crédibilité, pas une feature.

- **Déclencheur :** débloqué dès le **premier filleul `rewarded`** (= qui a payé une vraie
  facture). Réutilise *exactement* le signal anti-fraude déjà posé — aucune nouvelle
  plomberie ni nouvelle faille.
- **Permanent à vie :** si le filleul résilie plus tard, le parrain **garde** son titre.
  Il a réellement ramené un membre payant ; le retirer serait punitif et découragerait le
  parrainage.
- **Binaire en V1 :** « Ambassadeur Fellowship », point. Les paliers (Bronze/Argent/Or à
  1/5/10 filleuls) appartiennent au système de cagnotte gamifiée noté en **V2** (§9).
- **Affichage :** sur la **vitrine** (identité publique = `entities`, cf. split
  Réglages/Vitrine). Dérivé en lecture : `EXISTS (referrals WHERE parrain = moi AND
  status = 'rewarded')` — pas besoin d'une colonne dédiée a priori (à arbitrer au plan
  selon le coût de la lecture sur la vitrine).
- **Point d'attention lead dev :** sur la vitrine on pourra avoir **Certifié + Ambassadeur**
  côte à côte. Penser la **hiérarchie visuelle** pour ne pas transformer le profil en sapin
  de Noël.

---

## 6. UI / points d'entrée

- **Section « Parrainage » dans la page Abonnement** : le code, le lien à copier en un clic,
  le nombre de filleuls, les mois gagnés.
- **Bandeau au mur du quota** : quand un gratuit atteint le plafond (10 dates à venir),
  au lieu du seul « passe Pro », ajouter *« …ou parraine un ami et gagne ton mois »*.
  Transforme un point de friction en opportunité d'acquisition.
- **Champ « code de parrainage » dans l'Onboarding** + capture automatique du `?r=` à
  l'arrivée sur le site.

---

## 7. Sécurité & tests

**Anti-fraude (par ordre d'importance)**
1. **Trigger sur paiement réel** (cœur du dispositif) — aucune récompense sans revenu encaissé.
2. Blocage de l'auto-parrainage (parrain ≠ filleul).
3. Un cadeau filleul par entité, à vie.
4. **Surveillance anti-vélocité** (hors-produit) : alerte si 20+ parrainages en 24h depuis
   la même IP — repère le farming industriel.

**Tests à couvrir**
- Attribution correcte (lien `?r=` et saisie manuelle).
- Idempotence webhook (precedent `stripe_events_processed`) — pas de double récompense.
- **Non-récompense si le filleul churne pendant le mois offert** (jamais de 1ʳᵉ facture payée).
- Blocage auto-parrainage.
- Calcul du crédit « un mois » correct en **mensuel ET annuel**.
- Filleul déjà abonné / déjà-parrainé → non éligible au cadeau filleul.
- Gating Pro lit bien `comped_pro_until` (parrain gratuit récompensé devient Pro).
- **Titre Ambassadeur** débloqué dès le 1er filleul `rewarded`, et **conservé** même si ce
  filleul résilie ensuite (permanence à vie).

---

## 8. Points à confirmer au moment du plan d'implémentation

1. **Binding acteur/entité** : confirmer que tout parrain (y compris gratuit) possède une
   entité support pour le code et la récompense (modèle « Pro par entité »).
2. **Stripe : meilleure primitive pour le crédit parrain** — `customer balance` credit vs
   coupon vs autre ; valider l'idempotence et l'affichage sur la prochaine facture.
3. **Réconciliation coupon « 1er mois offert » ↔ trial 14j** dans `stripe-checkout-session`
   (retirer le trial pour les filleuls attribués, appliquer le coupon à la place).
4. **Emplacement exact du bandeau** (confirmer le mur du quota comme point d'ancrage principal).

---

## 9. Évolutions notées (hors scope V1)

- **Cagnotte gamifiée / super-parrains** (Piste 3 du brainstorm) : paliers visibles, badges
  « top parrain », **et les paliers du titre Ambassadeur (Bronze/Argent/Or à 1/5/10
  filleuls)**. À considérer en V2 une fois la mécanique de base validée — cible les leaders
  d'opinion du milieu. Voir la décision 0004 (badge Certifié) pour la logique « vendre la
  crédibilité / le statut ».
