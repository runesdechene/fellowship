// Synchro des infos de facturation client vers le Customer Stripe :
// - name = raison sociale (s'imprime sur la facture)
// - invoice_settings.custom_fields = SIREN (s'imprime sur chaque facture)
// - metadata.siren pour la traçabilité
// Stripe ne supporte pas de tax ID FR SIREN ; on passe donc par un champ personnalisé.
import type Stripe from 'npm:stripe@18.0.0'

/** 9 chiffres et la clé de Luhn : même règle que apps/web-v2/src/lib/billing.ts. */
export function validSiren(siren: string): boolean {
  if (!/^\d{9}$/.test(siren)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let digit = Number(siren[8 - i])
    if (i % 2 === 1) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2
    sum += digit
  }
  return sum % 10 === 0
}

export async function syncCustomerBilling(
  stripe: Stripe,
  customerId: string,
  b: { legalName: string; siren: string | null },
): Promise<void> {
  await stripe.customers.update(customerId, {
    name: b.legalName,
    invoice_settings: {
      custom_fields: b.siren ? [{ name: 'SIREN', value: b.siren }] : null,
    },
    metadata: { siren: b.siren ?? '' },
  })
}
