/**
 * QUOI     — le texte d'un fichier CSV : UTF-8 s'il est valide, sinon Windows-1252.
 * POURQUOI — Excel français enregistre « CSV (séparateur : point-virgule) » en Windows-1252 : lu
 *            comme de l'UTF-8, « Téléphone » devenait « T�l�phone » et la colonne disparaissait.
 */
export function decodeCsv(bytes: ArrayBuffer): string {
  try {
    // Le décodeur UTF-8 retire de lui-même la marque d'ordre d'octets qu'ajoute Excel.
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}
