import type { ReactNode } from 'react'

const MONTH_SCENES: Record<number, (color: string) => ReactNode> = {
  // Janvier — flocons
  0: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="25" r="3" fill={c} opacity="0.3"/>
      <circle cx="120" cy="15" r="2" fill={c} opacity="0.2"/>
      <circle cx="200" cy="35" r="4" fill={c} opacity="0.15"/>
      <circle cx="280" cy="20" r="2.5" fill={c} opacity="0.25"/>
      <circle cx="350" cy="30" r="3" fill={c} opacity="0.2"/>
      <path d="M50 25 L50 15 M50 25 L50 35 M50 25 L42 19 M50 25 L58 19 M50 25 L42 31 M50 25 L58 31" stroke={c} strokeWidth="0.8" opacity="0.2"/>
      <path d="M200 35 L200 23 M200 35 L200 47 M200 35 L190 28 M200 35 L210 28 M200 35 L190 42 M200 35 L210 42" stroke={c} strokeWidth="0.8" opacity="0.12"/>
      <path d="M340 45 L340 37 M340 45 L340 53 M340 45 L334 40 M340 45 L346 40 M340 45 L334 50 M340 45 L346 50" stroke={c} strokeWidth="0.8" opacity="0.18"/>
      <path d="M0 65 Q100 50 200 60 Q300 70 400 55" stroke={c} strokeWidth="0.6" opacity="0.08" fill="none"/>
    </svg>
  ),
  // Février — cœurs
  1: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M80 35 C80 28 90 22 95 30 C100 22 110 28 110 35 C110 45 95 55 95 55 C95 55 80 45 80 35Z" fill={c} opacity="0.12"/>
      <path d="M220 25 C220 20 227 16 230 22 C233 16 240 20 240 25 C240 32 230 38 230 38 C230 38 220 32 220 25Z" fill={c} opacity="0.08"/>
      <path d="M330 40 C330 35 335 32 337 36 C339 32 344 35 344 40 C344 45 337 49 337 49 C337 49 330 45 330 40Z" fill={c} opacity="0.15"/>
      <circle cx="160" cy="45" r="1.5" fill={c} opacity="0.1"/>
      <circle cx="380" cy="25" r="1" fill={c} opacity="0.1"/>
    </svg>
  ),
  // Mars — pousses / bourgeons
  2: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 70 L60 45 M55 50 Q60 40 65 50" stroke={c} strokeWidth="1" opacity="0.2" strokeLinecap="round"/>
      <path d="M150 70 L150 50 M146 55 Q150 46 154 55" stroke={c} strokeWidth="1" opacity="0.15" strokeLinecap="round"/>
      <path d="M250 70 L250 42 M245 48 Q250 38 255 48 M243 55 Q250 44 257 55" stroke={c} strokeWidth="1" opacity="0.18" strokeLinecap="round"/>
      <path d="M340 70 L340 52 M336 57 Q340 48 344 57" stroke={c} strokeWidth="1" opacity="0.12" strokeLinecap="round"/>
      <path d="M0 72 Q100 68 200 70 Q300 72 400 69" stroke={c} strokeWidth="0.5" opacity="0.06" fill="none"/>
    </svg>
  ),
  // Avril — fleurs de cerisier
  3: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="30" r="6" fill={c} opacity="0.08"/>
      <circle cx="70" cy="30" r="3" fill={c} opacity="0.12"/>
      <circle cx="180" cy="20" r="8" fill={c} opacity="0.06"/>
      <circle cx="180" cy="20" r="4" fill={c} opacity="0.1"/>
      <circle cx="300" cy="35" r="5" fill={c} opacity="0.09"/>
      <circle cx="300" cy="35" r="2.5" fill={c} opacity="0.14"/>
      <circle cx="130" cy="50" r="4" fill={c} opacity="0.07"/>
      <circle cx="360" cy="18" r="3" fill={c} opacity="0.08"/>
      <path d="M70 36 L70 70" stroke={c} strokeWidth="0.6" opacity="0.1"/>
      <path d="M180 28 L175 70" stroke={c} strokeWidth="0.6" opacity="0.08"/>
      <path d="M300 40 L300 70" stroke={c} strokeWidth="0.6" opacity="0.1"/>
    </svg>
  ),
  // Mai — roses / fleurs ouvertes
  4: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="90" cy="30" r="8" fill={c} opacity="0.06"/>
      <path d="M90 22 L90 18 M82 30 L78 30 M98 30 L102 30 M90 38 L90 42 M84 24 L81 21 M96 24 L99 21 M84 36 L81 39 M96 36 L99 39" stroke={c} strokeWidth="0.7" opacity="0.15"/>
      <circle cx="90" cy="30" r="3" fill={c} opacity="0.15"/>
      <circle cx="250" cy="25" r="6" fill={c} opacity="0.05"/>
      <path d="M250 19 L250 16 M244 25 L241 25 M256 25 L259 25 M250 31 L250 34" stroke={c} strokeWidth="0.6" opacity="0.12"/>
      <circle cx="250" cy="25" r="2.5" fill={c} opacity="0.12"/>
      <path d="M90 38 L90 70 M250 31 L250 70" stroke={c} strokeWidth="0.6" opacity="0.08"/>
      <path d="M170 50 Q172 44 176 48 Q180 44 182 50" stroke={c} strokeWidth="0.7" opacity="0.1" fill="none"/>
      <path d="M350 35 Q352 29 356 33 Q360 29 362 35" stroke={c} strokeWidth="0.7" opacity="0.1" fill="none"/>
    </svg>
  ),
  // Juin — soleil
  5: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="200" cy="25" r="14" fill={c} opacity="0.08"/>
      <circle cx="200" cy="25" r="8" fill={c} opacity="0.1"/>
      <path d="M200 5 L200 0 M200 45 L200 50 M180 25 L175 25 M220 25 L225 25 M186 11 L182 7 M214 11 L218 7 M186 39 L182 43 M214 39 L218 43" stroke={c} strokeWidth="1" opacity="0.12" strokeLinecap="round"/>
      <path d="M0 65 Q50 60 100 62 Q200 55 300 60 Q350 62 400 58" stroke={c} strokeWidth="0.5" opacity="0.06" fill="none"/>
    </svg>
  ),
  // Juillet — vagues / plage
  6: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 50 Q50 40 100 50 Q150 60 200 50 Q250 40 300 50 Q350 60 400 50" stroke={c} strokeWidth="1.2" opacity="0.12" fill="none"/>
      <path d="M0 58 Q50 48 100 58 Q150 68 200 58 Q250 48 300 58 Q350 68 400 58" stroke={c} strokeWidth="0.8" opacity="0.08" fill="none"/>
      <path d="M0 65 Q50 56 100 65 Q150 74 200 65 Q250 56 300 65 Q350 74 400 65" stroke={c} strokeWidth="0.5" opacity="0.05" fill="none"/>
      <circle cx="320" cy="20" r="10" fill={c} opacity="0.06"/>
      <circle cx="320" cy="20" r="5" fill={c} opacity="0.08"/>
    </svg>
  ),
  // Août — lune / étoiles
  7: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M300 35 A12 12 0 1 1 300 15 A8 8 0 1 0 300 35Z" fill={c} opacity="0.1"/>
      <circle cx="80" cy="20" r="1.5" fill={c} opacity="0.15"/>
      <circle cx="150" cy="35" r="1" fill={c} opacity="0.12"/>
      <circle cx="220" cy="15" r="1.2" fill={c} opacity="0.1"/>
      <circle cx="370" cy="25" r="1" fill={c} opacity="0.12"/>
      <circle cx="40" cy="45" r="0.8" fill={c} opacity="0.1"/>
      <path d="M80 20 L80 17 M80 20 L80 23 M77 20 L83 20" stroke={c} strokeWidth="0.5" opacity="0.12"/>
      <path d="M220 15 L220 12 M220 15 L220 18 M217 15 L223 15" stroke={c} strokeWidth="0.5" opacity="0.08"/>
    </svg>
  ),
  // Septembre — feuilles qui tombent
  8: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M70 20 Q80 15 85 25 Q80 30 70 20Z" fill={c} opacity="0.12" transform="rotate(30 77 22)"/>
      <path d="M180 35 Q190 30 195 40 Q190 45 180 35Z" fill={c} opacity="0.08" transform="rotate(-15 187 37)"/>
      <path d="M290 15 Q300 10 305 20 Q300 25 290 15Z" fill={c} opacity="0.1" transform="rotate(45 297 17)"/>
      <path d="M350 45 Q358 41 362 48 Q358 53 350 45Z" fill={c} opacity="0.09" transform="rotate(10 356 47)"/>
      <path d="M130 55 Q136 51 139 56 Q136 60 130 55Z" fill={c} opacity="0.07" transform="rotate(-20 134 55)"/>
      <path d="M70 22 C75 30 85 45 80 60" stroke={c} strokeWidth="0.4" opacity="0.06" fill="none"/>
      <path d="M290 17 C295 28 285 42 290 58" stroke={c} strokeWidth="0.4" opacity="0.06" fill="none"/>
    </svg>
  ),
  // Octobre — citrouille
  9: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="200" cy="45" rx="18" ry="15" fill={c} opacity="0.08"/>
      <ellipse cx="190" cy="45" rx="12" ry="14" fill={c} opacity="0.05"/>
      <ellipse cx="210" cy="45" rx="12" ry="14" fill={c} opacity="0.05"/>
      <path d="M200 30 Q200 20 205 22" stroke={c} strokeWidth="1" opacity="0.12" fill="none" strokeLinecap="round"/>
      <path d="M196 33 Q192 28 198 30" stroke={c} strokeWidth="0.6" opacity="0.08" fill="none"/>
      <circle cx="80" cy="30" r="1" fill={c} opacity="0.1"/>
      <circle cx="320" cy="25" r="1.5" fill={c} opacity="0.08"/>
      <circle cx="360" cy="50" r="1" fill={c} opacity="0.06"/>
    </svg>
  ),
  // Novembre — vent / branches nues
  10: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 70 Q55 50 60 40 Q65 30 80 25" stroke={c} strokeWidth="1.2" opacity="0.12" fill="none" strokeLinecap="round"/>
      <path d="M65 38 Q75 35 85 30" stroke={c} strokeWidth="0.7" opacity="0.08" fill="none" strokeLinecap="round"/>
      <path d="M60 45 Q55 40 60 35" stroke={c} strokeWidth="0.7" opacity="0.08" fill="none" strokeLinecap="round"/>
      <path d="M280 70 Q285 48 295 38 Q305 28 320 22" stroke={c} strokeWidth="1" opacity="0.1" fill="none" strokeLinecap="round"/>
      <path d="M298 35 Q308 30 315 26" stroke={c} strokeWidth="0.6" opacity="0.07" fill="none" strokeLinecap="round"/>
      <path d="M140 50 Q180 45 220 50 Q260 55 300 48" stroke={c} strokeWidth="0.4" opacity="0.05" fill="none"/>
      <path d="M100 55 Q140 50 180 55 Q220 60 260 53" stroke={c} strokeWidth="0.3" opacity="0.04" fill="none"/>
    </svg>
  ),
  // Décembre — sapin
  11: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M200 10 L185 35 L190 35 L175 55 L182 55 L170 72 L230 72 L218 55 L225 55 L210 35 L215 35Z" fill={c} opacity="0.08"/>
      <rect x="196" y="72" width="8" height="6" rx="1" fill={c} opacity="0.1"/>
      <circle cx="193" cy="42" r="1.5" fill={c} opacity="0.15"/>
      <circle cx="205" cy="52" r="1.5" fill={c} opacity="0.12"/>
      <circle cx="198" cy="62" r="1.5" fill={c} opacity="0.15"/>
      <circle cx="80" cy="30" r="2" fill={c} opacity="0.08"/>
      <circle cx="330" cy="25" r="2.5" fill={c} opacity="0.06"/>
      <path d="M200 10 L200 5" stroke={c} strokeWidth="0.8" opacity="0.15" strokeLinecap="round"/>
      <path d="M197 5 L200 0 L203 5" stroke={c} strokeWidth="0.6" opacity="0.12" fill="none" strokeLinecap="round"/>
    </svg>
  ),
}

interface MonthBannerProps {
  month: number
  label: string
  year: number
}

export function MonthBanner({ month, label, year }: MonthBannerProps) {
  const color = 'hsl(24 72% 44%)'

  return (
    <div className="calendar-month-banner">
      <div className="calendar-month-banner-text">
        <span className="calendar-month-banner-label">{label}</span>
        <span className="calendar-month-banner-year">{year}</span>
      </div>
      <div className="calendar-month-banner-svg">
        {MONTH_SCENES[month]?.(color)}
      </div>
    </div>
  )
}
