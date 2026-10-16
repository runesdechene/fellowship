/**
 * QUOI     — « Non classés » (`/admin/prospects/non-classes`) : les réponses reçues sur
 *            @equipe.flw.sh qu'on n'a rattachées à aucun prospect.
 * POURQUOI — rien ne se perd (spec messagerie, lot 3c) : chacune se range sous un prospect, en
 *            devient un nouveau, ou s'écarte (spam). Pas de maquette : la page reprend le style des
 *            fiches (validé par Uriel, 16/10/2026).
 */
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { formatDayMonthShort, formatTime } from '@/lib/dates'
import { splitQuoted } from '@/lib/quoted'
import { FileDialog } from './FileDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { dismissMessage, prospectFromMessage } from './prospect-writes'
import { useUnclassified, type Unclassified } from './useUnclassified'

export function UnclassifiedPage() {
  const { data, error, reload } = useUnclassified()
  const navigate = useNavigate()
  const [filing, setFiling] = useState<Unclassified | null>(null)
  const [dismissing, setDismissing] = useState<Unclassified | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setProblem(null)
    try {
      await action()
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'L’action n’a pas abouti.')
    } finally {
      setBusy(false)
    }
  }

  // Retrouve ou crée le prospect de l'expéditeur, y range tous ses messages, et ouvre sa page.
  const newProspect = (message: Unclassified) =>
    run(async () => {
      const id = await prospectFromMessage(message.id)
      void navigate(`/admin/prospects/${id}`)
    })

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
              <Button onClick={() => setFiling(message)} disabled={busy}>
                Ranger sous un prospect
              </Button>
              <Button variant="action" onClick={() => void newProspect(message)} disabled={busy}>
                Nouveau prospect
              </Button>
              <Button onClick={() => setDismissing(message)} disabled={busy}>
                Écarter
              </Button>
            </div>
          </article>
        )
      })}
      {dismissing && (
        <ConfirmDialog
          title="Écarter ce message ?"
          text={`Le message de ${dismissing.from_email} disparaît des Non classés. C’est définitif.`}
          confirmLabel="Écarter"
          busy={busy}
          problem={problem}
          onConfirm={() =>
            void run(async () => {
              await dismissMessage(dismissing.id)
              setDismissing(null)
              reload()
            })
          }
          onClose={() => setDismissing(null)}
        />
      )}
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
