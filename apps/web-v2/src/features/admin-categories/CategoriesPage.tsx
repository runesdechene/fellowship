/**
 * QUOI     — les catégories de l'administration : la pastille dans ses couleurs, le nom, l'adresse, le
 *            nombre de fiches qui la portent, l'ordre ; Ajouter, Modifier, Supprimer.
 * POURQUOI — reprise de la V1 (lot 4) : les catégories et leurs couleurs sont des données réglées ici
 *            (lib/tags.ts). Pas de maquette : composée des briques de la liste des comptes.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Tag } from '@/components/ui/Tag'
import { CategoryDialog } from './CategoryDialog'
import { deleteCategory, styleOf, useCategories, type Category } from './useCategories'

export function CategoriesPage() {
  const { categories, error, reload } = useCategories()
  // `null` : la fenêtre d'ajout ; une catégorie : sa fenêtre de modification.
  const [editing, setEditing] = useState<Category | null | undefined>(undefined)
  const [doomed, setDoomed] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const nextOrder = Math.max(0, ...(categories ?? []).map((c) => c.sort_order)) + 1

  async function remove(category: Category) {
    setBusy(true)
    setProblem(null)
    try {
      await deleteCategory(category.id)
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
          <h1 className="admin-page__title">Catégories</h1>
          <p className="admin-page__lede">
            Les univers proposés sur les fiches, leurs couleurs et leur ordre.
          </p>
        </div>
        <Button variant="action" onClick={() => setEditing(null)}>
          Ajouter une catégorie
        </Button>
      </header>
      {error && <p className="admin-page__error">{error}</p>}
      {categories && (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Catégorie</th>
              <th scope="col">Adresse</th>
              <th scope="col">Fiches</th>
              <th scope="col">Ordre</th>
              <th scope="col">
                <span className="admin-table__sr">Agir</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="admin-table__row">
                <td>
                  <Tag name={category.name} style={styleOf(category)} />
                </td>
                <td className="admin-table__text">{category.slug}</td>
                <td className="admin-table__text">{category.evenements}</td>
                <td className="admin-table__text">{category.sort_order}</td>
                <td className="admin-table__actions">
                  <Button onClick={() => setEditing(category)}>Modifier</Button>
                  <Button
                    onClick={() => {
                      setProblem(null)
                      setDoomed(category)
                    }}
                  >
                    Supprimer
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing !== undefined && (
        <CategoryDialog
          category={editing}
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
          title={`Supprimer « ${doomed.name} » ?`}
          text={
            doomed.evenements > 0
              ? `${doomed.evenements} fiche(s) la portent : elles garderont le mot, affiché en gris, et on ne pourra plus la choisir.`
              : 'Aucune fiche ne la porte. On ne pourra plus la choisir.'
          }
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
