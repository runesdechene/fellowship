/**
 * QUOI     — le bloc « Modèles » : les modèles en usage, groupés (premier contact, relance,
 *            bienvenue), avec leurs envois et leur taux de réponse.
 * POURQUOI — on voit quel premier contact marche le mieux (maquette 2356:2).
 */
import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminCard } from '@/components/ui/AdminCard'
import { percent, TEMPLATE_KINDS } from '@/lib/prospect'
import type { Template } from './useProspect'

export function TemplatesCard({ templates }: { templates: Template[] }) {
  const live = templates.filter((t) => !t.archived_at)
  return (
    <AdminCard title="Modèles" Icon={FileText} tone="ocre">
      {TEMPLATE_KINDS.map(({ value, label }) => {
        const group = live.filter((t) => t.kind === value)
        return (
          <section key={value} className="templates-group" aria-label={label}>
            <h3 className="templates-group__title">{label}</h3>
            {group.length === 0 ? (
              <p className="templates-empty">Aucun modèle.</p>
            ) : (
              <ul className="templates-list">
                {group.map((t) => (
                  <li key={t.id} className="templates-row">
                    <span className="templates-row__main">
                      <span className="templates-row__name">{t.name}</span>
                      <span className="templates-row__meta">{t.subject || '—'}</span>
                    </span>
                    <span className="templates-row__text">{t.envois} envois</span>
                    <span className="templates-row__text">
                      {percent(t.reponses, t.envois)} % de réponses
                    </span>
                    <Link to={`?modele=${t.id}`} className="sheet-link">
                      Modifier
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </AdminCard>
  )
}
