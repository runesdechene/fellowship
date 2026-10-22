/**
 * QUOI     — le mode admin se lit dans l'adresse : tout ce qui commence par `/admin`.
 * POURQUOI — on y entre et on en sort par le sélecteur d'identité (Uriel, 16/10/2026) ; l'adresse
 *            suffit à la barre et au sélecteur pour savoir où l'on est, sans état à garder.
 */
// L'administration s'ouvre sur le tableau de l'équipe (maquette 2417:233, 22/10/2026).
export const ADMIN_HOME = '/admin/taches'

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}
