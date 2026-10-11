/**
 * QUOI     — un texte de la vitrine qu'on modifie là où il est : un champ (ou une zone de texte)
 *            qui garde la police, la taille et la couleur du texte qu'il remplace.
 * POURQUOI — lot 6b, maquette 2231:2 : on modifie ce qu'on voit. Le cadre pointillé dit « ceci se
 *            change » ; sélectionné, il prend le dégradé du logo (vitrine-edit.css).
 * ATTENTION — la zone de texte grandit avec son contenu (`field-sizing: content`), sans barre de
 *            défilement : un seul défilement, celui de la page.
 */
import { BIO_COUNTER_FROM } from '@/lib/vitrine-edit'

interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  /** La classe du texte remplacé (`vitrine-head__name`…) : le champ en prend l'allure. */
  className: string
  label: string
  placeholder?: string
  maxLength: number
  multiline?: boolean
  /** Le compteur de caractères, près de la limite (la présentation). */
  counter?: boolean
}

export function EditableText({
  value,
  onChange,
  className,
  label,
  placeholder,
  maxLength,
  multiline = false,
  counter = false,
}: EditableTextProps) {
  const common = {
    className: `${className} edit-field`,
    'aria-label': label,
    placeholder,
    maxLength,
    value,
  }
  return (
    <span className="edit-zone">
      {multiline ? (
        <textarea
          {...common}
          rows={2}
          onChange={(event) => {
            onChange(event.target.value)
          }}
        />
      ) : (
        <input
          {...common}
          type="text"
          onChange={(event) => {
            onChange(event.target.value)
          }}
        />
      )}
      {counter && value.length >= BIO_COUNTER_FROM && (
        <span className="edit-zone__counter">
          {value.length} / {maxLength}
        </span>
      )}
    </span>
  )
}
