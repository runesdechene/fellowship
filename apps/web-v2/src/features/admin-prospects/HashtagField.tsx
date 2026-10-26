/**
 * QUOI     — le champ de la note d'un prospect (une ligne dans le tableau, un texte long sur la
 *            fiche) : taper # propose les balises déjà écrites dans
 *            les autres notes ; flèches, Entrée ou Tab en choisit une.
 * POURQUOI — les balises vivent dans la note (#Uriel, #Orga) ; les reprendre telles quelles évite
 *            d'en créer deux pour la même chose (Uriel, 26/10/2026).
 * ATTENTION — le focus reste dans le champ, comme dans AddressField : sa sortie enregistre la
 *            note, donc un clic sur une suggestion ne doit pas la faire perdre.
 */
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { hashtagAt, insertHashtag, suggestHashtags } from '@/lib/hashtag'

type Field = HTMLInputElement | HTMLTextAreaElement

interface Props {
  label: string
  multiline: boolean
  value: string
  tags: readonly string[]
  placeholder?: string
  onChange: (text: string) => void
  onKeyDown: (event: KeyboardEvent<Field>) => void
  onBlur: () => void
}

export function HashtagField({
  label,
  multiline,
  value,
  tags,
  placeholder,
  onChange,
  onKeyDown,
  onBlur,
}: Props) {
  const id = useId()
  const field = useRef<Field | null>(null)
  const [caret, setCaret] = useState(value.length)
  const [active, setActive] = useState(0)
  // Échap ferme la liste jusqu'à la prochaine frappe.
  const [closed, setClosed] = useState(false)
  // Après un choix, le curseur va derrière la balise insérée, une fois le texte rendu.
  const placeCaret = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (placeCaret.current === null) return
    field.current?.setSelectionRange(placeCaret.current, placeCaret.current)
    placeCaret.current = null
  }, [value])

  const typed = hashtagAt(value, caret)
  const choices = typed && !closed ? suggestHashtags(tags, typed.prefix) : []

  function pick(tag: string) {
    if (!typed) return
    const next = insertHashtag(value, typed, caret, tag)
    placeCaret.current = next.caret
    setCaret(next.caret)
    onChange(next.text)
  }

  function onKey(event: KeyboardEvent<Field>) {
    if (choices.length > 0) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        setActive((index) => Math.min(Math.max(index + step, 0), choices.length - 1))
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        const tag = choices[active]
        if (tag) pick(tag)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setClosed(true)
        return
      }
    }
    onKeyDown(event)
  }

  const props = {
    ref: (node: Field | null) => {
      field.current = node
    },
    role: 'combobox',
    'aria-label': label,
    'aria-autocomplete': 'list' as const,
    'aria-expanded': choices.length > 0,
    'aria-controls': choices.length > 0 ? `${id}-tags` : undefined,
    'aria-activedescendant': choices.length > 0 ? `${id}-${String(active)}` : undefined,
    autoComplete: 'off',
    autoFocus: true,
    placeholder,
    value,
    onChange: (event: { target: Field }) => {
      setCaret(event.target.selectionStart ?? value.length)
      setActive(0)
      setClosed(false)
      onChange(event.target.value)
    },
    onSelect: (event: { currentTarget: Field }) =>
      setCaret(event.currentTarget.selectionStart ?? value.length),
    onKeyDown: onKey,
    onBlur,
  }
  const input: ReactNode = multiline ? (
    <textarea
      {...props}
      className="prospect-cell__input prospect-cell__input--multiline"
      rows={1}
    />
  ) : (
    <input {...props} className="prospect-cell__input" />
  )

  return (
    <span className="hashtag-field">
      {input}
      {choices.length > 0 && (
        <ul className="hashtag-field__tags" id={`${id}-tags`} role="listbox">
          {choices.map((tag, index) => (
            <li
              key={tag}
              id={`${id}-${String(index)}`}
              className="hashtag-field__tag"
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(tag)}
            >
              #{tag}
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
