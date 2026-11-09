/**
 * QUOI     — la facturation d'une enseigne : le SIREN (9 chiffres et sa clé), la fenêtre prête à
 *            enregistrer, et la phrase de la ligne « Facturation » des Réglages.
 * POURQUOI — chantier 3 (19/10/2026) : la V2 saisit la raison sociale et le SIREN comme la V1, pour
 *            des factures à son nom. Même règle que `apps/web/src/lib/siren.ts`.
 * ATTENTION — le SIREN est obligatoire pour s'abonner, sauf entreprise étrangère (Uriel, 09/11/2026) : la facture électronique
 *            de 2027 ne part pas sans lui. Le serveur le vérifie aussi (_shared/billing.ts).
 */

export interface BillingDraft {
  legalName: string
  siren: string
  /** Entreprise étrangère : pas de SIREN, son numéro de TVA est demandé au paiement. */
  abroad: boolean
}

export function sirenDigits(input: string): string {
  return input.replace(/\D/g, '')
}

/** 9 chiffres et la clé de Luhn : en partant de la droite, un chiffre sur deux est doublé. */
export function validSiren(input: string): boolean {
  const digits = sirenDigits(input)
  if (digits.length !== 9) return false
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let digit = Number(digits[8 - i])
    if (i % 2 === 1) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2
    sum += digit
  }
  return sum % 10 === 0
}

export function billingReady(draft: BillingDraft): boolean {
  return draft.legalName.trim() !== '' && (draft.abroad || validSiren(draft.siren))
}

/** « 552 100 554 » : le SIREN se lit par groupes de trois. */
function spaced(siren: string): string {
  return siren.replace(/(\d{3})(?=\d)/g, '$1 ')
}

export function billingNote(entity: {
  legal_name: string | null
  siren: string | null
  billing_no_siren: boolean | null
}): string {
  if (!entity.legal_name) return 'Ta raison sociale et ton SIREN, pour des factures à ton nom.'
  if (entity.siren) return `${entity.legal_name} · SIREN ${spaced(entity.siren)}`
  return entity.billing_no_siren ? `${entity.legal_name} · entreprise étrangère` : entity.legal_name
}
