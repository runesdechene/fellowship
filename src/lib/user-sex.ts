// Normalisation du genre vers un label valide de l'enum Postgres `user_sex`.
// ⚠️ Les labels sont SANS ACCENT (`indefini`) — envoyer `indéfini` à Supabase
// fait un 400 (invalid input value for enum). Source de vérité : la colonne
// users.sex (enum user_sex = {homme, femme, indefini}).

export const USER_SEX_VALUES = ['homme', 'femme', 'indefini'] as const
export type UserSex = (typeof USER_SEX_VALUES)[number]

/** Ramène n'importe quelle entrée (legacy, accentuée, nulle) vers un label valide. */
export function normalizeSex(v: string | null | undefined): UserSex {
  return v === 'homme' || v === 'femme' ? v : 'indefini'
}
