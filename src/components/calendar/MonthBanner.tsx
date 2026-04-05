import type { ReactNode } from 'react'

const MONTH_SCENES: Record<number, (color: string) => ReactNode> = {
  // Janvier — flocons
  0: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="25" r="4" fill={c} opacity="0.5"/>
      <circle cx="120" cy="15" r="3" fill={c} opacity="0.35"/>
      <circle cx="200" cy="35" r="5" fill={c} opacity="0.3"/>
      <circle cx="280" cy="20" r="3.5" fill={c} opacity="0.4"/>
      <circle cx="350" cy="30" r="4" fill={c} opacity="0.35"/>
      <path d="M50 25 L50 15 M50 25 L50 35 M50 25 L42 19 M50 25 L58 19 M50 25 L42 31 M50 25 L58 31" stroke={c} strokeWidth="1.2" opacity="0.35"/>
      <path d="M200 35 L200 23 M200 35 L200 47 M200 35 L190 28 M200 35 L210 28 M200 35 L190 42 M200 35 L210 42" stroke={c} strokeWidth="1.2" opacity="0.25"/>
      <path d="M340 45 L340 37 M340 45 L340 53 M340 45 L334 40 M340 45 L346 40 M340 45 L334 50 M340 45 L346 50" stroke={c} strokeWidth="1.2" opacity="0.3"/>
      <path d="M0 65 Q100 50 200 60 Q300 70 400 55" stroke={c} strokeWidth="1" opacity="0.12" fill="none"/>
    </svg>
  ),
  // Février — cœurs
  1: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M80 35 C80 28 90 22 95 30 C100 22 110 28 110 35 C110 45 95 55 95 55 C95 55 80 45 80 35Z" fill={c} opacity="0.25"/>
      <path d="M220 25 C220 20 227 16 230 22 C233 16 240 20 240 25 C240 32 230 38 230 38 C230 38 220 32 220 25Z" fill={c} opacity="0.18"/>
      <path d="M330 40 C330 35 335 32 337 36 C339 32 344 35 344 40 C344 45 337 49 337 49 C337 49 330 45 330 40Z" fill={c} opacity="0.3"/>
      <circle cx="160" cy="45" r="2" fill={c} opacity="0.2"/>
      <circle cx="380" cy="25" r="1.5" fill={c} opacity="0.2"/>
      <path d="M40 20 C40 17 43 15 45 18 C47 15 50 17 50 20 C50 24 45 27 45 27 C45 27 40 24 40 20Z" fill={c} opacity="0.15"/>
    </svg>
  ),
  // Mars — pousses / bourgeons
  2: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 70 L60 42 M54 48 Q60 36 66 48" stroke={c} strokeWidth="1.5" opacity="0.35" strokeLinecap="round"/>
      <path d="M150 70 L150 46 M145 52 Q150 42 155 52" stroke={c} strokeWidth="1.5" opacity="0.3" strokeLinecap="round"/>
      <path d="M250 70 L250 38 M244 45 Q250 34 256 45 M242 53 Q250 42 258 53" stroke={c} strokeWidth="1.5" opacity="0.32" strokeLinecap="round"/>
      <path d="M340 70 L340 48 M335 54 Q340 44 345 54" stroke={c} strokeWidth="1.5" opacity="0.25" strokeLinecap="round"/>
      <path d="M0 72 Q100 66 200 70 Q300 72 400 67" stroke={c} strokeWidth="0.8" opacity="0.12" fill="none"/>
    </svg>
  ),
  // Avril — fleurs de cerisier
  3: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="30" r="8" fill={c} opacity="0.15"/>
      <circle cx="70" cy="30" r="4" fill={c} opacity="0.25"/>
      <circle cx="180" cy="20" r="10" fill={c} opacity="0.12"/>
      <circle cx="180" cy="20" r="5" fill={c} opacity="0.2"/>
      <circle cx="300" cy="35" r="7" fill={c} opacity="0.15"/>
      <circle cx="300" cy="35" r="3.5" fill={c} opacity="0.25"/>
      <circle cx="130" cy="50" r="5" fill={c} opacity="0.12"/>
      <circle cx="360" cy="18" r="4" fill={c} opacity="0.15"/>
      <path d="M70 38 L70 70" stroke={c} strokeWidth="1" opacity="0.18"/>
      <path d="M180 30 L175 70" stroke={c} strokeWidth="1" opacity="0.15"/>
      <path d="M300 42 L300 70" stroke={c} strokeWidth="1" opacity="0.18"/>
    </svg>
  ),
  // Mai — roses / fleurs ouvertes
  4: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="90" cy="30" r="10" fill={c} opacity="0.1"/>
      <path d="M90 20 L90 15 M80 30 L75 30 M100 30 L105 30 M90 40 L90 45 M82 22 L78 18 M98 22 L102 18 M82 38 L78 42 M98 38 L102 42" stroke={c} strokeWidth="1.2" opacity="0.3"/>
      <circle cx="90" cy="30" r="4" fill={c} opacity="0.3"/>
      <circle cx="260" cy="25" r="8" fill={c} opacity="0.08"/>
      <path d="M260 17 L260 13 M252 25 L248 25 M268 25 L272 25 M260 33 L260 37" stroke={c} strokeWidth="1" opacity="0.25"/>
      <circle cx="260" cy="25" r="3.5" fill={c} opacity="0.25"/>
      <path d="M90 40 L90 70 M260 33 L260 70" stroke={c} strokeWidth="1" opacity="0.15"/>
      <path d="M170 50 Q173 42 178 47 Q183 42 186 50" stroke={c} strokeWidth="1.2" opacity="0.2" fill="none"/>
      <path d="M350 35 Q353 27 358 32 Q363 27 366 35" stroke={c} strokeWidth="1.2" opacity="0.2" fill="none"/>
    </svg>
  ),
  // Juin — soleil
  5: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="320" cy="28" r="18" fill={c} opacity="0.12"/>
      <circle cx="320" cy="28" r="10" fill={c} opacity="0.18"/>
      <path d="M320 4 L320 0 M320 52 L320 56 M296 28 L292 28 M344 28 L348 28 M304 12 L300 8 M336 12 L340 8 M304 44 L300 48 M336 44 L340 48" stroke={c} strokeWidth="1.5" opacity="0.22" strokeLinecap="round"/>
      <path d="M0 65 Q50 58 100 62 Q200 55 300 58 Q350 60 400 56" stroke={c} strokeWidth="0.8" opacity="0.1" fill="none"/>
    </svg>
  ),
  // Juillet — vagues / plage
  6: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 45 Q50 32 100 45 Q150 58 200 45 Q250 32 300 45 Q350 58 400 45" stroke={c} strokeWidth="2" opacity="0.2" fill="none"/>
      <path d="M0 55 Q50 43 100 55 Q150 67 200 55 Q250 43 300 55 Q350 67 400 55" stroke={c} strokeWidth="1.5" opacity="0.15" fill="none"/>
      <path d="M0 64 Q50 53 100 64 Q150 74 200 64 Q250 53 300 64 Q350 74 400 64" stroke={c} strokeWidth="1" opacity="0.1" fill="none"/>
      <circle cx="340" cy="18" r="12" fill={c} opacity="0.1"/>
      <circle cx="340" cy="18" r="6" fill={c} opacity="0.15"/>
    </svg>
  ),
  // Août — lune / étoiles
  7: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M310 38 A14 14 0 1 1 310 14 A10 10 0 1 0 310 38Z" fill={c} opacity="0.2"/>
      <circle cx="80" cy="20" r="2" fill={c} opacity="0.3"/>
      <circle cx="150" cy="38" r="1.5" fill={c} opacity="0.25"/>
      <circle cx="220" cy="15" r="1.8" fill={c} opacity="0.2"/>
      <circle cx="370" cy="28" r="1.5" fill={c} opacity="0.25"/>
      <circle cx="40" cy="48" r="1.2" fill={c} opacity="0.2"/>
      <path d="M80 20 L80 16 M80 20 L80 24 M76 20 L84 20" stroke={c} strokeWidth="0.8" opacity="0.25"/>
      <path d="M220 15 L220 11 M220 15 L220 19 M216 15 L224 15" stroke={c} strokeWidth="0.8" opacity="0.2"/>
      <circle cx="260" cy="50" r="1" fill={c} opacity="0.18"/>
    </svg>
  ),
  // Septembre — feuilles qui tombent
  8: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M70 20 Q82 14 88 26 Q82 32 70 20Z" fill={c} opacity="0.25" transform="rotate(30 79 23)"/>
      <path d="M180 32 Q192 26 198 38 Q192 44 180 32Z" fill={c} opacity="0.18" transform="rotate(-15 189 35)"/>
      <path d="M290 15 Q302 9 308 21 Q302 27 290 15Z" fill={c} opacity="0.22" transform="rotate(45 299 18)"/>
      <path d="M350 42 Q360 37 365 47 Q360 52 350 42Z" fill={c} opacity="0.2" transform="rotate(10 357 44)"/>
      <path d="M130 52 Q138 47 142 55 Q138 59 130 52Z" fill={c} opacity="0.15" transform="rotate(-20 136 53)"/>
      <path d="M70 24 C76 34 88 50 82 65" stroke={c} strokeWidth="0.7" opacity="0.12" fill="none"/>
      <path d="M290 19 C296 32 286 48 292 62" stroke={c} strokeWidth="0.7" opacity="0.12" fill="none"/>
    </svg>
  ),
  // Octobre — citrouille
  9: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="320" cy="45" rx="22" ry="18" fill={c} opacity="0.15"/>
      <ellipse cx="308" cy="45" rx="15" ry="17" fill={c} opacity="0.1"/>
      <ellipse cx="332" cy="45" rx="15" ry="17" fill={c} opacity="0.1"/>
      <path d="M320 27 Q320 16 326 18" stroke={c} strokeWidth="1.5" opacity="0.25" fill="none" strokeLinecap="round"/>
      <path d="M316 30 Q311 24 318 26" stroke={c} strokeWidth="1" opacity="0.18" fill="none"/>
      <circle cx="80" cy="30" r="1.5" fill={c} opacity="0.18"/>
      <circle cx="180" cy="50" r="1" fill={c} opacity="0.15"/>
      <path d="M100 55 Q108 50 112 57 Q108 62 100 55Z" fill={c} opacity="0.1" transform="rotate(15 106 56)"/>
    </svg>
  ),
  // Novembre — vent / branches nues
  10: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 70 Q56 46 62 36 Q68 26 85 20" stroke={c} strokeWidth="2" opacity="0.22" fill="none" strokeLinecap="round"/>
      <path d="M68 34 Q80 30 90 24" stroke={c} strokeWidth="1.2" opacity="0.16" fill="none" strokeLinecap="round"/>
      <path d="M62 42 Q56 36 62 30" stroke={c} strokeWidth="1.2" opacity="0.16" fill="none" strokeLinecap="round"/>
      <path d="M290 70 Q296 44 306 34 Q316 24 335 18" stroke={c} strokeWidth="1.8" opacity="0.2" fill="none" strokeLinecap="round"/>
      <path d="M310 30 Q320 25 328 20" stroke={c} strokeWidth="1" opacity="0.14" fill="none" strokeLinecap="round"/>
      <path d="M140 48 Q190 42 240 48 Q290 54 340 45" stroke={c} strokeWidth="0.7" opacity="0.1" fill="none"/>
      <path d="M100 54 Q150 48 200 54 Q250 60 300 52" stroke={c} strokeWidth="0.5" opacity="0.08" fill="none"/>
    </svg>
  ),
  // Décembre — sapin
  11: (c) => (
    <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M320 8 L302 35 L308 35 L290 55 L298 55 L282 74 L358 74 L342 55 L350 55 L332 35 L338 35Z" fill={c} opacity="0.15"/>
      <rect x="315" y="74" width="10" height="6" rx="1" fill={c} opacity="0.2"/>
      <circle cx="312" cy="42" r="2" fill={c} opacity="0.3"/>
      <circle cx="326" cy="52" r="2" fill={c} opacity="0.25"/>
      <circle cx="318" cy="62" r="2" fill={c} opacity="0.3"/>
      <circle cx="80" cy="30" r="2.5" fill={c} opacity="0.15"/>
      <circle cx="160" cy="50" r="2" fill={c} opacity="0.12"/>
      <path d="M320 8 L320 2" stroke={c} strokeWidth="1.2" opacity="0.3" strokeLinecap="round"/>
      <path d="M316 2 L320 -4 L324 2" stroke={c} strokeWidth="1" opacity="0.25" fill="none" strokeLinecap="round"/>
    </svg>
  ),
}

interface MonthBannerProps {
  month: number
  label: string
  year: number
}

export function MonthBanner({ month, label, year }: MonthBannerProps) {
  const color = 'rgba(61, 48, 40, 0.45)'

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
