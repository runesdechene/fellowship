import {
  Sword,
  Sparkles,
  Gamepad2,
  Music,
  Tent,
  ShoppingBasket,
  Presentation,
  BookOpen,
  Landmark,
  Tag,
  type LucideIcon,
} from 'lucide-react'

const TAG_ICONS: Record<string, LucideIcon> = {
  'fete-medievale': Sword,
  'fantastique': Sparkles,
  'geek': Gamepad2,
  'festival-musique': Music,
  'foire': Tent,
  'marche': ShoppingBasket,
  'salon': Presentation,
  'litteraire': BookOpen,
  'historique': Landmark,
}

// eslint-disable-next-line react-refresh/only-export-components -- helper colocated with TagBadge, used by HeroBanner & EventCarousel
export function getTagIcon(slug: string): LucideIcon {
  return TAG_ICONS[slug] ?? Tag
}

// Emojis alignés sur les libellés de la landing marquee (Landing.tsx > marqueTags).
// Ex : 'foire' = 🛠️ (Foire artisanale), 'marche' = 🧺 (Marché de producteurs),
// 'litteraire' = 📚 (Salon du livre).
// Les slugs ci-dessous DOIVENT correspondre à ceux saisis dans /admin/tags —
// si on ajoute un tag en DB sans ajouter sa ligne ici, l'Explorer tombe sur
// le fallback générique '🎉'.
const TAG_EMOJIS: Record<string, string> = {
  // Set d'origine (= seed migration `20260408200001_create_tags_table.sql`)
  'fete-medievale': '⚔️',
  'fantastique': '🐉',
  'geek': '🎮',
  'festival-musique': '🎵',
  'foire': '🛠️',
  'marche': '🧺',
  'salon': '🛍️',
  'litteraire': '📚',
  'historique': '🏰',
  'tatouage': '🌹',
  // Tags supplémentaires (admin doit créer ces slugs en DB pour brancher)
  'exposition': '🖼️',
  'marche-noel': '🎄',
  'marche-createurs': '🎨',
  'brocante': '🪑',
  'culturel': '🎭',
  'terroir': '🌾',
  'cinema': '🎬',
  'biker': '🏍️',
  'outdoor': '🏕️',
  'gastronomique': '🥘',
}

// eslint-disable-next-line react-refresh/only-export-components -- emoji helper colocated with TagBadge (festival-tag style, comme la landing)
export function getTagEmoji(slug: string): string {
  return TAG_EMOJIS[slug] ?? '🎉'
}

// Couleurs EXACTES des tags de la landing (marquee .etag) mappées aux tags de l'app.
// Voir [[TAG_EMOJIS]] ci-dessus pour la note sur la synchro slug/DB.
const TAG_LANDING_COLORS: Record<string, string> = {
  // Set d'origine (= seed migration)
  'fete-medievale': '#e8a06a',
  'fantastique': '#c4a0e0',
  'geek': '#79b4d6',
  'festival-musique': '#b89ae0',
  'foire': '#e8c06a',
  'marche': '#f0a86a',
  'salon': '#7fc6b4',
  'litteraire': '#7fc6a0',
  'historique': '#d4be8a',
  'tatouage': '#c4768a',
  // Tags supplémentaires — 4 premiers : couleurs copiées exactement de la
  // landing marquee. 6 suivants : couleurs warm/pastel cohérentes avec la DA.
  'exposition': '#7fc6a0',
  'marche-noel': '#e8897a',
  'marche-createurs': '#f0a86a',
  'brocante': '#d4be8a',
  'culturel': '#c4a0c4',
  'terroir': '#c4a06a',
  'cinema': '#8a98c4',
  'biker': '#9a9a9a',
  'outdoor': '#79c6a0',
  'gastronomique': '#e89a6a',
}

// eslint-disable-next-line react-refresh/only-export-components -- helper colocated with TagBadge
export function getTagLandingColor(slug: string): string {
  return TAG_LANDING_COLORS[slug] ?? '#e8a06a'
}

interface TagBadgeProps {
  slug: string
  label?: string
  bg?: string
  color?: string
  size?: 'sm' | 'md'
  className?: string
}

export function TagBadge({ slug, label, bg, color, size = 'sm', className = '' }: TagBadgeProps) {
  const Icon = getTagIcon(slug)
  const iconSize = size === 'sm' ? 12 : 14
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${
        size === 'sm' ? 'px-2.5 py-0.5' : 'px-3 py-1'
      } ${textClass} ${className}`}
      style={bg && color ? { background: bg, color } : undefined}
    >
      {/* eslint-disable-next-line react-hooks/static-components -- Icon is from TAG_ICONS static lookup, ref is stable */}
      <Icon size={iconSize} strokeWidth={2} />
      {label ?? slug}
    </span>
  )
}
