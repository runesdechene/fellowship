/**
 * QUOI     — les cases d'un code : six pour celui reçu par e-mail, quatre pour le code de l'appareil
 *            (recettes chiffrées). Un chiffre par case, le focus qui avance et recule, un code collé
 *            qui remplit tout.
 * POURQUOI — maquette 2100:38 (lot 10a). `onChange` reçoit la chaîne des chiffres saisis (0 à 6) :
 *            l'écran décide quoi faire d'un code complet.
 * ATTENTION — `autoComplete="one-time-code"` sur la première case : le téléphone propose le code
 *            reçu, et il arrive collé d'un coup.
 */
import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { flushSync } from 'react-dom'
import { codeDigits, typedCode } from '@/lib/welcome'

interface CodeInputProps {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
  autoFocus?: boolean
  length?: number
  /** Le code vient d'être refusé : les cases se bordent de rouge. */
  invalid?: boolean
  /** Un code secret (celui de l'appareil) : chiffres masqués, aucune suggestion du téléphone. */
  secret?: boolean
}

export function CodeInput({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  length = 6,
  invalid = false,
  secret = false,
}: CodeInputProps) {
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const BOXES = Array.from({ length }, (_, index) => index)

  function focus(index: number) {
    boxes.current[Math.max(0, Math.min(length - 1, index))]?.focus()
  }

  // Un code vidé (au départ, ou après un code faux) remet le focus sur la première case.
  useEffect(() => {
    if (value === '' && autoFocus) boxes.current[0]?.focus()
  }, [value, autoFocus])

  function type(index: number, raw: string) {
    const next = typedCode(value, index, raw, length)
    if (next === value) return
    // flushSync : la case visée doit voir le code à jour quand elle reçoit le focus, sinon son
    // onFocus (code d'avant) renvoie le curseur en arrière et la frappe suivante écrase tout.
    flushSync(() => {
      onChange(next)
    })
    focus(next.length === length ? length - 1 : index + 1)
  }

  function erase(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Backspace') return
    event.preventDefault()
    const at = value.length > index ? index : index - 1
    if (at < 0) return
    onChange(value.slice(0, at))
    focus(at)
  }

  function paste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const digits = codeDigits(event.clipboardData.getData('text'), length)
    if (digits === '') return
    flushSync(() => {
      onChange(digits)
    })
    focus(digits.length)
  }

  return (
    <div className="code-input" role="group" aria-label={`Ton code à ${String(length)} chiffres`}>
      {BOXES.map((index) => (
        <input
          key={index}
          ref={(element) => {
            boxes.current[index] = element
          }}
          className="code-input__box"
          inputMode="numeric"
          type={secret ? 'password' : 'text'}
          autoComplete={index === 0 && !secret ? 'one-time-code' : 'off'}
          aria-invalid={invalid}
          aria-label={`Chiffre ${String(index + 1)}`}
          value={value[index] ?? ''}
          readOnly={disabled}
          onFocus={() => {
            if (index > value.length) focus(value.length)
          }}
          onChange={(event) => {
            type(index, event.target.value)
          }}
          onKeyDown={(event) => {
            erase(index, event)
          }}
          onPaste={paste}
        />
      ))}
    </div>
  )
}
