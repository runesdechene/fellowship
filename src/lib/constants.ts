// Primary tags — fixed by admin, not user-editable
export const PRIMARY_TAGS = [
  { value: 'fete-medievale', label: 'Médiéval' },
  { value: 'fantastique', label: 'Fantastique' },
  { value: 'geek', label: 'Geek' },
  { value: 'festival-musique', label: 'Musique' },
  { value: 'foire', label: 'Foire' },
  { value: 'marche', label: 'Marché' },
  { value: 'salon', label: 'Salon' },
  { value: 'litteraire', label: 'Littéraire' },
  { value: 'historique', label: 'Historique' },
] as const

export type PrimaryTag = typeof PRIMARY_TAGS[number]['value']

// Tag colors — pastel system
export const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  'médiéval': { bg: 'hsl(24 72% 44% / 0.1)', color: 'hsl(24 72% 50%)' },
  'fete-medievale': { bg: 'hsl(24 72% 44% / 0.1)', color: 'hsl(24 72% 50%)' },
  'fantastique': { bg: 'hsl(280 50% 55% / 0.1)', color: 'hsl(280 50% 55%)' },
  'geek': { bg: 'hsl(220 70% 50% / 0.1)', color: 'hsl(220 70% 50%)' },
  'marché': { bg: 'hsl(152 32% 40% / 0.1)', color: 'hsl(152 32% 45%)' },
  'marche': { bg: 'hsl(152 32% 40% / 0.1)', color: 'hsl(152 32% 45%)' },
  'salon': { bg: 'hsl(200 50% 45% / 0.1)', color: 'hsl(200 50% 45%)' },
  'foire': { bg: 'hsl(40 80% 50% / 0.1)', color: 'hsl(40 70% 40%)' },
  'musique': { bg: 'hsl(340 60% 55% / 0.1)', color: 'hsl(340 55% 50%)' },
  'festival-musique': { bg: 'hsl(340 60% 55% / 0.1)', color: 'hsl(340 55% 50%)' },
  'littéraire': { bg: 'hsl(190 60% 45% / 0.1)', color: 'hsl(190 60% 40%)' },
  'litteraire': { bg: 'hsl(190 60% 45% / 0.1)', color: 'hsl(190 60% 40%)' },
  'historique': { bg: 'hsl(10 70% 50% / 0.1)', color: 'hsl(10 70% 45%)' },
}

export function getTagColor(tag: string): { bg: string; color: string } {
  if (TAG_COLORS[tag]) return TAG_COLORS[tag]
  const key = Object.keys(TAG_COLORS).find(k => tag.toLowerCase().includes(k))
  return key ? TAG_COLORS[key] : { bg: 'rgba(61,48,40,0.06)', color: 'rgba(61,48,40,0.45)' }
}
