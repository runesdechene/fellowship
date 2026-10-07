---
paths:
  - "**/netlify.toml"
  - "**/vite.config.*"
  - "**/package.json"
  - "apps/*/public/**"
---

# Déploiement et diffusion

> Netlify, service worker, embeds. Ce qui casse en ligne sans casser en local.
> Regroupé le 25/09/2026 depuis la mémoire locale, pour que ce savoir voyage avec le dépôt.

## Les deux sites et le cycle de déploiement

Depuis le 07/10/2026 : **déploiement manuel uniquement**. L'auto-deploy GitHub est coupé
(`stop_builds: true`) — un push sur `main` ne déploie rien.

| Site                | Id                                     | Sert                                   | Dossier         |
| ------------------- | -------------------------------------- | -------------------------------------- | --------------- |
| `fellowship-app`    | `8c479753-ecff-4c88-8069-2b25e7514925` | `flw.sh` (V1)                          | `apps/web`      |
| `fellowship-web-v2` | `fba73713-7b5e-4750-a8e2-b8e62e6ae4f7` | `flw.sh/v2/*` via redirection de la V1 | `apps/web-v2`   |

**Déployer depuis le dossier de l'app** : la CLI y lit `netlify.toml` (redirections, en-têtes).
Chez RdC, une V1 déployée depuis un autre dossier est partie sans ses redirections (05/10/2026).

**Les trois pièges de la CLI, payés le 07/10/2026 :**
- **`--site` prend l'id, pas le nom** : `--site fellowship-web-v2` répondait « Not Found » (chez
  RdC c'était l'inverse — ne pas s'y fier).
- **`--dir` en chemin absolu** : la CLI a résolu `--dir dist` depuis la racine du dépôt et publié
  le vieux `dist/` de la racine (un build de la V2 sans `/v2/`). Après un déploiement, comparer
  le hash du JS servi à celui du build local.
- **`--no-build`** : le build est fait en local, le `.env` racine fournit les variables.

**La V1 passe d'abord en brouillon** (sans `--prod`) : vérifier sur l'URL unique les en-têtes
(CSP, `frame-ancestors *` sur `/*/embed`, cache d'une heure sur `/embed.js`) et `/v2/`, puis
seulement `--prod`.

```bash
R="$(git rev-parse --show-toplevel)"
# V1 — depuis apps/web : brouillon, vérifications, puis prod
pnpm build && netlify deploy --no-build --dir "$R/apps/web/dist" --site 8c479753-ecff-4c88-8069-2b25e7514925
netlify deploy --prod --no-build --dir "$R/apps/web/dist" --site 8c479753-ecff-4c88-8069-2b25e7514925
# V2 — depuis apps/web-v2
pnpm build && netlify deploy --prod --no-build --dir "$R/apps/web-v2/dist" --site fba73713-7b5e-4750-a8e2-b8e62e6ae4f7
```

**Vérifier après chaque déploiement** : `curl -s https://flw.sh/v2/ | grep -o 'src="/v2/assets/[^"]*"'`
(la V2 répond sous `/v2/`) et `curl -s https://flw.sh/sw.js | grep -c v2` (la denylist est là).

## Le service worker de la V1 doit ignorer `/v2`

**Le piège** : la PWA de la V1 a une portée `/`. Sans exclusion, sa navigation de repli sert le
shell de la V1 à la place de `/v2/` — chez tous ceux qui ont déjà la V1 installée, et rien ne se
voit dans un navigateur neuf.

**How to apply :** garder `/^\/v2(\/|$)/` dans `navigateFallbackDenylist`
(`apps/web/vite.config.ts`). Vérifier dans `apps/web/dist/sw.js` après un changement de config
PWA, puis en prod sur un navigateur qui avait déjà la V1 (recharger deux fois).

## reference_netlify_header_order

Dans `netlify.toml`, quand plusieurs blocs `[[headers]]` matchent le même fichier, Netlify
applique la **dernière règle du fichier** pour une clé de header donnée — **PAS la plus
spécifique**. Intuition fausse (et un reviewer s'est planté dessus) : on croit que `/embed.js`
l'emporte sur `/*.js` car plus précis. Faux.

**Preuve (2026-06-05, v0.7.231)** : override cache `/embed.js` (max-age=3600) placé AVANT
`/*.js` (immutable 1 an) → la prod servait `embed.js` en **immutable** (le `/*.js` plus bas
écrasait). Déplacé APRÈS `/*.js` → `curl -sI https://flw.sh/embed.js` montre `max-age=3600`. OK.

**Règle** : une exception de header pour un fichier précis doit venir **après** la règle
glob générique (`/*.js`, `/*.css`) dans le fichier. Toujours **vérifier en prod par `curl -sI`**
après déploiement — ni les tests ni le build n'attrapent ça. Cf. [[project_progress]] (embed calendrier).

## reference_pwa_sw_breaks_embeds

**Piège (2026-06-05, v0.7.234).** L'iframe embed (`/:slug/embed`) marchait au premier
chargement puis se bloquait : `Framing 'https://flw.sh/' violates ... frame-ancestors 'none'`.

**Cause racine** : `vite-plugin-pwa` met par défaut `workbox.navigateFallback: 'index.html'`.
Le service worker, une fois actif dans l'iframe (la page embed est la même SPA → enregistre le
SW), sert pour la navigation `/:slug/embed` le **`index.html` précaché récupéré depuis `/`** —
qui porte l'en-tête `frame-ancestors 'none'` (header `/*` de netlify.toml). Le navigateur
applique ce CSP sur le document de l'iframe → blocage. Premier chargement (SW pas encore
actif) = réseau = `frame-ancestors *` (header `/*/embed`) = OK ; après activation du SW = shell
racine = cassé. **Un redeploy régénère le SW et fait réapparaître le bug.** Le serveur est
correct (`curl -sI https://flw.sh/<slug>/embed` → `frame-ancestors *`) — c'est 100 % le SW.

**Fix** : `vite.config.ts` → `workbox.navigateFallbackDenylist: [/\/embed(?:$|\?)/]`. Les
navigations `/embed` sortent du fallback → vont au réseau → reçoivent `frame-ancestors *`.

**Propagation** : le SW cassé reste dans le navigateur du client. Pour le remplacer : ouvrir
`https://flw.sh` + `Ctrl+Shift+R` (met à jour le SW pour tout le domaine), puis recharger la
page hôte. En dernier recours : DevTools → Application → Service Workers → Unregister.

**Leçon générale** : toute route flw.sh destinée à être **embarquée en iframe tierce** doit
être exclue du `navigateFallback` du SW, sinon le CSP `frame-ancestors 'none'` du shell racine
la bloque. Cf. [[reference_netlify_header_order]], [[project_progress]] (embed calendrier).

## reference_contact_email

Email de contact officiel pour les users de Fellowship :

**appfellowship@pm.me** (ProtonMail)

Exposé dans la page Réglages depuis v0.7.196 (mailto direct, pas de form ni chatbot — filet de sécurité post-lancement décidé 2026-05-28).

C'est le point de contact unique pour bugs critiques et suggestions tant qu'on n'a pas de canal communautaire (pas de Discord, pas de Telegram — cf. [[project_post_launch_outreach]] : on va aux users en direct au lieu de monter un chat). Re-utiliser cet email partout où un contact app est nécessaire (pied de page landing, About, mentions légales) — ne pas en inventer d'autre.
