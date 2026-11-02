/**
 * QUOI     — la catégorie qui dessine l'affiche absente d'un festival, et son dessin.
 * POURQUOI — planche Figma « 2027 — Affiches par défaut » (2704:287), validée par Uriel le
 *            02/11/2026 : une affiche absente devient une fausse affiche de festival, une par
 *            catégorie. Les dessins sont dans assets/posters/, un SVG par slug ; la palette et la
 *            police de chaque catégorie vivent dans le CSS (poster-cover.css).
 * ATTENTION — `events.tags` mêle des noms (V2) et des slugs (V1) : la table connaît les deux.
 *            Une fiche sans catégorie connue prend l'affiche « Autre ». Biker n'est plus utilisé
 *            (Uriel) et Cinéma est retiré (02/11/2026) : ils tombent aussi sur « Autre ».
 */

/** [slug, nom], dans l'ordre de l'administration. */
const CATEGORIES: [string, string][] = [
  ['fete-medievale', 'Médiéval'],
  ['fantastique', 'Fantastique'],
  ['geek', 'Geek'],
  ['festival-musique', 'Musique'],
  ['festival-metal', 'Metal'],
  ['foire', 'Foire'],
  ['marche', 'Marché'],
  ['salon', 'Salon'],
  ['litteraire', 'Littéraire'],
  ['historique', 'Historique'],
  ['exposition', 'Exposition'],
  ['tatouage', 'Tatouage'],
  ['marche-noel', 'Marché de Noël'],
  ['marche-createurs', 'Marché de créateurs'],
  ['brocante', 'Brocante'],
  ['culturel', 'Culturel'],
  ['terroir', 'Terroir'],
  ['outdoor', 'Outdoor'],
  ['gastronomique', 'Gastronomique'],
  ['autre', 'Autre'],
]

const SLUG_BY_KEY = new Map<string, string>(
  CATEGORIES.flatMap(([slug, name]) => [
    [slug, slug],
    [name.toLowerCase(), slug],
  ]),
)

const MOTIFS = import.meta.glob<string>('../assets/posters/*.svg', {
  eager: true,
  query: '?no-inline',
  import: 'default',
})

/** Le slug de la première catégorie connue ; « autre » sinon. */
export function posterCategory(tags: readonly string[] | null): string {
  for (const tag of tags ?? []) {
    const slug = SLUG_BY_KEY.get(tag.trim().toLowerCase())
    if (slug) return slug
  }
  return 'autre'
}

/** L'adresse du dessin d'une catégorie. */
export function posterMotif(slug: string): string | undefined {
  return MOTIFS[`../assets/posters/${slug}.svg`]
}
