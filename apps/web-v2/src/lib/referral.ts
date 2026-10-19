/**
 * QUOI     — le parrainage côté parrain et côté arrivée : la base d'un code tirée du nom de
 *            l'enseigne, le lien à partager, la phrase des filleuls, et la capture de `?r=`.
 * POURQUOI — chantier 3 (19/10/2026) : « offre un mois, gagne un mois » revient dans la V2. Le code
 *            se crée et se compte en base (ensure_referral_code, get_referral_overview).
 * ATTENTION — le lien pointe la racine (`flw.sh/?r=`) : la V1 le capte aujourd'hui, la V2 après la
 *            bascule. Les deux gardent le code dans la même clé, lue par l'arrivée (/bienvenue).
 */

export const REFERRAL_KEY = 'flwsh.referralCode'

/** « Runes de Chêne » → « RUNESDECHENE » : majuscules sans accents, lettres et chiffres, 20 au plus. */
export function referralBase(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 20)
}

export function referralLink(origin: string, code: string): string {
  return `${origin}/?r=${code}`
}

function months(count: number): string {
  return count === 1 ? '1 mois gagné' : `${String(count)} mois gagnés`
}

/** Un filleul rapporte un mois quand il paie sa première facture ; avant, il est « en attente ». */
export function referralStats(rewarded: number, pending: number): string {
  const paid =
    rewarded === 0
      ? 'Aucun filleul payant pour l’instant'
      : `${String(rewarded)} filleul${rewarded > 1 ? 's' : ''} payant${rewarded > 1 ? 's' : ''} · ${months(rewarded)}`
  return pending === 0 ? paid : `${paid} · ${String(pending)} en attente de leur première facture`
}

/** Garde le code d'une adresse d'arrivée (`?r=`) jusqu'à l'inscription, qui passe par la connexion. */
export function captureReferral(search: string): void {
  const code = referralBase(new URLSearchParams(search).get('r') ?? '')
  if (code.length < 3) return
  try {
    localStorage.setItem(REFERRAL_KEY, code)
  } catch {
    /* stockage indisponible : le code se tape à la main à l'arrivée */
  }
}
