/**
 * QUOI     — une rangée clé/valeur de la fiche : libellé discret à gauche, valeur à droite.
 * POURQUOI — l'abonnement et les informations se lisent pareil (maquette 2342:2).
 */
import type { ReactNode } from 'react'

export function SheetRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sheet-row">
      <dt className="sheet-row__label">{label}</dt>
      <dd className="sheet-row__value">{children}</dd>
    </div>
  )
}
