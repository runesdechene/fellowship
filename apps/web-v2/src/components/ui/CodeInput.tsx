/**
 * QUOI     — les six cases d'un code reçu par e-mail : un chiffre par case, le focus qui avance et
 *            recule, un code collé qui remplit tout.
 * POURQUOI — maquette 2100:38 (lot 10a). `onChange` reçoit la chaîne des chiffres saisis (0 à 6) :
 *            l'écran décide quoi faire d'un code complet.
 * ATTENTION — `autoComplete="one-time-code"` sur la première case : le téléphone propose le code
 *            reçu, et il arrive collé d'un coup.
 */
import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { codeDigits } from '@/lib/welcome'

const LENGTH = 6
const BOXES = Array.from({ length: LENGTH }, (_, index) => index)

interface CodeInputProps {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
  autoFocus?: boolean
}

export function CodeInput({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
}: CodeInputProps) {
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  function focus(index: number) {
    boxes.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus()
  }

  function type(index: number, raw: string) {
    const digit = codeDigits(raw).slice(-1)
    if (digit === '') return
    const next = (value.slice(0, index) + digit).slice(0, LENGTH)
    onChange(next)
    focus(index + 1)
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
    const digits = codeDigits(event.clipboardData.getData('text'))
    if (digits === '') return
    onChange(digits)
    focus(digits.length)
  }

  return (
    <div className="code-input" role="group" aria-label="Ton code à six chiffres">
      {BOXES.map((index) => (
        <input
          key={index}
          ref={(element) => {
            boxes.current[index] = element
          }}
          className="code-input__box"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Chiffre ${String(index + 1)}`}
          // Une seule case reçoit la frappe : la première vide, ou la dernière si tout est rempli.
          autoFocus={autoFocus && index === 0}
          value={value[index] ?? ''}
          disabled={disabled}
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
