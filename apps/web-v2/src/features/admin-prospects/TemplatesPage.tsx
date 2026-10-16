/**
 * QUOI     — « Modèles et expéditeurs » (`/admin/prospects/modeles`) : les adresses d'envoi, les
 *            modèles, et l'éditeur du modèle choisi (maquette 2356:2).
 * POURQUOI — ce qui part au nom de chacun se règle ici ; le modèle édité est dans l'adresse
 *            (`?modele=<id>` ou `?modele=nouveau`).
 */
import { ChevronLeft, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { SenderDialog } from './SenderDialog'
import { SendersCard } from './SendersCard'
import { TemplateEditor } from './TemplateEditor'
import { TemplatesCard } from './TemplatesCard'
import type { Sender } from './useProspect'
import { useTemplates } from './useTemplates'

export function TemplatesPage() {
  const { data, error, reload } = useTemplates()
  const [search, setSearch] = useSearchParams()
  const [sender, setSender] = useState<Sender | 'nouveau' | null>(null)
  const wanted = search.get('modele')
  const editing = data?.templates.find((t) => t.id === wanted) ?? null

  function closeEditor() {
    setSearch(new URLSearchParams())
    reload()
  }

  return (
    <div className="admin-page">
      <Link to="/admin/prospects" className="sheet__back">
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
        Prospects
      </Link>
      <header className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Modèles et expéditeurs</h1>
          <p className="admin-page__lede">
            Les adresses d’où part la prospection, et les e-mails qu’on y écrit.
          </p>
        </div>
        <div className="prospect-actions">
          <Button onClick={() => setSender('nouveau')}>Ajouter un expéditeur</Button>
          <Button variant="action" onClick={() => setSearch(new URLSearchParams('modele=nouveau'))}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Nouveau modèle
          </Button>
        </div>
      </header>
      {error && <p className="admin-page__error">{error}</p>}
      {data && (
        <div className="sheet__columns">
          <div className="sheet__column">
            <SendersCard senders={data.senders} onEdit={setSender} />
            <TemplatesCard templates={data.templates} />
          </div>
          <div className="sheet__column sheet__column--side">
            {(editing || wanted === 'nouveau') && (
              <TemplateEditor key={wanted} template={editing} onDone={closeEditor} />
            )}
          </div>
        </div>
      )}
      {sender && data && (
        <SenderDialog
          sender={sender === 'nouveau' ? null : sender}
          admins={data.admins}
          senders={data.senders}
          onClose={() => setSender(null)}
          onDone={() => {
            setSender(null)
            reload()
          }}
        />
      )}
    </div>
  )
}
