/**
 * QUOI     — lire la version publiée (`/version.json`, écrit au build) et dire si l'onglet tourne
 *            sur une version plus ancienne.
 * POURQUOI — lot 12 : un onglet resté ouvert, ou l'appli installée sur un téléphone, garde le
 *            code qu'il a chargé ; le bandeau « Recharger » le prévient d'une mise à jour.
 */

/** La version annoncée par le site, ou null si la réponse ne ressemble pas à une version. */
export function servedVersion(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('version' in body)) return null
  const { version } = body
  return typeof version === 'string' && version !== '' ? version : null
}

export function isOutdated(running: string, served: string | null): boolean {
  return served !== null && served !== running
}
