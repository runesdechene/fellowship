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

export function getTagIcon(slug: string): LucideIcon {
  return TAG_ICONS[slug] ?? Tag
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
      <Icon size={iconSize} strokeWidth={2} />
      {label ?? slug}
    </span>
  )
}
