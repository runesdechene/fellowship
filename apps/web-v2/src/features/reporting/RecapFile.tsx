/**
 * QUOI     — l'aperçu d'une pièce jointe du récap : le CSV en tableau, tel quel, et son téléchargement.
 * POURQUOI — voir ce que reçoit l'expert-comptable sans rien télécharger (Uriel, 10/11/2026). Le
 *            tableau reprend celui des journées ; il défile en largeur, la page reste fixe.
 */
import Papa from 'papaparse'
import { SettingSection } from '@/features/settings/SettingRow'

export function RecapFile({ name, csv }: { name: string; csv: string }) {
  const [head = [], ...rows] = Papa.parse<string[]>(csv, { skipEmptyLines: true }).data
  return (
    <SettingSection title={name} note={`${rows.length} lignes, sous l’en-tête.`}>
      <div className="reporting-recap__table">
        <table className="reporting-days">
          <thead>
            <tr>
              {head.map((cell) => (
                <th key={cell} scope="col">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              // Une ligne n'a pas d'identifiant : sa place dans le fichier, qui ne bouge pas, en tient lieu.
              <tr key={index}>
                {row.map((cell, column) => (
                  <td key={column}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <a
        className="reporting-recap__download"
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
        download={name}
      >
        Télécharger
      </a>
    </SettingSection>
  )
}
