/**
 * QUOI     — l'administration des Nouveautés : écrire une mise à jour à gauche, les publiées à
 *            droite (cœurs, commentaires, e-mail envoyé), Modifier et Supprimer.
 * POURQUOI — maquette 2373:65 : on annonce aux exposants ce qui change, et on voit ce qu'ils en
 *            disent (Uriel, 19/10/2026).
 */
import { Heart, Mail, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDayMonthShort } from '@/lib/dates'
import { UpdateForm } from './UpdateForm'
import { deleteUpdate, useAdminUpdates, type PublishedUpdate } from './useAdminUpdates'

export function UpdatesAdminPage() {
  const { updates, audience, error, reload } = useAdminUpdates()
  const [editing, setEditing] = useState<PublishedUpdate | null>(null)
  // Change à chaque note publiée ou corrigée : le formulaire repart vide.
  const [formKey, setFormKey] = useState(0)
  const [doomed, setDoomed] = useState<PublishedUpdate | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  function startNew() {
    setEditing(null)
    setFormKey((k) => k + 1)
  }

  async function remove(update: PublishedUpdate) {
    setBusy(true)
    setProblem(null)
    try {
      await deleteUpdate(update.id)
      setDoomed(null)
      if (editing?.id === update.id) startNew()
      reload()
    } catch (failure) {
      setProblem(failure instanceof Error ? failure.message : 'La suppression n’a pas abouti.')
    }
    setBusy(false)
  }

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Mises à jour</h1>
          <p className="admin-page__lede">
            Ce qu’on annonce aux exposants, et ce qu’ils en disent.
          </p>
        </div>
        <Button variant="action" onClick={startNew}>
          Écrire une mise à jour
        </Button>
      </header>
      {error && <p className="admin-page__error">{error}</p>}
      <div className="admin-updates">
        <UpdateForm
          key={editing ? editing.id : `nouvelle-${String(formKey)}`}
          editing={editing}
          audience={audience}
          onDone={() => {
            startNew()
            reload()
          }}
        />
        <section className="admin-updates__list">
          <h2 className="admin-update-form__title">Publiées</h2>
          {updates?.length === 0 && (
            <p className="admin-page__lede">Rien de publié pour l’instant.</p>
          )}
          {updates?.map((update) => (
            <article key={update.id} className="admin-updates__item">
              <p className="update-card__meta">
                <span
                  className={
                    update.weight === 'big'
                      ? 'admin-updates__weight admin-updates__weight--big'
                      : 'admin-updates__weight'
                  }
                >
                  {update.weight === 'big' ? 'Grosse' : 'Petite'}
                </span>
                <span>
                  {update.version} · {formatDayMonthShort(new Date(update.publishedAt))}
                </span>
              </p>
              <h3 className="admin-updates__title">{update.title}</h3>
              <p className="admin-updates__stats">
                <span>
                  <Heart size={13} strokeWidth={1.9} />
                  {update.hearts}
                </span>
                <span>
                  <MessageCircle size={13} strokeWidth={1.9} />
                  {update.comments}
                </span>
                {update.emailCount !== null && (
                  <span>
                    <Mail size={13} strokeWidth={1.9} />
                    E-mail envoyé à {update.emailCount}
                  </span>
                )}
                <button type="button" onClick={() => setEditing(update)}>
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProblem(null)
                    setDoomed(update)
                  }}
                >
                  Supprimer
                </button>
              </p>
            </article>
          ))}
        </section>
      </div>
      {doomed && (
        <ConfirmDialog
          title={`Supprimer « ${doomed.title} » ?`}
          text="La note disparaît des Nouveautés, avec ses cœurs et ses commentaires. Ce qui est parti (notifications, e-mail) ne revient pas."
          confirmLabel="Supprimer"
          busy={busy}
          problem={problem}
          onConfirm={() => void remove(doomed)}
          onClose={() => setDoomed(null)}
        />
      )}
    </div>
  )
}
