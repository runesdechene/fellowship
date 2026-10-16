/**
 * QUOI     — « Non classés » (`/admin/prospects/non-classes`) : les réponses reçues sur
 *            @equipe.flw.sh qu'on n'a rattachées à aucun prospect.
 * POURQUOI — rien ne se perd (spec messagerie, lot 3c) : chacune se range sous un prospect, ou en
 *            devient un nouveau. Pas de maquette : la page reprend le style des fiches (validé par
 *            Uriel, 16/10/2026).
 */
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { formatDayMonthShort, formatTime } from '@/lib/dates'
import { splitQuoted } from '@/lib/quoted'
import { FileDialog } from './FileDialog'
import { createProspect, fileMessage } from './prospect-writes'
import { useUnclassified, type Unclassified } from './useUnclassified'

export function UnclassifiedPage() {
  const { data, error, reload } = useUnclassified()
  const navigate = useNavigate()
  const [filing, setFiling] = useState<Unclassified | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  async function newProspect(message: Unclassified) {
    setProblem(null)
    try {
      const id = await createProspect({ email: message.from_email })
      await fileMessage(message.id, id)
      void navigate(`/admin/prospects/${id}`)
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'Le prospect n’a pas été créé.')
    }
  }

  return (
    <div className="admin-page">
      <Link to="/admin/prospects" className="sheet__back">
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
        Prospects
      </Link>
      <header className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Non classés</h1>
          <p className="admin-page__lede">
            Les réponses reçues qu’on n’a pas su rattacher à un prospect.
          </p>
        </div>
      </header>
      {(error ?? problem) && <p className="admin-page__error">{error ?? problem}</p>}
      {data?.length === 0 && (
        <p className="admin-page__lede">Aucune réponse en attente de rangement.</p>
      )}
      {data?.map((message) => {
        const { main, quoted } = splitQuoted(message.body_text)
        const date = new Date(message.received_at)
        return (
          <article key={message.id} className="unclassified">
            <p className="prospect-thread__meta">
              {message.from_email} → {message.to_email} · {formatDayMonthShort(date)},{' '}
              {formatTime(date)}
            </p>
            {message.subject && <p className="prospect-thread__subject">{message.subject}</p>}
            <p className="prospect-thread__body">{main || message.body_text}</p>
            {quoted && main && (
              <details className="prospect-thread__quoted">
                <summary>Voir le message cité</summary>
                <p className="prospect-thread__body">{quoted}</p>
              </details>
            )}
            <div className="unclassified__actions">
              <Button onClick={() => setFiling(message)}>Ranger sous un prospect</Button>
              <Button variant="action" onClick={() => void newProspect(message)}>
                Nouveau prospect
              </Button>
            </div>
          </article>
        )
      })}
      {filing && (
        <FileDialog
          messageId={filing.id}
          sender={filing.from_email}
          onClose={() => setFiling(null)}
          onFiled={(prospectId) => {
            setFiling(null)
            reload()
            void navigate(`/admin/prospects/${prospectId}`)
          }}
        />
      )}
    </div>
  )
}
