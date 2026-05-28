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
const TAG_EMOJIS: Record<string, string> = {
  'fete-medievale': '⚔️',
  'fantastique': '🐉',
  'geek': '🎮',
  'festival-musique': '🎵',
  'foire': '🛠️',
  'marche': '🧺',
  'salon': '🛍️',
  'litteraire': '📚',
  'historique': '🏰',
}

// eslint-disable-next-line react-refresh/only-export-components -- emoji helper colocated with TagBadge (festival-tag style, comme la landing)
export function getTagEmoji(slug: string): string {
  return TAG_EMOJIS[slug] ?? '🎉'
}

// Couleurs EXACTES des tags de la landing (marquee .etag) mappées aux tags de l'app.
const TAG_LANDING_COLORS: Record<string, string> = {
  'fete-medievale': '#e8a06a',
  'fantastique': '#c4a0e0',
  'geek': '#79b4d6',
  'festival-musique': '#b89ae0',
  'foire': '#e8c06a',
  'marche': '#f0a86a',
  'salon': '#7fc6b4',
  'litteraire': '#7fc6a0',
  'historique': '#d4be8a',
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
