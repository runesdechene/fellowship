---
paths:
  - "netlify.toml"
  - "vite.config.*"
  - "package.json"
  - "public/**"
---

# Déploiement et diffusion

> Netlify, service worker, embeds. Ce qui casse en ligne sans casser en local.
> Regroupé le 25/09/2026 depuis la mémoire locale, pour que ce savoir voyage avec le dépôt.

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
