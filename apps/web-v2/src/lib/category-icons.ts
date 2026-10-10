/**
 * QUOI     — l'icône de chaque catégorie, retrouvée par son nom ou son slug.
 * POURQUOI — planche Figma « 2027 — Catégories · icônes » (2215:2), validée par Uriel le
 *            11/10/2026 : une affiche absente montre l'icône de sa catégorie, étouffée. Les
 *            couleurs, elles, restent des données du back-office (lib/tags.ts).
 * ATTENTION — `events.tags` mêle des noms (V2) et des slugs (V1) : la table connaît les deux.
 *            Biker n'est plus utilisé (Uriel) : il retombe sur l'étiquette, comme tout inconnu.
 */
import {
  BookOpen,
  Castle,
  Clapperboard,
  Drama,
  FerrisWheel,
  Frame,
  Gamepad2,
  Lamp,
  Landmark,
  Music,
  PenTool,
  Presentation,
  Scissors,
  Store,
  Tag,
  Tent,
  TreePine,
  UtensilsCrossed,
  WandSparkles,
  Wheat,
  type LucideIcon,
} from 'lucide-react'

/** [slug, nom, icône], dans l'ordre de l'administration. */
const CATEGORIES: [string, string, LucideIcon][] = [
  ['fete-medievale', 'Médiéval', Castle],
  ['fantastique', 'Fantastique', WandSparkles],
  ['geek', 'Geek', Gamepad2],
  ['festival-musique', 'Musique', Music],
  ['foire', 'Foire', FerrisWheel],
  ['marche', 'Marché', Store],
  ['salon', 'Salon', Presentation],
  ['litteraire', 'Littéraire', BookOpen],
  ['historique', 'Historique', Landmark],
  ['exposition', 'Exposition', Frame],
  ['tatouage', 'Tatouage', PenTool],
  ['marche-noel', 'Marché de Noël', TreePine],
  ['marche-createurs', 'Marché de créateurs', Scissors],
  ['brocante', 'Brocante', Lamp],
  ['culturel', 'Culturel', Drama],
  ['terroir', 'Terroir', Wheat],
  ['cinema', 'Cinéma', Clapperboard],
  ['outdoor', 'Outdoor', Tent],
  ['gastronomique', 'Gastronomique', UtensilsCrossed],
  ['autre', 'Autre', Tag],
]

const BY_KEY = new Map<string, LucideIcon>(
  CATEGORIES.flatMap(([slug, name, icon]) => [
    [slug, icon],
    [name.toLowerCase(), icon],
  ]),
)

/** L'icône de la première catégorie connue ; l'étiquette sinon. */
export function categoryIcon(tags: readonly string[] | null): LucideIcon {
  for (const tag of tags ?? []) {
    const icon = BY_KEY.get(tag.trim().toLowerCase())
    if (icon) return icon
  }
  return Tag
}

/** La catégorie qui donne sa couleur et son icône à une affiche absente. */
export function firstCategory(tags: readonly string[] | null): string | null {
  return (tags ?? []).find((tag) => BY_KEY.has(tag.trim().toLowerCase())) ?? null
}
