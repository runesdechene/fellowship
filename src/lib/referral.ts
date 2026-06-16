// Fonctions pures du parrainage. La normalisation est partagée (capture ?r=, onboarding,
// et passée en base à l'RPC ensure_referral_code) : un seul endroit testé pour les accents.

/** Normalise un nom de marque en code de parrainage : MAJ, sans accents, alphanumérique, ≤20. */
export function normalizeReferralCode(input: string): string {
  return input
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents (Chêne → Chene)
    .toUpperCase().replace(/[^A-Z0-9]/g, '')
    .slice(0, 20)
}

/** Crédit « un mois » en centimes selon l'intervalle de facturation du parrain. */
export function monthlyCreditCents(unitAmount: number, interval: 'month' | 'year'): number {
  if (unitAmount <= 0) return 0
  return interval === 'year' ? Math.round(unitAmount / 12) : unitAmount
}

/** Badge Ambassadeur : entité ayant amené ≥1 filleul payant (permanent, posé par le webhook). */
export function isAmbassador(entity: { is_ambassador?: boolean | null } | null | undefined): boolean {
  return entity?.is_ambassador === true
}

/** Lien de parrainage partageable (digital). */
export function referralLink(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}/?r=${code}`
}
