/**
 * QUOI     — le pictogramme Instagram, au trait, au gabarit des icônes lucide.
 * POURQUOI — lucide a retiré ses logos de marque (son `Instagram` est déprécié, le lint le
 *            refuse) ; la vitrine en a besoin pour ses liens (lot 6b). Même dessin, même API.
 */
interface InstagramIconProps {
  size?: number
  strokeWidth?: number
}

export function InstagramIcon({ size = 24, strokeWidth = 2 }: InstagramIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}
