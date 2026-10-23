/**
 * QUOI     — le fil d'Ariane au-dessus du titre d'une fiche vue sans compte :
 *            Festivals › univers principal › région › le festival.
 * POURQUOI — décision du 23/10/2026 (maquette 2482:878) : situer la fiche pour le visiteur et
 *            pour Google ; la région, pas le département, parce que c'est ce qu'on cherche.
 * ATTENTION — sans liens tant que les pages univers × région n'existent pas. Un maillon absent
 *            (fiche sans univers, département illisible) est sauté.
 */
import { ChevronRight } from 'lucide-react'
import { regionOf } from '@/lib/regions'

interface BreadcrumbProps {
  name: string
  /** Le nom du premier univers de la fiche, déjà traduit de son slug. */
  universe: string | null
  department: string | null
}

export function Breadcrumb({ name, universe, department }: BreadcrumbProps) {
  const trail = ['Festivals', universe, regionOf(department)].filter((step): step is string =>
    Boolean(step),
  )

  return (
    <nav className="breadcrumb" aria-label="Fil d’Ariane">
      <ol>
        {trail.map((step) => (
          <li key={step}>
            {step}
            <ChevronRight size={12} strokeWidth={2} aria-hidden />
          </li>
        ))}
        <li aria-current="page">{name}</li>
      </ol>
    </nav>
  )
}
