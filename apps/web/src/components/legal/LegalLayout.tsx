import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { LEGAL, getOtherLegalDocs, formatLegalDate } from '@/lib/legal'
import './LegalLayout.css'

interface Props {
  title: string
  slug: string
  children: React.ReactNode
}

export function LegalLayout({ title, slug, children }: Props) {
  const others = getOtherLegalDocs(slug)
  const { pathname } = useLocation()
  const backHref = pathname.startsWith('/legal') ? '/explorer' : '/'

  return (
    <div className="legal-page">
      <div className="legal-shell">
        <main className="legal-main">
          <Link to={backHref} className="legal-back">
            <ArrowLeft strokeWidth={1.8} /> Retour à Fellowship
          </Link>

          <header className="legal-head">
            <h1>{title}</h1>
            <p className="legal-updated">
              Dernière mise à jour : {formatLegalDate(LEGAL.lastUpdated)}
            </p>
          </header>

          <article className="legal-body">{children}</article>

          <footer className="legal-foot">
            <p>
              Pour toute question : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
            </p>
            <button type="button" className="legal-print" onClick={() => window.print()}>
              <Printer strokeWidth={1.8} /> Imprimer / sauvegarder en PDF
            </button>
          </footer>
        </main>

        <aside className="legal-aside" aria-label="Autres documents légaux">
          <div className="legal-aside-label">Autres documents</div>
          <nav>
            {others.map(d => (
              <Link key={d.slug} to={`/legal/${d.slug}`}>{d.label}</Link>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  )
}
