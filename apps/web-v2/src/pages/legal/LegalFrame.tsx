/**
 * QUOI     — le cadre d'une page légale : la marque, le titre, la date, le texte, puis les autres
 *            documents.
 * POURQUOI — lot 12 : les pages légales de la V1 passent dans la V2, lisibles sans compte. Pas de
 *            maquette : une colonne de lecture, avec les briques de l'app.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Wordmark } from '@/components/ui/Wordmark'
import { formatFullDate, parseSqlDate } from '@/lib/dates'
import { LEGAL, LEGAL_DOCS } from '@/lib/legal'

interface LegalFrameProps {
  title: string
  slug: string
  children: ReactNode
}

export function LegalFrame({ title, slug, children }: LegalFrameProps) {
  return (
    <main className="legal">
      <div className="legal__column">
        <Link to="/" aria-label="Fellowship">
          <Wordmark />
        </Link>
        <header className="legal__head">
          <h1 className="legal__title">{title}</h1>
          <p className="legal__updated">
            Dernière mise à jour : {formatFullDate(parseSqlDate(LEGAL.lastUpdated))}
          </p>
        </header>
        <article className="legal__body">{children}</article>
        <nav className="legal__others" aria-label="Autres documents légaux">
          {LEGAL_DOCS.filter((doc) => doc.slug !== slug).map((doc) => (
            <Link key={doc.slug} to={`/legal/${doc.slug}`}>
              {doc.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  )
}
