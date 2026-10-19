/**
 * QUOI     — `/legal/:doc` : le document légal demandé par son adresse.
 * POURQUOI — les adresses de la V1 (`/legal/cgu`, `/legal/cgv`…) restent les mêmes (lot 12) ; un
 *            document inconnu ramène aux mentions légales plutôt qu'à une page vide.
 */
import type { ReactElement } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { LegalCharter } from './LegalCharter'
import { LegalNotice } from './LegalNotice'
import { LegalPrivacy } from './LegalPrivacy'
import { LegalSales } from './LegalSales'
import { LegalTerms } from './LegalTerms'

const DOCUMENTS: Record<string, () => ReactElement> = {
  'mentions-legales': LegalNotice,
  confidentialite: LegalPrivacy,
  cgu: LegalTerms,
  cgv: LegalSales,
  'charte-communautaire': LegalCharter,
}

export function LegalRoute() {
  const { doc = '' } = useParams()
  const Document = DOCUMENTS[doc]
  if (!Document) return <Navigate to="/legal/mentions-legales" replace />
  return <Document />
}
