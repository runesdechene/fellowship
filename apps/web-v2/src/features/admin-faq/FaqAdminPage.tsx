/**
 * QUOI     — l'administration de la FAQ de la landing : ajouter ou corriger une question à gauche,
 *            la liste dans l'ordre de la landing à droite, Modifier et Supprimer.
 * POURQUOI — maquette 2552:233 (Uriel, 25/10/2026) : la FAQ s'édite sans déploiement. Même
 *            mise en page que les Mises à jour (admin-updates.css).
 */
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FaqForm } from './FaqForm'
import { deleteQuestion, useAdminFaq, type FaqQuestion } from './useAdminFaq'

export function FaqAdminPage() {
  const { questions, error, reload } = useAdminFaq()
  const [editing, setEditing] = useState<FaqQuestion | null>(null)
  // Change à chaque question enregistrée : le formulaire repart vide.
  const [formKey, setFormKey] = useState(0)
  const [doomed, setDoomed] = useState<FaqQuestion | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const nextPosition = Math.max(0, ...(questions ?? []).map((q) => q.position)) + 1

  function startNew() {
    setEditing(null)
    setFormKey((k) => k + 1)
  }

  async function remove(question: FaqQuestion) {
    setBusy(true)
    setProblem(null)
    try {
      await deleteQuestion(question.id)
      setDoomed(null)
      if (editing?.id === question.id) startNew()
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
          <h1 className="admin-page__title">Questions fréquentes</h1>
          <p className="admin-page__lede">
            Les questions sous l’appel final de la landing, dans cet ordre.
          </p>
        </div>
        <Button variant="action" onClick={startNew}>
          Ajouter une question
        </Button>
      </header>
      {error && <p className="admin-page__error">{error}</p>}
      <div className="admin-updates">
        <FaqForm
          // L'ordre proposé n'est connu qu'avec la liste : il refait un formulaire vide.
          key={editing ? editing.id : `nouvelle-${String(formKey)}-${String(nextPosition)}`}
          editing={editing}
          nextPosition={nextPosition}
          onAdded={() => {
            startNew()
            reload()
          }}
          onSaved={reload}
        />
        <section className="admin-updates__list">
          <h2 className="admin-update-form__title">Sur la landing</h2>
          {questions?.length === 0 && (
            <p className="admin-page__lede">Aucune question pour l’instant.</p>
          )}
          {questions?.map((question) => (
            <article key={question.id} className="admin-updates__item">
              <p className="update-card__meta">
                {!question.visible && <span className="admin-updates__weight">Masquée</span>}
                <span>Ordre {question.position}</span>
              </p>
              <h3 className="admin-updates__title">{question.question}</h3>
              <p className="admin-updates__stats">
                <button type="button" onClick={() => setEditing(question)}>
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProblem(null)
                    setDoomed(question)
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
          title={`Supprimer « ${doomed.question} » ?`}
          text="La question disparaît de la landing et d’ici. Pour la garder sans l’afficher, choisis plutôt « Masquée »."
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
