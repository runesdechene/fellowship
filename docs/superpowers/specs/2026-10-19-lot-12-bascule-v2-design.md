# Lot 12 — La bascule : la V2 à la racine de `flw.sh`

> Spec du 19/10/2026, tranchée avec Uriel le même jour. Livraison : **aujourd'hui**.

## Pourquoi

Tant que la V2 vit sous `/v2/`, réservée aux admins, l'application qu'on bâtit depuis le 07/10
ne sert personne et le référencement qu'on construit compte peu (vault, Tranché du 19/10/2026).
La V1 n'apporte plus rien que la V2 ne fasse, à quatre exceptions près, que ce lot rapatrie.

## Ce que veut Uriel

- **Aujourd'hui**, `flw.sh` sert la V2 à la racine, **pour tous les comptes**.
- **La V1 n'est plus servie à personne.** Son code reste dans le dépôt (`apps/web`), on ne le
  supprime pas ; aucune URL publique ne la montre (« on s'en fout pour l'utilisateur »).
- **Rien de ce que la V1 sert aujourd'hui ne casse** : pages légales, calendrier intégré sur les
  sites des artistes, anciens liens et slugs — « très important ».
- **Aucune adresse écrite en dur** : « un grave problème ».
- **Un message « nouvelle version, recharger »** pour qui a l'appli installée ou un onglet ouvert,
  à la bascule et à chaque mise à jour suivante.

## Hors périmètre

- Supprimer le code de la V1, ou toucher à la base (aucune migration : voir §3).
- Refaire le design de quoi que ce soit. Ce qui est rapatrié garde son apparence (§2).
- La recette partie B (téléphone, compte de test) : Uriel la fait après coup, sur la V2 ouverte.

## 1. Servir la V2 à la racine

- **`base: '/'`** dans `apps/web-v2/vite.config.ts`. Tout ce qui lit `import.meta.env.BASE_URL`
  (routeur, service worker, notifications, suppression de compte) suit seul.
- Retirer de `main.tsx` le rattrapage de `/v2` sans barre finale (il n'a plus d'objet).
- **`public/manifest.webmanifest`** : `id`, `start_url` et `scope` passent de `/v2/` à `/`. Avec
  l'`id` `/` (celui, implicite, du manifeste de la V1), l'appli V1 installée sur un téléphone
  devient l'appli V2. *(Choix de Claude.)*
- **Le site Netlify reste `fellowship-app`** (`8c479753-…`, celui qui porte le domaine `flw.sh`) :
  on y déploie désormais `apps/web-v2/dist`. Aucun changement de DNS ni de domaine. *(Choix de
  Claude : c'est la voie sans coupure ; `fellowship-web-v2` ne sert plus.)*
- **`apps/web-v2/netlify.toml` reprend les en-têtes de `apps/web/netlify.toml`** à l'identique :
  CSP, `frame-ancestors *` sur `/*/embed`, cache immuable sur `/assets/*`, `/*.js`, `/*.css`,
  et le cache d'une heure sur `/embed.js` **après** `/*.js` (`.claude/rules/deploiement.md`).
  La V2 tourne déjà sous cette CSP aujourd'hui (proxy `/v2/*`, vérifié par `curl -sI`).
- `.claude/rules/deploiement.md` et le script `pnpm deploy:v2` sont mis à jour : un seul site,
  l'id de `fellowship-app`, brouillon puis `--prod`.

## 2. Ce que la V2 rapatrie de la V1

### Pages légales

`/legal/mentions-legales`, `/legal/confidentialite`, `/legal/cgu`, `/legal/cgv`,
`/legal/charte-communautaire` : **le texte de la V1 mot pour mot**, dans une page V2 lisible sans
compte (typo et couleurs de la V2, une colonne de lecture). Pas de maquette : mise en page minimale,
à relire par Uriel. Les liens qui y menaient dans la V2 (pied de la landing, Réglages, arrivée)
pointent sur ces routes.

### Calendrier intégré

- `/:slug/embed` : la page `apps/web/src/pages/Embed.tsx` portée dans la V2 **avec son CSS
  propre** (`EmbedPage.css`) — même rendu, mêmes paramètres (`parseEmbedParams`), mêmes couleurs
  de tags. Ses dépendances V1 (`useTags`, `eventShareUrl`, `PUBLIC_ENTITY_COLUMNS`, icône
  `lucide-react`) sont remplacées par leurs équivalents V2 existants, ou recopiées si la V2 n'en a
  pas. Le lien d'un événement dans le calendrier mène à la fiche V2.
- `/embed.js` : recopié dans `apps/web-v2/public/`, `/embed-test.html` aussi (outil de test).
  **Sans adresse en dur** : `embed.js` déduit son origine de son propre `src`
  (`document.currentScript.src`, lu au chargement), et la page embarquée construit ses liens sur
  `location.origin`. Le comportement (redimensionnement, thème du site hôte) ne change pas.
- La page `/:slug/embed` ne s'enveloppe d'aucune coque (ni barre, ni session requise).
- Le service worker de la V2 n'intercepte aucune navigation, donc le piège du
  `navigateFallback` (deploiement.md) ne peut pas se reproduire.

### Anciens liens

**Redirections 301 dans `apps/web-v2/netlify.toml`** (le référencement suit, avant le routeur) :

| Ancien (V1, ou `/v2/…`) | Nouveau |
|---|---|
| `/v2/*` | `/:splat` (notifications, e-mails déjà envoyés, favoris des admins) |
| `/login`, `/auth/callback` | `/connexion` |
| `/onboarding` | `/bienvenue` |
| `/dashboard`, `/tableau-de-bord`, `/mes-dates`, `/notifications` | `/` |
| `/carte` | `/explorer` |
| `/suivis`, `/mes-createurs` | `/communaute` |
| `/profil` | `/reglages` |
| `/boutique`, `/abonnement` | `/pro` |
| `/admin/events` · `users` · `tags` · `testimonials` · `reports` | `/admin/evenements` · `comptes` · `categories` · `temoignages` · `signalements` |

Le paramètre `?r=` (parrainage) doit survivre aux redirections : Netlify conserve la query string
d'une 301 par défaut — à vérifier par `curl -sI` après déploiement.

**`/e/:slug`** (le lien partagé d'un événement dans la V1) : une route de la V2 qui cherche
l'événement par son `slug` (`events.slug`) et remplace l'URL par `/evenement/:id`. Slug inconnu :
même comportement qu'un identifiant inconnu sur `/evenement/:id`.

Déjà en place dans la V2, inchangés : `/`, `/calendrier`, `/explorer`, `/communaute`,
`/reglages`, `/evenement/:id`. `/:slug` est la dernière route : `/legal/…`, `/e/…` et
`/:slug/embed` sont déclarées avant.

### La vitrine publique

Dans la V1, `/:slug` se lit **sans compte** (lien que les artistes partagent, et pied du calendrier
intégré). Dans la V2, la route est derrière `ProtectedRoute` : un visiteur tomberait sur la
connexion. **La vitrine V2 s'ouvre donc sans compte, dans `GuestShell`**, comme la fiche d'un
événement depuis le lot 11b : sans modification en place, sans « Signaler ce profil », sans ce qui
exige une session. *(Choix de Claude, suivant le précédent de la fiche : à relire par Uriel.)*

## 3. La V2 ouverte à tous

- La garde d'accès de la V2 (`lib/access.ts`, `lib/useV2Access.ts`, `AccessRoute`, l'appel à
  `can_use_v2()`) est **supprimée** : un compte connecté entre ; un compte neuf passe par
  l'arrivée comme aujourd'hui. Le rôle `v2` n'a plus d'effet.
- **Aucune migration** : `can_use_v2()` reste en base, plus lue par personne →
  ligne dans `docs/v2/purge-back.md` (« À retirer avec la V1 »).
- « Revenir à la V1 » disparaît de la barre latérale et du menu « Moi » (`Sidebar.tsx`,
  `TabBar.tsx`), et `LeaveToV1` d'`App.tsx`.
- Ce qui reste admin (`/admin/…`) garde sa propre garde, inchangée.

## 4. Aucune adresse en dur

- **Stripe** (`stripe-checkout-session`, `stripe-portal-link`) : le retour se fait sur
  `${origin}/pro` (succès, annulation, portail). Le paramètre `returnTo` et la branche V1
  (`/boutique`, `/abonnement`) disparaissent — code mort croisé ; `lib/stripe.ts` ne l'envoie plus.
  `origin` vient de la requête ; son repli en dur `'https://flwsh.netlify.app'` est remplacé par
  la constante partagée ci-dessous.
- **Fonctions de prospection** (`prospect-inbound`, `prospect-unsubscribe`) : l'adresse du site
  vient d'**une seule constante partagée** dans `supabase/functions/_shared/` (ex.
  `APP_URL = 'https://flw.sh'`), et les chemins s'écrivent `${APP_URL}/admin/prospects`,
  `${APP_URL}/desinscription`.
- Le service worker et les notifications construisent déjà leurs URL depuis la portée : rien à faire.
- **Critère de fin** : `grep -rn "/v2" apps/web-v2/src apps/web-v2/public supabase/functions` ne
  trouve plus que des chemins de doc (`docs/v2/…`, `.claude/rules/v2.md`) et des données de test
  sans rapport (un endpoint de push Mozilla) ; l'exemple `flw.sh/v2/festivals` de
  `prospect-mail.test.ts` devient `flw.sh/festivals`. Idem pour `flwsh.netlify.app`.
- **Supabase Auth** : la V2 se connecte par code (`verifyOtp`), sans lien de retour ; le domaine
  ne change pas. Un lien de l'ancien e-mail vers `/auth/callback` tombe sur `/connexion` (§2).
  Rien à changer dans le tableau de bord.
- Les fonctions modifiées sont redéployées (`supabase functions deploy <nom>`).

## 5. « Une nouvelle version est disponible »

**À la bascule (téléphones et onglets qui ont la V1).** La V1 a un service worker Workbox à
`/sw.js`, portée `/`, qui sert sa coque depuis son cache. La V2 publie son propre `/sw.js` à la
même adresse : le navigateur le prend comme mise à jour, l'installe et l'active (il fait déjà
`skipWaiting` + `clients.claim`). Le code de la V1 encore ouvert ne peut rien afficher de nouveau —
il n'est plus servi. Donc, **une fois**, à son activation, le service worker de la V2 :
1. supprime les caches laissés par la V1 (`workbox-precache-*`, `workbox-runtime-*`) ;
2. **s'il en a supprimé**, recharge les fenêtres qu'il contrôle (`client.navigate(client.url)`),
   qui arrivent sur la V2 par les redirections du §2.

*Choix de Claude, à valider* : pour ce passage V1 → V2 unique, un rechargement automatique au lieu
d'un message, parce que la V1 ne peut plus afficher de message. Sans cache V1 trouvé (navigateur
neuf, ou mises à jour suivantes), il ne recharge rien.

**L'ancienne inscription `/v2/` (admins seulement).** Son script répondra par une 301, que les
navigateurs refusent pour un service worker : elle resterait, avec ses abonnements aux
notifications, et l'app à la racine se croirait « notifications coupées » (puis doublerait les
notifications si on les rallume). Au démarrage, l'app **désinscrit toute inscription dont la portée
se termine par `/v2/`** ; les admins réactivent leurs notifications une fois, comme prévu par la
spec du lot 8e. *(Choix de Claude.)*

**À chaque mise à jour de la V2 ensuite.** `__APP_VERSION__` existe déjà. Le build écrit
`dist/version.json` (`{ "version": "2.56.0" }`), servi sans cache. L'app relit ce fichier quand
l'onglet redevient visible et toutes les 10 minutes ; si la version diffère de celle qui tourne,
un bandeau en bas de l'écran : **« Une nouvelle version de Fellowship est disponible. »** et un
bouton **« Recharger »** (`location.reload()`). Pas de fermeture : il reste jusqu'au clic. Briques
existantes (`Button`, jetons du design system), sans maquette : **à relire par Uriel**. Logique
pure (comparer, décider d'afficher) testée.

## 6. Déploiement, dans cet ordre

1. Fonctions Supabase modifiées (§4) — elles acceptent encore l'ancien appel V2 tant que le front
   n'a pas changé ? **Non** : `returnTo` disparaît. Les déployer **juste avant** le front, dans la
   même minute ; pendant l'intervalle, un retour de Stripe tomberait sur `/pro` à la racine, servi
   par la V1 (lu comme une vitrine « pro » introuvable). Fenêtre de quelques secondes, acceptée.
2. Build de la V2, `netlify deploy` en **brouillon** sur `fellowship-app` : vérifier sur l'URL du
   brouillon les en-têtes (`curl -sI` : CSP, `/x/embed`, `/embed.js`, `/assets/…`), une redirection
   (`/abonnement` → `/pro`, `/v2/pro?r=X` → `/pro?r=X`), `/e/<un vrai slug>`, `/legal/cgu`,
   `/<une vitrine>/embed`, `/version.json`.
3. `--prod`. Revérifier les mêmes points sur `flw.sh`, puis : un navigateur qui avait la V1 se
   recharge seul sur la V2 ; le calendrier de Runes de Chêne intégré sur un site tiers s'affiche.
4. Dans Netlify, `fellowship-web-v2` n'est plus joint par personne : le laisser tel quel (pas de
   suppression sans accord).
5. Version : V2 **3.0.0**. Commit, push, `_État.md` du vault, plan directeur (lot 12 ☑).

## Annonce aux utilisateurs

Le plan directeur la prévoit dans le lot 12. **Non traitée ici** : à part, par Uriel (e-mail,
Instagram) — le message « nouvelle version » couvre le moment même.

## Laissé au constructeur

Nommage des fichiers et composants, emplacement exact du bandeau dans `AppShell`, découpage des
commits, choix entre recopier ou adapter une dépendance de l'embed.
