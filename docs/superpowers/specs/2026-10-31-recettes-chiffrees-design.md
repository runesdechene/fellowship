# Les recettes chiffrées du bilan

> Spec du 31/10/2026, tranchée avec Uriel. Maquette validée : Figma `9CmmBD3t5rAk4tD583cdN3`,
> nœuds `2566:233` (affichées), `2566:524` (verrouillées), `2566:815` (fenêtre « Chiffrer tes
> recettes »), `2573:233` (Réglages · Compte). Téléphone : maquette à faire avant le code.

## Pourquoi

Beaucoup d'exposants refusent le Pro parce qu'ils ne veulent pas écrire leur vrai chiffre d'affaires
dans une base que d'autres pourraient lire (un admin, un pirate, une demande de l'administration).
On le leur rend impossible à lire, pour tout le monde sauf eux : **chiffré dans le navigateur, avec
une phrase de passe que Fellowship ne voit jamais.** On le présente comme de la confidentialité,
jamais comme une protection contre le fisc.

## Ce que voit l'exposant

- Dans la ligne d'ajout du registre, la catégorie **« Recettes chiffrées »**. La première fois, elle
  ouvre la fenêtre « Chiffrer tes recettes » : Carte, Espèces (préremplis avec ses recettes
  actuelles), Phrase de passe, Encore une fois, l'avertissement « Phrase oubliée, recettes
  perdues », le bouton « Chiffrer mes recettes ». Une fois la phrase choisie, la catégorie n'ouvre
  plus que les deux montants.
- Les recettes d'un bilan chiffré : deux lignes, **Carte** et **Espèces**, chacune avec la pastille
  « chiffré ». Toujours masquées (`•••• €`), **même à zéro**, tant que la phrase n'est pas tapée.
- Verrouillé : la ligne « Phrase de passe » + « Afficher ». Le total des recettes, le bénéfice, le
  bénéfice par jour, le chiffre d'affaires et la jauge d'objectif sont masqués ; les frais restent.
- La phrase se tape **une fois par session** (mémoire de l'onglet) et ouvre toutes les dates.
- La ligne de confidentialité devient « Visible par toi seul — tes recettes sont chiffrées,
  personne d'autre ne peut les lire » (l'ancienne, « aucun administrateur n'y a accès », est fausse).
- Mes bilans, le tableau de bord et « ton bilan de l'an passé » sur la fiche : déchiffrés si la
  phrase a été tapée dans la session, sinon masqués comme le résumé.
- Réglages · Enseignes et abonnement (31/10/2026, maquettes `2587:233`, `2587:396`, `2587:589`) :
  sous chaque enseigne Pro, quelle que soit l'enseigne active, une ligne « Recettes chiffrées »
  (« Changer la phrase », sans perte : tout est rechiffré dans le navigateur ; « Réinitialiser… »,
  qui efface la phrase et toutes les recettes chiffrées de l'enseigne) ou « Recettes en clair »
  (« Chiffrer mes recettes »). Plus rien dans Réglages · Compte.
- Verrouillage : 15 minutes sans activité dans l'onglet, la clé quitte la mémoire et les recettes
  se remasquent.

## Les règles

1. **Une phrase par enseigne** (l'acteur qui possède les bilans), pour tous ses bilans et tous ses
   appareils. Une enseigne partagée a une phrase partagée.
2. **Phrase forte** : au moins 16 caractères (Uriel, 31/10/2026 ; quatre mots et vingt caractères jugés trop contraignants).
3. **Chiffrer une date remplace ses recettes saisies** (lignes `in` de source `manual`) par Carte et
   Espèces. Le cachet de la fiche (ligne `stepper`) reste en clair : c'est l'organisateur qui le paie.
4. **Un bilan chiffré est rempli**, même sans autre ligne manuelle.
5. **La taille du chiffré ne trahit rien** : 0 € et 999 999,99 € donnent un message de même longueur.
6. Phrase oubliée sans réinitialisation : rien n'est récupérable, par personne.

## Le chiffrement

Web Crypto, rien d'autre. PBKDF2-SHA-256, 600 000 itérations, sel aléatoire de 16 octets par
enseigne → clé AES-GCM 256, non extractible. Chaque date : IV aléatoire de 12 octets, message
`{"carte":"000000412000","especes":"000000138000"}` (centimes sur 12 chiffres), stocké en base64
de `IV ‖ chiffré`. Pour reconnaître la bonne phrase : `check`, le mot `fellowship` chiffré à la
création.

## En base

- `revenue_keys` : `actor_id` (clé), `salt`, `iterations`, `check`, `created_at`.
- `report_secrets` : `actor_id`, `event_id` (clé double), `payload`, `updated_at`.
- RLS `can_act_as(actor_id)` sur les deux, comme `event_ledger_entries`.
- `reset_revenue_key(p_actor)` efface les deux d'un coup.

## L'Exposeur et le plugin Accueil

L'Exposeur ne peut plus additionner ces dates : il garde `ca`, `ca_reel`, `ca_projete` pour ce
qu'il sait lire, et ajoute `cle` (`salt`, `iterations`) et `secrets` : `[{ payload, dans_ca }]`,
où `dans_ca` vaut vrai quand la date n'a pas de CA espéré. Le plugin Accueil (dépôt
`Desktop/DEVs/Plugin`) déchiffre avec la phrase gardée dans le coffre d'Obsidian
(`app.secretStorage`), **une saisie par appareil**, et ajoute Carte + Espèces à `ca_reel`, et à `ca`
quand `dans_ca`.
