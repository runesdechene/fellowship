// Validation du SIREN (9 chiffres, clé de Luhn) + logique d'activation du formulaire
// de facturation. Pur, sans dépendance React — réutilisé par la modale Boutique et
// la carte Abonnement.

/** Normalise (retire tout non-chiffre) et valide un SIREN : 9 chiffres + clé de Luhn. */
export function validateSiren(input: string): { valid: boolean; normalized: string } {
  const normalized = (input ?? '').replace(/\D/g, '')
  if (normalized.length !== 9) return { valid: false, normalized }
  return { valid: luhnValid(normalized), normalized }
}

function luhnValid(digits: string): boolean {
  let sum = 0
  // Luhn : en partant de la droite, on double un chiffre sur deux (positions paires depuis la droite).
  for (let i = 0; i < digits.length; i++) {
    let d = digits.charCodeAt(digits.length - 1 - i) - 48
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

/** Le formulaire de facturation est prêt à soumettre.
 * `requireLegalName` : au checkout, la raison sociale est collectée par Stripe (pas chez nous),
 * donc on n'exige que le SIREN (ou la case « pas de SIREN »). À l'édition (Abonnement), on l'exige. */
export function billingFormReady(
  v: { legalName: string; siren: string; noSiren: boolean },
  opts?: { requireLegalName?: boolean },
): boolean {
  const requireLegalName = opts?.requireLegalName ?? true
  if (requireLegalName && v.legalName.trim().length === 0) return false
  if (v.noSiren) return true
  return validateSiren(v.siren).valid
}
