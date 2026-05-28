// Headers CORS partagés par les edge functions appelées depuis le frontend.
// stripe-webhook n'en a pas besoin (POST signé par Stripe, jamais via XHR navigateur).
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
