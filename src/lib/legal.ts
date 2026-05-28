export const LEGAL = {
  company: 'LAHOUSSAYE EI',
  rcs: '844 256 537 00011 RCS NICE',
  vat: 'FR04844256537',
  address: '421 Chemin du Baudaric, 06390 Contes, France',
  email: 'contact@runesdechene.com',
  brand: 'FELLOWSHIP (marque déposée à l\'INPI)',
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

export type LegalDoc = { slug: string; label: string; short: string }

export const LEGAL_DOCS: readonly LegalDoc[] = [
  { slug: 'mentions-legales',      label: 'Mentions légales',                    short: 'Mentions' },
  { slug: 'confidentialite',       label: 'Politique de confidentialité',        short: 'Confidentialité' },
  { slug: 'cgu',                   label: "Conditions d'utilisation (CGU)",      short: 'CGU' },
  { slug: 'cgv',                   label: 'Conditions de vente (CGV)',           short: 'CGV' },
  { slug: 'charte-communautaire',  label: 'Charte communautaire',                short: 'Charte' },
] as const

/** Renvoie les documents légaux autres que celui dont le slug est passé en paramètre.
 *  Si le slug ne correspond à rien, renvoie l'intégralité. */
export function getOtherLegalDocs(currentSlug: string): LegalDoc[] {
  return LEGAL_DOCS.filter(d => d.slug !== currentSlug)
}

/** Format français d'une date ISO (YYYY-MM-DD → 28 mai 2026). */
export function formatLegalDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
                  'août', 'septembre', 'octobre', 'novembre', 'décembre']
  return `${d} ${months[m - 1]} ${y}`
}
