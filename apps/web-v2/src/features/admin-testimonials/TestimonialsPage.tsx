/**
 * QUOI     — les témoignages de l'administration : photo, prénom et métier, la phrase, la vitrine
 *            reliée, affiché ou non, l'ordre ; Ajouter, Modifier, Supprimer.
 * POURQUOI — reprise de la V1 (lot 4) : ils nourrissent les stories de la landing. Pas de maquette :
 *            composée des briques de la liste des comptes.
 */
import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TestimonialDialog } from './TestimonialDialog'
import {
  deleteTestimonial,
  useAdminTestimonials,
  type AdminTestimonial,
} from './useAdminTestimonials'

export function TestimonialsPage() {
  const { testimonials, slugs, error, reload } = useAdminTestimonials()
  // `null` : la fenêtre d'ajout ; un témoignage : sa fenêtre de modification.
  const [editing, setEditing] = useState<AdminTestimonial | null | undefined>(undefined)
  const [doomed, setDoomed] = useState<AdminTestimonial | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const nextOrder = Math.max(0, ...(testimonials ?? []).map((t) => t.sort_order)) + 1
  const slugOf = (t: AdminTestimonial) =>
    t.entity_slug || (t.actor_id && slugs.get(t.actor_id)) || ''

  async function remove(testimonial: AdminTestimonial) {
    setBusy(true)
    setProblem(null)
    try {
      await deleteTestimonial(testimonial.id)
      setDoomed(null)
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
          <h1 className="admin-page__title">Témoignages</h1>
          <p className="admin-page__lede">
            Les exposants qui parlent de Fellowship, dans les stories de la landing.
          </p>
        </div>
        <Button variant="action" onClick={() => setEditing(null)}>
          Ajouter un témoignage
        </Button>
      </header>
      {error && <p className="admin-page__error">{error}</p>}
      {testimonials && testimonials.length === 0 && (
        <p className="admin-page__lede">Aucun témoignage pour l’instant.</p>
      )}
      {testimonials && testimonials.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Qui</th>
              <th scope="col">Ce qu’il ou elle dit</th>
              <th scope="col">Vitrine</th>
              <th scope="col">Landing</th>
              <th scope="col">Ordre</th>
              <th scope="col">
                <span className="admin-table__sr">Agir</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {testimonials.map((testimonial) => {
              const slug = slugOf(testimonial)
              return (
                <tr key={testimonial.id} className="admin-table__row">
                  <td>
                    <span className="admin-table__people">
                      <Avatar
                        src={testimonial.avatar_url}
                        name={testimonial.name}
                        className="admin-table__logo"
                      />
                      <span className="admin-table__identity">
                        <span className="admin-table__name">{testimonial.name}</span>
                        <span className="admin-table__meta">{testimonial.craft}</span>
                      </span>
                    </span>
                  </td>
                  <td className="admin-table__quote">{testimonial.quote}</td>
                  <td className="admin-table__text">{slug ? `flw.sh/${slug}` : '—'}</td>
                  <td className="admin-table__text">
                    {testimonial.is_active ? 'Affiché' : 'Masqué'}
                  </td>
                  <td className="admin-table__text">{testimonial.sort_order}</td>
                  <td className="admin-table__actions">
                    <Button onClick={() => setEditing(testimonial)}>Modifier</Button>
                    <Button
                      onClick={() => {
                        setProblem(null)
                        setDoomed(testimonial)
                      }}
                    >
                      Supprimer
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {editing !== undefined && (
        <TestimonialDialog
          testimonial={editing}
          slug={editing ? slugOf(editing) : ''}
          nextOrder={nextOrder}
          onClose={() => setEditing(undefined)}
          onDone={() => {
            setEditing(undefined)
            reload()
          }}
        />
      )}
      {doomed && (
        <ConfirmDialog
          title={`Supprimer le témoignage de ${doomed.name} ?`}
          text="Il disparaît des stories de la landing. Pour seulement le cacher, décoche « Affiché sur la landing »."
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
