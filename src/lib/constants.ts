// Primary tags — fixed by admin, not user-editable
export const PRIMARY_TAGS = [
  { value: 'geek', label: 'Geek' },
  { value: 'fete-medievale', label: 'Fête médiévale' },
  { value: 'festival-musique', label: 'Festival de musique' },
] as const

export type PrimaryTag = typeof PRIMARY_TAGS[number]['value']
