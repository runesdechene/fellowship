// Client Stripe partagé. Lazy-init pour permettre un import sans crash si la var
// n'est pas posée (utile en local pour des tests unitaires de signature).
import Stripe from 'npm:stripe@18.0.0'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) throw new Error('STRIPE_SECRET_KEY env var is required')
  _stripe = new Stripe(key, {
    apiVersion: '2024-12-18.acacia',
    httpClient: Stripe.createFetchHttpClient(), // Deno-friendly
  })
  return _stripe
}
