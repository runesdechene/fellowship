/**
 * QUOI     — l'identité légale de l'éditeur et la liste des documents légaux.
 * POURQUOI — les cinq pages légales (pages/legal/) citent les mêmes faits : ils s'écrivent une fois.
 * ATTENTION — repris de la V1 à la bascule (lot 12). Changer un fait ici, c'est changer ce que
 *            Fellowship déclare : `lastUpdated` suit.
 */
export const LEGAL = {
  company: 'LAHOUSSAYE EI',
  rcs: '844 256 537 00011 RCS NICE',
  vat: 'FR04844256537',
  address: '421 Chemin du Baudaric, 06390 Contes, France',
  email: 'contact@runesdechene.com',
  brand: "FELLOWSHIP (marque déposée à l'INPI)",
  director: 'Uriel Lahoussaye',
  hosting: {
    name: 'Netlify, Inc.',
    address: '512 2nd Street, Suite 200, San Francisco, CA 94107, USA',
    privacy: 'https://www.netlify.com/privacy/',
  },
  database: {
    name: 'Supabase, Inc.',
    address: 'Delaware, USA — instance européenne hébergée à Francfort',
    privacy: 'https://supabase.com/privacy',
  },
  payment: {
    name: 'Stripe Payments Europe, Limited',
    address: '1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irlande',
    privacy: 'https://stripe.com/fr/privacy',
  },
  lastUpdated: '2026-05-28',
} as const

export const LEGAL_DOCS = [
  { slug: 'mentions-legales', label: 'Mentions légales' },
  { slug: 'confidentialite', label: 'Politique de confidentialité' },
  { slug: 'cgu', label: "Conditions d'utilisation (CGU)" },
  { slug: 'cgv', label: 'Conditions de vente (CGV)' },
  { slug: 'charte-communautaire', label: 'Charte communautaire' },
] as const
