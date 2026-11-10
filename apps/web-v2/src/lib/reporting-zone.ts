/**
 * QUOI     — la zone Reporting se lit dans l'adresse : tout ce qui commence par `/reporting`.
 * POURQUOI — une zone à part, comme l'administration (Uriel, 09/11/2026) : on y entre par le
 *            sélecteur d'identité, et l'adresse suffit à la barre pour savoir où l'on est.
 */
export const REPORTING_HOME = '/reporting'
export const REPORTING_RECAP = '/reporting/recap'
export const REPORTING_SETTINGS = '/reporting/reglages'

export function isReportingPath(pathname: string): boolean {
  return pathname === REPORTING_HOME || pathname.startsWith(`${REPORTING_HOME}/`)
}
