// Synchro des infos de facturation client vers le Customer Stripe :
// - name = raison sociale (s'imprime sur la facture)
// - invoice_settings.custom_fields = SIREN (s'imprime sur chaque facture)
// - metadata.siren pour la traçabilité
// Stripe ne supporte pas de tax ID FR SIREN ; on passe donc par un champ personnalisé.
import type Stripe from 'npm:stripe@18.0.0'

export async function syncCustomerBilling(
  stripe: Stripe,
  customerId: string,
  b: { legalName: string; siren: string | null; noSiren: boolean },
): Promise<void> {
  await stripe.customers.update(customerId, {
    name: b.legalName,
    invoice_settings: {
      custom_fields: b.siren ? [{ name: 'SIREN', value: b.siren }] : null,
    },
    metadata: { siren: b.siren ?? '' },
  })
}
