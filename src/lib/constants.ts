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
