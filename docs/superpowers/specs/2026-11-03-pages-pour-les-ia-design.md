# Pages lisibles par les IA — conception

> 03/11/2026 · décidé avec Uriel · décision tracée dans `_État.md` du vault (Tranché)

## Pourquoi

Les exposants ne cherchent plus leurs dates sur Google : ils les demandent à leur agent IA
(ChatGPT, Gemini, Perplexity, Claude). L'agent cherche dans un index (Bing, Google, Brave), puis
lit la page. Il cherche avec des **superlatifs** : « les 5 fêtes de métal à ne pas rater »,
« les fêtes médiévales immanquables en PACA », « meilleurs festivals fantastiques de France »,
et avec les mots **candidature** et **stand**. Le nom exact du festival vient en dernier.

Aujourd'hui `flw.sh` est une application React : un agent qui n'exécute pas le JavaScript y lit
une coque vide. Pour lui, Fellowship n'existe pas. Les Échoppes nous battent ; sur la recherche
« fête médiévale janvier PACA », c'est un article annuel de Fréquence Sud qui gagne
(« Les Fêtes Médiévales 2026 en région PACA »), pas un annuaire.

Notre avantage : chaque fiche réunit ce qui est éparpillé ailleurs dans des PDF de mairies —
dates, prix du stand, date limite, lien de candidature. Mantra : *Fellowship t'aide à choisir tes
festivals et s'occupe du reste.* À terme, Fellowship sera le copilote sur lequel l'exposant branche
son IA pour maîtriser sa saison (pas dans ce chantier) : ces pages en sont la porte d'entrée.

## Objectifs

1. Toute fiche publique et toute page de sélection se lit **sans JavaScript** : titre,
   description, faits, données structurées.
2. Des **pages de sélection** au superlatif, par type × région et par type pour la France,
   qu'un agent peut citer telles quelles.
3. Une **sélection automatique**, recalculée sans intervention ni déploiement.

## Comment on saura que ça marche

- **Dix recherches de référence**, posées à ChatGPT, Perplexity, Gemini et Claude **avant** la
  mise en ligne, puis chaque mois : Fellowship est-il cité, et quelle page ? Exemples :
  « fête médiévale PACA candidature », « les 5 festivals fantastiques à ne pas rater »,
  « marché de Noël médiéval stand Suisse ». La liste et les relevés vivent dans
  `docs/v2/visibilite-ia.md`.
- **Les visites venues des IA** (référents `chatgpt.com`, `perplexity.ai`, `gemini.google.com`,
  `claude.ai`) et les inscriptions qui suivent.
- **Horizon : trois mois.** Si aucune IA ne cite une page de sélection sur les dix recherches au
  bout de trois mois, les pages sont trop génériques : on passe à moins de pages, plus incarnées.

## Hors périmètre

- Le copilote branché sur l'IA (accès direct pour les agents, MCP) : plus tard.
- Les pages par mois : la recherche montre que le gagnant est type × région × année, mois à
  l'intérieur ; et janvier en PACA est vide.
- Le référencement Google pour lui-même : il vient avec, ce n'est pas la cible.
- Faire laisser plus d'avis : sujet à part.

## Anti-objectifs

- **Jamais « selon les exposants »** sur la sélection : elle est la nôtre et se dit
  « la sélection Fellowship ». Pas d'avis inventés. (31 avis sur 116 fêtes au 03/11/2026 : un
  classement par note serait faux.)
- **Pas de page vide** : une page de sélection n'existe que si elle a au moins **3 fêtes à venir**.
- **Ne pas vider le Pro** : publiquement, au plus la note moyenne et le nombre d'avis ; jamais le
  texte complet des avis, jamais une recette chiffrée.
- **Ne jamais exposer une fiche privée** : lecture avec la clé anonyme, la RLS décide (comme
  `sitemap.mjs`).

## Ce qui est décidé

**0. Prérequis — le département propre.** La colonne `events.department` est sale (`81`,
`Creuse (23)`, `1700 (CH)`, « Fribourg »). Chaque fiche française reçoit un département
normalisé d'où se déduit la région ; les fiches hors de France (Suisse, Belgique) ont leur pays.
C'est une migration de données, faite en premier ; la forme exacte (colonne région ajoutée ou
table de correspondance) est au builder. Une case de `_État.md` l'attendait déjà.

**1. Les fiches lisibles.** `/evenements/:slug` est servie avec, dans le HTML même : `<title>` et
`<meta name="description">` propres à la fiche, balises Open Graph, un bloc JSON-LD schema.org
`Event` (nom, dates, lieu avec adresse et coordonnées, image, organisateur, `url` de candidature),
et le texte de la fiche en clair (dates, lieu, prix et taille du stand, date limite et lien de
candidature, note moyenne et nombre d'avis s'il y en a).

**2. Les pages de sélection.**
- Une par **type × région** (« Les fêtes médiévales immanquables pour un exposant en Occitanie
  en 2027 — la sélection Fellowship ») et une par **type pour la France**. Les fiches hors de
  France ont leurs propres pages **par pays** (« … en Suisse »), jamais dans les pages France.
- **Écrites pour l'exposant, pas pour le visiteur** : notre terrain est celui où l'on est seul
  (tout pour candidater au même endroit), pas celui des médias de sortie.
- La formule « la sélection Fellowship » est **la même partout, mot pour mot** : c'est la
  signature que les IA doivent retenir.
- Contenu : un court chapeau, le **top 5** de la sélection, puis **toutes les autres dates à
  venir** du type et de la région, par date.
- **La raison de chaque ligne est un fait chiffré**, pas un adjectif : « stand 3×3 à 100 €,
  candidatures jusqu'au 15 mars, 8 000 visiteurs attendus », jamais « immanquable » seul.
- **Le coup de cœur d'Uriel** (optionnel) : Uriel peut épingler une fête par sélection, avec une
  phrase signée de lui. Elle remonte en tête et donne à la page un regard d'exposant qu'aucun
  score ne remplace. Sans épingle, la page est entièrement automatique.
- Chaque ligne : nom, dates, ville, prix du stand, date limite et lien de candidature, lien vers
  la fiche.
- JSON-LD `ItemList` d'`Event`.
- Les types viennent de la table `tags` (slugs déjà utilisés sur les fiches).

**3. Le score de la sélection** (automatique, ma proposition validée par Uriel) :
- taille : `expected_attendance` ;
- ancienneté : `edition` et la chaîne `previous_edition_id` ;
- intérêt des exposants : nombre de `participations` sur la fête ;
- avis : bonus quand il y en a (`reviews` : `affluence`, `organisation`, `rentabilite`), jamais
  la base ;
- fiche complète : prix du stand, lien de candidature, affiche — une fiche sans ces informations
  est pénalisée, elle ne sert à rien à l'agent de l'exposant.
Les poids exacts sont au builder ; le score doit tenir dans une fonction pure, testée.

**4. Pour les machines.** `sitemap.xml` étendu aux pages de sélection ; un `llms.txt` à la racine
qui dit ce qu'est Fellowship et liste les pages de sélection ; `robots.txt` qui laisse passer les
robots des IA.

**5. Toujours à jour sans déploiement.** Comme `sitemap.mjs` : lu en base à chaque demande, mis en
cache une heure. Une fiche créée le matin est dans sa sélection le soir.

## Contraintes

- Monorepo pnpm, V2 dans `apps/web-v2` (React + Vite, application monopage), Netlify, Supabase.
  Déploiement manuel (`.claude/rules/deploiement.md`).
- Fonctions Netlify et non Supabase pour servir du HTML : Supabase rend ses fonctions en
  `text/plain` à certains clients et Netlify n'applique pas ses en-têtes à une réponse relayée
  (voir l'en-tête de `apps/web-v2/netlify/functions/sitemap.mjs`).
- La CSP de `netlify.toml` s'applique : un JSON-LD inline doit y passer
  (`<script type="application/ld+json">` n'est pas exécuté, mais vérifier qu'il n'est pas bloqué).
- **Le design appartient à Uriel ; la maquette Figma fait foi.** Les pages de sélection sont vues
  par des humains aussi : leur rendu dans l'application passe par une maquette validée
  (skill `frontend-design`) **avant** d'être codé. Les fiches ont déjà leur maquette
  (2506:233, 2518:233) : on n'y touche pas.
- Code simple, TypeScript strict, migrations horodatées appliquées par `supabase.exe db push`.

## Tranché par Claude après relecture (à vérifier par Uriel)

- **Pas de page de sélection publiée avant sa page React** : tant que la maquette n'est pas
  codée, les adresses de sélection restent hors de `sitemap.xml` et de `llms.txt` (aujourd'hui
  `/festivals/<type>` tombe sur la route `*` et React effacerait le contenu injecté). Les fiches,
  elles, peuvent partir seules.
- **Les compteurs du score** (`participations`, `reviews`) sont lus par une fonction
  `SECURITY DEFINER` qui ne rend **que des totaux par fête** (nombre d'intéressés et d'inscrits,
  note moyenne et nombre d'avis), jamais une identité. La RLS décide toujours quelles fiches sont
  visibles.
- **Le département d'une nouvelle fiche se déduit en base** (trigger depuis le code postal de
  l'adresse, ou les coordonnées), sans changer les formulaires.
- **La sélection est visible de tous**, connecté ou non (pas de renvoi vers `/explorer` comme
  `/festivals`).
- **L'année va dans le titre et le `<h1>`** (« … immanquables en Occitanie en 2027 »), pas dans
  l'adresse : une URL stable qui gagne en ancienneté. « À venir » = les 12 prochains mois.
- `events.tags` mélange noms et slugs (`lib/tags.ts`) : la correspondance prend les deux.

## Laissé au builder

- La technique de rendu. Piste : une Edge Function Netlify sur `/evenements/*` et les pages de
  sélection, qui lit la base et injecte dans l'`index.html` de l'application la tête de page, le
  JSON-LD et le contenu en clair dans `#root`, que React remplace au montage. Les humains voient
  l'application, les machines le contenu, avec la même URL et le même HTML pour tous (pas de
  page réservée aux robots).
- L'adresse des pages de sélection (proposition : `/festivals/<type>` et
  `/festivals/<type>/<region>`, `/festivals` existant déjà).
- Les poids du score, le texte des chapeaux et des « raisons courtes » (générés depuis les faits).
- Le découpage en lots : relevé des dix recherches → département propre → fiches lisibles →
  sélection (données) → maquette → page de sélection dans l'application. La maquette se fait
  tôt : tant qu'elle manque, les pages de sélection restent invisibles.
- Où et comment Uriel épingle son coup de cœur (l'administration V2 est le candidat naturel).

> Relu par le Conseil marketing simulé (Dunford, Sharp, Godin, Hopkins) le 04/11/2026 : cadre
> exposant, faits chiffrés, mesure de succès, coup de cœur signé.
