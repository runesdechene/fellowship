/**
 * QUOI     — la clé de comparaison d'un téléphone : ses chiffres, l'indicatif français ramené à 0.
 * POURQUOI — « 06 41 22 18 90 » et « +33 6 41 22 18 90 » sont le même numéro.
 * ATTENTION — la même règle vit en SQL (phone_key, migration 20261016140000) : les deux vont ensemble.
 */
export function phoneKey(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.startsWith('0033') && digits.length === 13) return `0${digits.slice(4)}`
  if (digits.startsWith('33') && digits.length === 11) return `0${digits.slice(2)}`
  return digits || null
}
