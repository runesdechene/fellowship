/**
 * QUOI     — le dossier PDF qui se remplit tout seul : le nom d'un vrai festival à venir, et les
 *            champs que l'assistant y reporte depuis Fellowship ; la signature reste vide.
 * POURQUOI — maquette 2290:2 (nœuds 2310:6 et 2310:41) : le cas où le festival envoie un PDF. La
 *            fonction la plus demandée (vault, 14/10/2026), à venir en Pro.
 * ATTENTION — les champs sont ceux de l'exposant de démonstration (lib/landing-demo.ts).
 */
import type { ShowEvent } from '@/lib/landing'
import { DEMO } from '@/lib/landing-demo'

export function PdfSheet({ event }: { event: ShowEvent }) {
  return (
    <figure className="landing-pdf">
      <figcaption className="landing-caption">Le festival envoie un PDF</figcaption>
      <div className="landing-pdf__sheet">
        <span className="landing-pdf__done">
          <i aria-hidden />
          {DEMO.pdfFields.length} champs remplis par ton assistant
        </span>
        <p className="landing-pdf__kicker">
          {event.name} {event.startDate.getFullYear()}
        </p>
        <p className="landing-pdf__title">Dossier de candidature exposant</p>
        {DEMO.pdfFields.map(([label, value]) => (
          <div key={label} className="landing-pdf__field">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
        <div className="landing-pdf__field landing-pdf__field--empty">
          <span>Signature</span>
          <strong>—</strong>
        </div>
      </div>
    </figure>
  )
}
